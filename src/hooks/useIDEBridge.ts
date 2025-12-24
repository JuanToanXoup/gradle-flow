import { useState, useEffect, useCallback } from 'react';
import {
  isRunningInIDE,
  getBridgeSafe,
  type GradleFlowBridge,
  type TaskExecutionResult,
  type TaskExecutionOptions,
} from '../types/ideBridge';

/**
 * Hook for IDE integration.
 * Provides access to the IntelliJ/VSCode bridge API when available.
 */
export function useIDEBridge() {
  const [isIDE, setIsIDE] = useState(false);
  const [bridge, setBridge] = useState<GradleFlowBridge | undefined>(undefined);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Check immediately
    if (isRunningInIDE()) {
      setIsIDE(true);
      setBridge(getBridgeSafe());
      setIsReady(true);
    }

    // Also listen for the ready event (in case bridge is injected after load)
    const handleReady = () => {
      setIsIDE(true);
      setBridge(getBridgeSafe());
      setIsReady(true);
    };

    window.addEventListener('gradleFlowReady', handleReady);

    return () => {
      window.removeEventListener('gradleFlowReady', handleReady);
    };
  }, []);

  return {
    isIDE,
    isReady,
    bridge,
  };
}

/**
 * Hook for executing Gradle tasks through the IDE
 */
export function useGradleExecution() {
  const { isIDE, bridge } = useIDEBridge();
  const [isExecuting, setIsExecuting] = useState(false);
  const [currentTask, setCurrentTask] = useState<string | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [lastResult, setLastResult] = useState<TaskExecutionResult | null>(null);

  // Subscribe to execution events
  useEffect(() => {
    if (!bridge) return;

    const handleStarted = (data: { taskName: string }) => {
      setCurrentTask(data.taskName);
      setOutput([]);
    };

    const handleOutput = (data: { taskName: string; output: string }) => {
      setOutput((prev) => [...prev, data.output]);
    };

    const handleCompleted = (result: TaskExecutionResult) => {
      setIsExecuting(false);
      setCurrentTask(null);
      setLastResult(result);
    };

    const handleFailed = (data: { taskName: string; error: string }) => {
      setIsExecuting(false);
      setCurrentTask(null);
      setLastResult({
        taskName: data.taskName,
        success: false,
        output: output.join(''),
        error: data.error,
        duration: 0,
        exitCode: 1,
      });
    };

    bridge.on('taskStarted', handleStarted);
    bridge.on('taskOutput', handleOutput);
    bridge.on('taskCompleted', handleCompleted);
    bridge.on('taskFailed', handleFailed);

    return () => {
      bridge.off('taskStarted', handleStarted);
      bridge.off('taskOutput', handleOutput);
      bridge.off('taskCompleted', handleCompleted);
      bridge.off('taskFailed', handleFailed);
    };
  }, [bridge, output]);

  // Execute a task
  const executeTask = useCallback(
    async (taskName: string, options?: TaskExecutionOptions) => {
      if (!bridge) {
        console.warn('Cannot execute task: not running in IDE');
        return { success: false };
      }

      setIsExecuting(true);
      setCurrentTask(taskName);
      setOutput([]);

      try {
        return await bridge.executeTask(taskName, options);
      } catch (error) {
        setIsExecuting(false);
        setCurrentTask(null);
        return { success: false };
      }
    },
    [bridge]
  );

  // Stop a running task
  const stopTask = useCallback(
    async (taskName: string) => {
      if (!bridge) return { success: false };
      return await bridge.stopTask(taskName);
    },
    [bridge]
  );

  return {
    isIDE,
    isExecuting,
    currentTask,
    output,
    lastResult,
    executeTask,
    stopTask,
  };
}

/**
 * Hook for syncing with build.gradle.kts through the IDE
 */
export function useGradleFileSync() {
  const { isIDE, bridge } = useIDEBridge();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Read the build file
  const readBuildFile = useCallback(async () => {
    if (!bridge) return null;

    setIsSyncing(true);
    try {
      const result = await bridge.readBuildFile();
      setLastSyncTime(new Date());
      return result.content;
    } catch (error) {
      console.error('Failed to read build file:', error);
      return null;
    } finally {
      setIsSyncing(false);
    }
  }, [bridge]);

  // Write to the build file
  const writeBuildFile = useCallback(
    async (content: string) => {
      if (!bridge) return false;

      setIsSyncing(true);
      try {
        const result = await bridge.writeBuildFile(content);
        if (result.success) {
          setLastSyncTime(new Date());
        }
        return result.success;
      } catch (error) {
        console.error('Failed to write build file:', error);
        return false;
      } finally {
        setIsSyncing(false);
      }
    },
    [bridge]
  );

  // Get available tasks
  const getAvailableTasks = useCallback(async () => {
    if (!bridge) return [];

    try {
      const result = await bridge.getAvailableTasks();
      return result.tasks;
    } catch (error) {
      console.error('Failed to get available tasks:', error);
      return [];
    }
  }, [bridge]);

  return {
    isIDE,
    isSyncing,
    lastSyncTime,
    readBuildFile,
    writeBuildFile,
    getAvailableTasks,
  };
}
