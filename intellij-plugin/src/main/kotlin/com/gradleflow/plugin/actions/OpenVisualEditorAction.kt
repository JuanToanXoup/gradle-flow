package com.gradleflow.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.wm.ToolWindowManager

/**
 * Action to open the Gradle Flow visual editor tool window
 */
class OpenVisualEditorAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Open the tool window
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Gradle Flow")
        toolWindow?.show()
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabled = project != null
    }
}

/**
 * Action to sync visual editor from build.gradle.kts
 */
class SyncFromFileAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Open the tool window and trigger import
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Gradle Flow")
        toolWindow?.show {
            // After showing, trigger the import action in the React UI
            // This would be done through the bridge
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val hasGradleFile = project?.basePath?.let {
            java.io.File(it, "build.gradle.kts").exists() ||
            java.io.File(it, "build.gradle").exists()
        } ?: false
        e.presentation.isEnabled = hasGradleFile
    }
}

/**
 * Action to sync visual editor to build.gradle.kts
 */
class SyncToFileAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Trigger export action in the React UI through the bridge
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Gradle Flow")
        toolWindow?.show()
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        e.presentation.isEnabled = project != null
    }
}

/**
 * Context menu action to open a file in the visual editor
 */
class OpenInVisualEditorAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return

        // Open the tool window
        val toolWindow = ToolWindowManager.getInstance(project).getToolWindow("Gradle Flow")
        toolWindow?.show()
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = e.getData(com.intellij.openapi.actionSystem.CommonDataKeys.VIRTUAL_FILE)

        val isGradleFile = file?.name?.let {
            it == "build.gradle.kts" || it == "build.gradle"
        } ?: false

        e.presentation.isVisible = isGradleFile
        e.presentation.isEnabled = project != null && isGradleFile
    }
}
