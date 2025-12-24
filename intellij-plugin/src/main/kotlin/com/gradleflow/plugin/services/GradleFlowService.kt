package com.gradleflow.plugin.services

import com.intellij.execution.ExecutionListener
import com.intellij.execution.ExecutionManager
import com.intellij.execution.RunManager
import com.intellij.execution.executors.DefaultRunExecutor
import com.intellij.execution.process.ProcessEvent
import com.intellij.execution.process.ProcessListener
import com.intellij.execution.runners.ExecutionEnvironmentBuilder
import com.intellij.openapi.components.Service
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Key
import com.intellij.openapi.vfs.VirtualFile
import org.jetbrains.plugins.gradle.service.execution.GradleExternalTaskConfigurationType
import org.jetbrains.plugins.gradle.service.execution.GradleRunConfiguration
import org.jetbrains.plugins.gradle.settings.GradleSettings
import java.util.concurrent.ConcurrentHashMap

/**
 * Service for executing Gradle tasks and managing the visual editor state.
 * This is a project-level service that provides the bridge between the
 * React UI and the IntelliJ Gradle infrastructure.
 */
@Service(Service.Level.PROJECT)
class GradleFlowService(private val project: Project) {

    private val log = Logger.getInstance(GradleFlowService::class.java)

    // Track running executions
    private val runningTasks = ConcurrentHashMap<String, TaskExecution>()

    // Listeners for task execution events
    private val executionListeners = mutableListOf<TaskExecutionListener>()

    /**
     * Data class representing a task execution request
     */
    data class TaskExecutionRequest(
        val taskName: String,
        val projectPath: String? = null,
        val arguments: List<String> = emptyList(),
        val environmentVariables: Map<String, String> = emptyMap()
    )

    /**
     * Data class representing a task execution result
     */
    data class TaskExecutionResult(
        val taskName: String,
        val success: Boolean,
        val output: String,
        val error: String? = null,
        val duration: Long,
        val exitCode: Int
    )

    /**
     * Data class for tracking running tasks
     */
    private data class TaskExecution(
        val taskName: String,
        val startTime: Long,
        val output: StringBuilder = StringBuilder(),
        val errors: StringBuilder = StringBuilder()
    )

    /**
     * Interface for listening to task execution events
     */
    interface TaskExecutionListener {
        fun onTaskStarted(taskName: String)
        fun onTaskOutput(taskName: String, output: String)
        fun onTaskCompleted(result: TaskExecutionResult)
        fun onTaskFailed(taskName: String, error: String)
    }

    /**
     * Add a listener for task execution events
     */
    fun addExecutionListener(listener: TaskExecutionListener) {
        executionListeners.add(listener)
    }

    /**
     * Remove a task execution listener
     */
    fun removeExecutionListener(listener: TaskExecutionListener) {
        executionListeners.remove(listener)
    }

    /**
     * Execute a single Gradle task
     */
    fun executeTask(request: TaskExecutionRequest): Boolean {
        log.info("Executing Gradle task: ${request.taskName}")

        val gradleSettings = GradleSettings.getInstance(project)
        val projectPath = request.projectPath ?: project.basePath ?: return false

        // Find or create the Gradle run configuration
        val runManager = RunManager.getInstance(project)
        val configFactory = GradleExternalTaskConfigurationType.getInstance()
            .configurationFactories.firstOrNull() ?: return false

        // Create a new run configuration for this task
        val configName = "GradleFlow: ${request.taskName}"
        val settings = runManager.createConfiguration(configName, configFactory)
        val runConfig = settings.configuration as? GradleRunConfiguration ?: return false

        // Configure the task
        runConfig.settings.apply {
            externalProjectPath = projectPath
            taskNames = listOf(request.taskName)

            // Add any extra arguments
            if (request.arguments.isNotEmpty()) {
                scriptParameters = request.arguments.joinToString(" ")
            }

            // Add environment variables
            if (request.environmentVariables.isNotEmpty()) {
                env = request.environmentVariables
            }
        }

        // Track this execution
        val execution = TaskExecution(
            taskName = request.taskName,
            startTime = System.currentTimeMillis()
        )
        runningTasks[request.taskName] = execution

        // Notify listeners
        executionListeners.forEach { it.onTaskStarted(request.taskName) }

        try {
            // Build the execution environment
            val executor = DefaultRunExecutor.getRunExecutorInstance()
            val environment = ExecutionEnvironmentBuilder.create(executor, runConfig)
                .build()

            // Add process listener to capture output
            environment.runner?.let { runner ->
                ExecutionManager.getInstance(project).startRunProfile(environment) { descriptor ->
                    descriptor.processHandler?.addProcessListener(object : ProcessListener {
                        override fun onTextAvailable(event: ProcessEvent, outputType: Key<*>) {
                            val text = event.text
                            execution.output.append(text)
                            executionListeners.forEach { it.onTaskOutput(request.taskName, text) }
                        }

                        override fun processTerminated(event: ProcessEvent) {
                            val duration = System.currentTimeMillis() - execution.startTime
                            val success = event.exitCode == 0

                            val result = TaskExecutionResult(
                                taskName = request.taskName,
                                success = success,
                                output = execution.output.toString(),
                                error = if (!success) execution.errors.toString() else null,
                                duration = duration,
                                exitCode = event.exitCode
                            )

                            runningTasks.remove(request.taskName)
                            executionListeners.forEach { it.onTaskCompleted(result) }
                        }

                        override fun startNotified(event: ProcessEvent) {
                            log.info("Task ${request.taskName} started")
                        }
                    })
                }
            }

            return true
        } catch (e: Exception) {
            log.error("Failed to execute task ${request.taskName}", e)
            runningTasks.remove(request.taskName)
            executionListeners.forEach { it.onTaskFailed(request.taskName, e.message ?: "Unknown error") }
            return false
        }
    }

    /**
     * Execute multiple tasks in sequence
     */
    fun executeTasks(requests: List<TaskExecutionRequest>): Boolean {
        if (requests.isEmpty()) return true

        // For now, execute sequentially
        // Could be enhanced to use Gradle's parallel execution
        for (request in requests) {
            if (!executeTask(request)) {
                return false
            }
        }
        return true
    }

    /**
     * Stop a running task
     */
    fun stopTask(taskName: String): Boolean {
        val execution = runningTasks[taskName] ?: return false
        // Note: Actual process termination would need to be handled through the ProcessHandler
        log.info("Stopping task: $taskName")
        return true
    }

    /**
     * Check if a task is currently running
     */
    fun isTaskRunning(taskName: String): Boolean {
        return runningTasks.containsKey(taskName)
    }

    /**
     * Get the list of available Gradle tasks for the project
     */
    fun getAvailableTasks(): List<String> {
        // This would use Gradle Tooling API to fetch tasks
        // For now, return common tasks
        return listOf(
            "build", "clean", "test", "assemble", "check",
            "jar", "classes", "compileJava", "compileKotlin",
            "processResources", "javadoc"
        )
    }

    /**
     * Read the build.gradle.kts file content
     */
    fun readBuildFile(): String? {
        val basePath = project.basePath ?: return null
        val buildFile = project.baseDir?.findChild("build.gradle.kts")
            ?: project.baseDir?.findChild("build.gradle")
        return buildFile?.let { readFileContent(it) }
    }

    /**
     * Write content to the build.gradle.kts file
     */
    fun writeBuildFile(content: String): Boolean {
        val basePath = project.basePath ?: return false
        // Implementation would use WriteAction and VfsUtil
        return true
    }

    private fun readFileContent(file: VirtualFile): String {
        return String(file.contentsToByteArray(), Charsets.UTF_8)
    }

    companion object {
        fun getInstance(project: Project): GradleFlowService {
            return project.getService(GradleFlowService::class.java)
        }
    }
}
