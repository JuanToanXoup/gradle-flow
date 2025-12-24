package com.gradleflow.plugin.bridge

import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import com.gradleflow.plugin.services.GradleFlowService
import com.intellij.openapi.diagnostic.Logger
import com.intellij.openapi.project.Project
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefJSQuery
import org.cef.browser.CefBrowser
import org.cef.browser.CefFrame
import org.cef.handler.CefLoadHandlerAdapter

/**
 * Bridge class that handles communication between the React UI (running in JCEF)
 * and the Kotlin plugin code.
 *
 * This enables:
 * - Executing Gradle tasks from the UI
 * - Reading/writing build.gradle.kts files
 * - Sending execution status updates to the UI
 */
class GradleFlowBridge(
    private val project: Project,
    private val browser: JBCefBrowser
) {
    private val log = Logger.getInstance(GradleFlowBridge::class.java)
    private val gson = Gson()
    private val service = GradleFlowService.getInstance(project)

    // JS Query handlers
    private lateinit var executeTaskQuery: JBCefJSQuery
    private lateinit var stopTaskQuery: JBCefJSQuery
    private lateinit var readBuildFileQuery: JBCefJSQuery
    private lateinit var writeBuildFileQuery: JBCefJSQuery
    private lateinit var getAvailableTasksQuery: JBCefJSQuery

    /**
     * Initialize the bridge and inject JavaScript APIs
     */
    fun initialize() {
        createQueryHandlers()
        injectJavaScriptAPI()
        setupExecutionListener()
    }

    /**
     * Create the JBCefJSQuery handlers for each API method
     */
    private fun createQueryHandlers() {
        // Execute task handler
        executeTaskQuery = JBCefJSQuery.create(browser).apply {
            addHandler { request ->
                handleExecuteTask(request)
            }
        }

        // Stop task handler
        stopTaskQuery = JBCefJSQuery.create(browser).apply {
            addHandler { request ->
                handleStopTask(request)
            }
        }

        // Read build file handler
        readBuildFileQuery = JBCefJSQuery.create(browser).apply {
            addHandler { _ ->
                handleReadBuildFile()
            }
        }

        // Write build file handler
        writeBuildFileQuery = JBCefJSQuery.create(browser).apply {
            addHandler { request ->
                handleWriteBuildFile(request)
            }
        }

        // Get available tasks handler
        getAvailableTasksQuery = JBCefJSQuery.create(browser).apply {
            addHandler { _ ->
                handleGetAvailableTasks()
            }
        }
    }

    /**
     * Inject the JavaScript API into the browser
     */
    private fun injectJavaScriptAPI() {
        browser.jbCefClient.addLoadHandler(object : CefLoadHandlerAdapter() {
            override fun onLoadEnd(browser: CefBrowser, frame: CefFrame, httpStatusCode: Int) {
                if (frame.isMain) {
                    injectAPI(browser, frame)
                }
            }
        }, browser.cefBrowser)
    }

    private fun injectAPI(browser: CefBrowser, frame: CefFrame) {
        val js = """
            (function() {
                // Gradle Flow Bridge API
                window.gradleFlow = {
                    // Internal callback registry
                    _callbacks: {},
                    _callbackId: 0,

                    // Register a callback and return its ID
                    _registerCallback: function(callback) {
                        var id = ++this._callbackId;
                        this._callbacks[id] = callback;
                        return id;
                    },

                    // Resolve a callback by ID
                    _resolveCallback: function(id, result) {
                        var callback = this._callbacks[id];
                        if (callback) {
                            callback(result);
                            delete this._callbacks[id];
                        }
                    },

                    // Event listeners
                    _eventListeners: {
                        'taskStarted': [],
                        'taskOutput': [],
                        'taskCompleted': [],
                        'taskFailed': []
                    },

                    // Add event listener
                    on: function(event, callback) {
                        if (this._eventListeners[event]) {
                            this._eventListeners[event].push(callback);
                        }
                    },

                    // Remove event listener
                    off: function(event, callback) {
                        if (this._eventListeners[event]) {
                            var index = this._eventListeners[event].indexOf(callback);
                            if (index > -1) {
                                this._eventListeners[event].splice(index, 1);
                            }
                        }
                    },

                    // Emit event (called from Kotlin)
                    _emit: function(event, data) {
                        var listeners = this._eventListeners[event] || [];
                        listeners.forEach(function(callback) {
                            try {
                                callback(data);
                            } catch (e) {
                                console.error('Error in event listener:', e);
                            }
                        });
                    },

                    // Execute a Gradle task
                    executeTask: function(taskName, options) {
                        return new Promise(function(resolve, reject) {
                            var request = JSON.stringify({
                                taskName: taskName,
                                projectPath: options?.projectPath,
                                arguments: options?.arguments || [],
                                environmentVariables: options?.environmentVariables || {}
                            });
                            ${executeTaskQuery.inject("request")}
                        });
                    },

                    // Stop a running task
                    stopTask: function(taskName) {
                        return new Promise(function(resolve, reject) {
                            ${stopTaskQuery.inject("taskName")}
                        });
                    },

                    // Read the build.gradle.kts file
                    readBuildFile: function() {
                        return new Promise(function(resolve, reject) {
                            ${readBuildFileQuery.inject("''")}
                        });
                    },

                    // Write to the build.gradle.kts file
                    writeBuildFile: function(content) {
                        return new Promise(function(resolve, reject) {
                            ${writeBuildFileQuery.inject("content")}
                        });
                    },

                    // Get available Gradle tasks
                    getAvailableTasks: function() {
                        return new Promise(function(resolve, reject) {
                            ${getAvailableTasksQuery.inject("''")}
                        });
                    },

                    // Check if running in IntelliJ
                    isIntelliJ: true,

                    // Get project info
                    getProjectInfo: function() {
                        return {
                            name: '${project.name}',
                            basePath: '${project.basePath?.replace("\\", "\\\\") ?: ""}'
                        };
                    }
                };

                console.log('Gradle Flow Bridge initialized');

                // Dispatch ready event
                window.dispatchEvent(new CustomEvent('gradleFlowReady'));
            })();
        """.trimIndent()

        browser.executeJavaScript(js, frame.url, 0)
    }

    /**
     * Setup listener for task execution events
     */
    private fun setupExecutionListener() {
        service.addExecutionListener(object : GradleFlowService.TaskExecutionListener {
            override fun onTaskStarted(taskName: String) {
                emitEvent("taskStarted", mapOf("taskName" to taskName))
            }

            override fun onTaskOutput(taskName: String, output: String) {
                emitEvent("taskOutput", mapOf(
                    "taskName" to taskName,
                    "output" to output
                ))
            }

            override fun onTaskCompleted(result: GradleFlowService.TaskExecutionResult) {
                emitEvent("taskCompleted", mapOf(
                    "taskName" to result.taskName,
                    "success" to result.success,
                    "output" to result.output,
                    "error" to result.error,
                    "duration" to result.duration,
                    "exitCode" to result.exitCode
                ))
            }

            override fun onTaskFailed(taskName: String, error: String) {
                emitEvent("taskFailed", mapOf(
                    "taskName" to taskName,
                    "error" to error
                ))
            }
        })
    }

    /**
     * Emit an event to the JavaScript side
     */
    private fun emitEvent(event: String, data: Map<String, Any?>) {
        val json = gson.toJson(data)
        val js = "window.gradleFlow._emit('$event', $json);"
        browser.cefBrowser.executeJavaScript(js, "", 0)
    }

    // Request handlers

    private fun handleExecuteTask(request: String): JBCefJSQuery.Response {
        return try {
            val json = JsonParser.parseString(request).asJsonObject
            val taskRequest = GradleFlowService.TaskExecutionRequest(
                taskName = json.get("taskName").asString,
                projectPath = json.get("projectPath")?.asString,
                arguments = json.getAsJsonArray("arguments")?.map { it.asString } ?: emptyList(),
                environmentVariables = json.getAsJsonObject("environmentVariables")?.entrySet()
                    ?.associate { it.key to it.value.asString } ?: emptyMap()
            )

            val success = service.executeTask(taskRequest)
            JBCefJSQuery.Response(gson.toJson(mapOf("success" to success)))
        } catch (e: Exception) {
            log.error("Error executing task", e)
            JBCefJSQuery.Response(null, 1, e.message ?: "Unknown error")
        }
    }

    private fun handleStopTask(taskName: String): JBCefJSQuery.Response {
        return try {
            val success = service.stopTask(taskName)
            JBCefJSQuery.Response(gson.toJson(mapOf("success" to success)))
        } catch (e: Exception) {
            log.error("Error stopping task", e)
            JBCefJSQuery.Response(null, 1, e.message ?: "Unknown error")
        }
    }

    private fun handleReadBuildFile(): JBCefJSQuery.Response {
        return try {
            val content = service.readBuildFile()
            if (content != null) {
                JBCefJSQuery.Response(gson.toJson(mapOf("content" to content)))
            } else {
                JBCefJSQuery.Response(null, 1, "Build file not found")
            }
        } catch (e: Exception) {
            log.error("Error reading build file", e)
            JBCefJSQuery.Response(null, 1, e.message ?: "Unknown error")
        }
    }

    private fun handleWriteBuildFile(content: String): JBCefJSQuery.Response {
        return try {
            val success = service.writeBuildFile(content)
            JBCefJSQuery.Response(gson.toJson(mapOf("success" to success)))
        } catch (e: Exception) {
            log.error("Error writing build file", e)
            JBCefJSQuery.Response(null, 1, e.message ?: "Unknown error")
        }
    }

    private fun handleGetAvailableTasks(): JBCefJSQuery.Response {
        return try {
            val tasks = service.getAvailableTasks()
            JBCefJSQuery.Response(gson.toJson(mapOf("tasks" to tasks)))
        } catch (e: Exception) {
            log.error("Error getting available tasks", e)
            JBCefJSQuery.Response(null, 1, e.message ?: "Unknown error")
        }
    }

    /**
     * Clean up resources
     */
    fun dispose() {
        executeTaskQuery.dispose()
        stopTaskQuery.dispose()
        readBuildFileQuery.dispose()
        writeBuildFileQuery.dispose()
        getAvailableTasksQuery.dispose()
    }
}
