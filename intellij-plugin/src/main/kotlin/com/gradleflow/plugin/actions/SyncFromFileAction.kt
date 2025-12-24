package com.gradleflow.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.gradleflow.plugin.services.GradleFlowService

class SyncFromFileAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = findGradleFile(e, project) ?: return

        val service = project.getService(GradleFlowService::class.java)
        val content = String(file.contentsToByteArray())

        // Send the file content to the React UI for parsing
        service.syncFromFile(content, file.path)
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = findGradleFile(e, project)
        e.presentation.isEnabledAndVisible = project != null && file != null
    }

    private fun findGradleFile(e: AnActionEvent, project: Project?): VirtualFile? {
        // Try to get the file from the context
        val contextFile = e.getData(CommonDataKeys.VIRTUAL_FILE)
        if (contextFile != null && isGradleKtsFile(contextFile)) {
            return contextFile
        }

        // Fall back to the currently open file in the editor
        if (project != null) {
            val editor = FileEditorManager.getInstance(project).selectedEditor
            val editorFile = editor?.file
            if (editorFile != null && isGradleKtsFile(editorFile)) {
                return editorFile
            }
        }

        return null
    }

    private fun isGradleKtsFile(file: VirtualFile): Boolean {
        return file.name.endsWith(".gradle.kts") || file.name.endsWith(".gradle")
    }
}
