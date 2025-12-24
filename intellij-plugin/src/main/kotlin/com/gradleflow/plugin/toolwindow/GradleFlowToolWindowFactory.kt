package com.gradleflow.plugin.toolwindow

import com.gradleflow.plugin.bridge.GradleFlowBridge
import com.intellij.openapi.Disposable
import com.intellij.openapi.project.DumbAware
import com.intellij.openapi.project.Project
import com.intellij.openapi.util.Disposer
import com.intellij.openapi.wm.ToolWindow
import com.intellij.openapi.wm.ToolWindowFactory
import com.intellij.ui.content.ContentFactory
import com.intellij.ui.jcef.JBCefBrowser
import com.intellij.ui.jcef.JBCefBrowserBase
import com.intellij.ui.jcef.JBCefClient
import java.awt.BorderLayout
import javax.swing.JPanel

/**
 * Factory for creating the Gradle Flow tool window.
 * This tool window hosts the React-based visual editor in a JCEF browser.
 */
class GradleFlowToolWindowFactory : ToolWindowFactory, DumbAware {

    override fun createToolWindowContent(project: Project, toolWindow: ToolWindow) {
        val content = ContentFactory.getInstance().createContent(
            GradleFlowPanel(project),
            "",
            false
        )
        toolWindow.contentManager.addContent(content)
    }

    override fun shouldBeAvailable(project: Project): Boolean {
        // Only show for projects with Gradle build files
        val hasGradleFile = project.baseDir?.findChild("build.gradle.kts") != null
                || project.baseDir?.findChild("build.gradle") != null
                || project.baseDir?.findChild("settings.gradle.kts") != null
                || project.baseDir?.findChild("settings.gradle") != null
        return hasGradleFile
    }
}

/**
 * Main panel that contains the JCEF browser with the React UI
 */
class GradleFlowPanel(private val project: Project) : JPanel(BorderLayout()), Disposable {

    private val browser: JBCefBrowser
    private val bridge: GradleFlowBridge

    init {
        // Create the JCEF browser
        browser = JBCefBrowser.createBuilder()
            .setOffScreenRendering(false)
            .build()

        // Create the bridge for JS-Kotlin communication
        bridge = GradleFlowBridge(project, browser)
        bridge.initialize()

        // Load the React UI
        loadUI()

        // Add the browser component
        add(browser.component, BorderLayout.CENTER)

        // Register for disposal
        Disposer.register(this, browser)
    }

    /**
     * Load the React UI into the browser
     */
    private fun loadUI() {
        // In development, you could load from localhost:5173
        // In production, load from bundled resources

        val resourceUrl = javaClass.getResource("/webui/index.html")
        if (resourceUrl != null) {
            // Load from bundled resources
            browser.loadURL(resourceUrl.toExternalForm())
        } else {
            // Fallback to development server
            val devServerUrl = "http://localhost:5173"
            browser.loadURL(devServerUrl)
        }
    }

    /**
     * Reload the UI (useful for development)
     */
    fun reload() {
        browser.cefBrowser.reload()
    }

    /**
     * Execute JavaScript in the browser
     */
    fun executeJavaScript(script: String) {
        browser.cefBrowser.executeJavaScript(script, "", 0)
    }

    override fun dispose() {
        bridge.dispose()
    }
}

/**
 * Content provider for the tool window
 */
class GradleFlowToolWindowContent(private val project: Project) {

    private var panel: GradleFlowPanel? = null

    fun getPanel(): GradleFlowPanel {
        if (panel == null) {
            panel = GradleFlowPanel(project)
        }
        return panel!!
    }

    fun dispose() {
        panel?.let { Disposer.dispose(it) }
        panel = null
    }
}
