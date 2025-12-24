package com.gradleflow.plugin.actions

import com.intellij.openapi.actionSystem.AnAction
import com.intellij.openapi.actionSystem.AnActionEvent
import com.intellij.openapi.actionSystem.CommonDataKeys
import com.intellij.openapi.application.ApplicationManager
import com.intellij.openapi.command.WriteCommandAction
import com.intellij.openapi.fileEditor.FileDocumentManager
import com.intellij.openapi.fileEditor.FileEditorManager
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile
import com.gradleflow.plugin.services.GradleFlowService

class SyncToFileAction : AnAction() {

    override fun actionPerformed(e: AnActionEvent) {
        val project = e.project ?: return
        val file = findGradleFile(e, project) ?: return

        val service = project.getService(GradleFlowService::class.java)

        // Request the generated Gradle content from the React UI
        service.requestExportedGradle { generatedContent ->
            if (generatedContent.isNotEmpty()) {
                writeToFile(project, file, generatedContent)
            }
        }
    }

    private fun writeToFile(project: Project, file: VirtualFile, content: String) {
        ApplicationManager.getApplication().invokeLater {
            WriteCommandAction.runWriteCommandAction(project, "Sync Gradle Flow to File", null, {
                val document = FileDocumentManager.getInstance().getDocument(file)
                if (document != null) {
                    document.setText(content)
                    FileDocumentManager.getInstance().saveDocument(document)
                }
            })
        }
    }

    override fun update(e: AnActionEvent) {
        val project = e.project
        val file = findGradleFile(e, project)
        e.presentation.isEnabledAndVisible = project != null && file != null
    }

    private fun findGradleFile(e: AnActionEvent, project: Project?): VirtualFile? {
        val contextFile = e.getData(CommonDataKeys.VIRTUAL_FILE)
        if (contextFile != null && isGradleKtsFile(contextFile)) {
            return contextFile
        }

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
