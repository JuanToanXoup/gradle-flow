package com.gradleflow.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.wm.ToolWindowManager
import com.gradleflow.plugin.services.GradleFlowService

class OpenInVisualEditorAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE) ?: return

        if (!isGradleKtsFile(file)) return

        // Open the Gradle Flow tool window
        val toolWindowManager = ToolWindowManager.getInstance(project)
        val toolWindow = toolWindowManager.getToolWindow("Gradle Flow")
        toolWindow?.show {
            // After the tool window is shown, sync from the file
            val service = project.getService(GradleFlowService::class.java)
            val content = String(file.contentsToByteArray())
            service.syncFromFile(content, file.path)
        }
    }

    override fun update(e: AnActionEvent) {
        val file = e.getData(CommonDataKeys.VIRTUAL_FILE)
        e.presentation.isEnabledAndVisible = e.project != null && file != null && isGradleKtsFile(file)
    }

    private fun isGradleKtsFile(file: com.intellij.openapi.vfs.VirtualFile): Boolean {
        return file.name.endsWith(".gradle.kts") || file.name.endsWith(".gradle")
    }
}
