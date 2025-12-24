package com.gradleflow.plugin.editor

import com.intellij.openapi.fileEditor.FileEditor
import com.intellij.openapi.fileEditor.FileEditorState
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.UserDataHolderBase
import com.intellij.openapi.vfs.VirtualFile
import com.intellij.ui.jcef.JBCefBrowser
import com.gradleflow.plugin.bridge.GradleFlowBridge
import com.gradleflow.plugin.services.GradleFlowService
import java.beans.PropertyChangeListener
import javax.swing.JComponent

class GradleFlowFileEditor(
    private val project: Project,
    private val file: VirtualFile
) : UserDataHolderBase(), FileEditor {

    private val browser: JBCefBrowser = JBCefBrowser()
    private val bridge: GradleFlowBridge

    init {
        // Initialize the bridge for JS-Kotlin communication
        bridge = GradleFlowBridge(project, browser)

        // Load the React UI
        val webUIPath = javaClass.getResource("/webui/index.html")
        if (webUIPath != null) {
            browser.loadURL(webUIPath.toExternalForm())
        } else {
            // Fallback to development server
            browser.loadURL("http://localhost:5173")
        }

        // Auto-sync from file when editor opens
        browser.jbCefClient.addLoadHandler(object : org.cef.handler.CefLoadHandlerAdapter() {
            override fun onLoadEnd(browser: org.cef.browser.CefBrowser?, frame: org.cef.browser.CefFrame?, httpStatusCode: Int) {
                if (frame?.isMain == true) {
                    syncFromFile()
                }
            }
        }, browser.cefBrowser)
    }

    private fun syncFromFile() {
        val content = String(file.contentsToByteArray())
        val service = project.getService(GradleFlowService::class.java)
        service.syncFromFile(content, file.path)
    }

    override fun getComponent(): JComponent = browser.component

    override fun getPreferredFocusedComponent(): JComponent = browser.component

    override fun getName(): String = "Gradle Flow"

    override fun setState(state: FileEditorState) {}

    override fun isModified(): Boolean = false

    override fun isValid(): Boolean = true

    override fun addPropertyChangeListener(listener: PropertyChangeListener) {}

    override fun removePropertyChangeListener(listener: PropertyChangeListener) {}

    override fun dispose() {
        browser.dispose()
    }

    override fun getFile(): VirtualFile = file
}
