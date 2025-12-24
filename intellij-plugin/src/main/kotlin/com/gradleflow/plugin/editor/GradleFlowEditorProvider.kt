package com.gradleflow.plugin.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorPolicy
import com.intellij.openapi.fileEditor.FileEditorProvider
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.vfs.VirtualFile

class GradleFlowEditorProvider : FileEditorProvider, DumbAware {

    override fun accept(project: Project, file: VirtualFile): Boolean {
        return file.name.endsWith(".gradle.kts") || file.name == "build.gradle"
    }

    override fun createEditor(project: Project, file: VirtualFile): FileEditor {
        return GradleFlowFileEditor(project, file)
    }

    override fun getEditorTypeId(): String = "gradle-flow-visual-editor"

    override fun getPolicy(): FileEditorPolicy = FileEditorPolicy.PLACE_AFTER_DEFAULT_EDITOR
}
