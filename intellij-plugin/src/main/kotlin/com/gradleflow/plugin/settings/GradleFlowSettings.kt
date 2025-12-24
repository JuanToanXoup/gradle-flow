package com.gradleflow.plugin.settings

import com.intellij.openapi.components.*
import com.intellij.openapi.options.Configurable
import com.intellij.ui.components.JBCheckBox
import com.intellij.ui.components.JBLabel
import com.intellij.util.ui.FormBuilder
import javax.swing.JComponent
import javax.swing.JPanel

/**
 * Persistent settings for Gradle Flow plugin
 */
@State(
    name = "GradleFlowSettings",
    storages = [Storage("GradleFlowSettings.xml")]
)
@Service
class GradleFlowSettings : PersistentStateComponent<GradleFlowSettings.State> {

    data class State(
        var autoSync: Boolean = false,
        var showNotifications: Boolean = true,
        var showExecutionLogs: Boolean = true,
        var enableAnimations: Boolean = true,
        var darkMode: Boolean = true,
        var devServerUrl: String = "http://localhost:5173"
    )

    private var state = State()

    override fun getState(): State = state

    override fun loadState(state: State) {
        this.state = state
    }

    var autoSync: Boolean
        get() = state.autoSync
        set(value) { state.autoSync = value }

    var showNotifications: Boolean
        get() = state.showNotifications
        set(value) { state.showNotifications = value }

    var showExecutionLogs: Boolean
        get() = state.showExecutionLogs
        set(value) { state.showExecutionLogs = value }

    var enableAnimations: Boolean
        get() = state.enableAnimations
        set(value) { state.enableAnimations = value }

    var darkMode: Boolean
        get() = state.darkMode
        set(value) { state.darkMode = value }

    var devServerUrl: String
        get() = state.devServerUrl
        set(value) { state.devServerUrl = value }

    companion object {
        fun getInstance(): GradleFlowSettings {
            return service()
        }
    }
}

/**
 * Settings UI configurable
 */
class GradleFlowSettingsConfigurable : Configurable {

    private var settingsPanel: GradleFlowSettingsPanel? = null

    override fun getDisplayName(): String = "Gradle Flow"

    override fun createComponent(): JComponent {
        settingsPanel = GradleFlowSettingsPanel()
        return settingsPanel!!.panel
    }

    override fun isModified(): Boolean {
        val settings = GradleFlowSettings.getInstance()
        val panel = settingsPanel ?: return false

        return panel.autoSync != settings.autoSync ||
                panel.showNotifications != settings.showNotifications ||
                panel.darkMode != settings.darkMode
    }

    override fun apply() {
        val settings = GradleFlowSettings.getInstance()
        val panel = settingsPanel ?: return

        settings.autoSync = panel.autoSync
        settings.showNotifications = panel.showNotifications
        settings.darkMode = panel.darkMode
    }

    override fun reset() {
        val settings = GradleFlowSettings.getInstance()
        settingsPanel?.apply {
            autoSync = settings.autoSync
            showNotifications = settings.showNotifications
            darkMode = settings.darkMode
        }
    }

    override fun disposeUIResources() {
        settingsPanel = null
    }
}

/**
 * Settings panel UI
 */
class GradleFlowSettingsPanel {

    private val autoSyncCheckbox = JBCheckBox("Auto-sync with build.gradle.kts")
    private val showNotificationsCheckbox = JBCheckBox("Show execution notifications")
    private val darkModeCheckbox = JBCheckBox("Use dark mode in visual editor")

    val panel: JPanel = FormBuilder.createFormBuilder()
        .addComponent(JBLabel("<html><b>Gradle Flow Settings</b></html>"))
        .addSeparator()
        .addComponent(autoSyncCheckbox)
        .addComponent(showNotificationsCheckbox)
        .addComponent(darkModeCheckbox)
        .addComponentFillVertically(JPanel(), 0)
        .panel

    var autoSync: Boolean
        get() = autoSyncCheckbox.isSelected
        set(value) { autoSyncCheckbox.isSelected = value }

    var showNotifications: Boolean
        get() = showNotificationsCheckbox.isSelected
        set(value) { showNotificationsCheckbox.isSelected = value }

    var darkMode: Boolean
        get() = darkModeCheckbox.isSelected
        set(value) { darkModeCheckbox.isSelected = value }
}
