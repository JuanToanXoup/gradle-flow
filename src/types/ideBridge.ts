/**
 * Type definitions for the IntelliJ/VSCode bridge API
 *
 * When running inside an IDE, window.gradleFlow will be available
 * with these methods for real Gradle execution and file sync.
 */

export interface TaskExecutionOptions {
  projectPath?: string;
  arguments?: string[];
  environmentVariables?: Record<string, string>;
}

export interface TaskExecutionResult {
  taskName: string;
  success: boolean;
  output: string;
  error?: string;
  duration: number;
  exitCode: number;
}

export interface ProjectInfo {
  name: string;
  basePath: string;
}

export interface GradleFlowBridge {
  /**
   * Whether running inside IntelliJ IDEA
   */
  isIntelliJ: boolean;

  /**
   * Execute a Gradle task
   */
  executeTask(taskName: string, options?: TaskExecutionOptions): Promise<{ success: boolean }>;

  /**
   * Stop a running task
   */
  stopTask(taskName: string): Promise<{ success: boolean }>;

  /**
   * Read the build.gradle.kts file content
   */
  readBuildFile(): Promise<{ content: string }>;

  /**
   * Write content to the build.gradle.kts file
   */
  writeBuildFile(content: string): Promise<{ success: boolean }>;

  /**
   * Get available Gradle tasks for the project
   */
  getAvailableTasks(): Promise<{ tasks: string[] }>;

  /**
   * Get project information
   */
  getProjectInfo(): ProjectInfo;

  /**
   * Add event listener
   */
  on(event: 'taskStarted', callback: (data: { taskName: string }) => void): void;
  on(event: 'taskOutput', callback: (data: { taskName: string; output: string }) => void): void;
  on(event: 'taskCompleted', callback: (result: TaskExecutionResult) => void): void;
  on(event: 'taskFailed', callback: (data: { taskName: string; error: string }) => void): void;

  /**
   * Remove event listener
   */
  off(event: 'taskStarted', callback: (data: { taskName: string }) => void): void;
  off(event: 'taskOutput', callback: (data: { taskName: string; output: string }) => void): void;
  off(event: 'taskCompleted', callback: (result: TaskExecutionResult) => void): void;
  off(event: 'taskFailed', callback: (data: { taskName: string; error: string }) => void): void;
}

declare global {
  interface Window {
    gradleFlow?: GradleFlowBridge;
  }
}

/**
 * Check if running inside an IDE with the bridge available
 */
export function isRunningInIDE(): boolean {
  return typeof window !== 'undefined' && !!window.gradleFlow;
}

/**
 * Get the bridge instance (throws if not available)
 */
export function getBridge(): GradleFlowBridge {
  if (!window.gradleFlow) {
    throw new Error('Gradle Flow bridge not available. Not running in IDE context.');
  }
  return window.gradleFlow;
}

/**
 * Safely get the bridge (returns undefined if not available)
 */
export function getBridgeSafe(): GradleFlowBridge | undefined {
  return window.gradleFlow;
}
