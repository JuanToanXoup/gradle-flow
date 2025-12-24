import type {
  ExecutionHistoryEntry,
  ExecutionHistoryTaskResult,
  ExecutionHistoryStats,
  ExecutionState,
  GradleTaskNode,
  TaskExecutionStatus,
} from '../types/gradle';

const HISTORY_STORAGE_KEY = 'gradle-flow-execution-history';
const MAX_HISTORY_ENTRIES = 50;
const MAX_LOGS_PER_ENTRY = 100;

/**
 * Generate a unique ID for a history entry
 */
export function generateHistoryId(): string {
  return `exec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Load execution history from localStorage
 */
export function loadHistory(): ExecutionHistoryEntry[] {
  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];

    return parsed;
  } catch (error) {
    console.error('Failed to load execution history:', error);
    return [];
  }
}

/**
 * Save execution history to localStorage
 */
export function saveHistory(history: ExecutionHistoryEntry[]): void {
  try {
    // Limit to max entries (keep most recent)
    const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('Failed to save execution history:', error);
  }
}

/**
 * Add a new entry to the history
 */
export function addHistoryEntry(entry: ExecutionHistoryEntry): ExecutionHistoryEntry[] {
  const history = loadHistory();
  // Add new entry at the beginning
  history.unshift(entry);
  // Trim to max size
  const trimmed = history.slice(0, MAX_HISTORY_ENTRIES);
  saveHistory(trimmed);
  return trimmed;
}

/**
 * Delete a specific history entry
 */
export function deleteHistoryEntry(entryId: string): ExecutionHistoryEntry[] {
  const history = loadHistory();
  const filtered = history.filter((e) => e.id !== entryId);
  saveHistory(filtered);
  return filtered;
}

/**
 * Clear all execution history
 */
export function clearHistory(): void {
  localStorage.removeItem(HISTORY_STORAGE_KEY);
}

/**
 * Create a history entry from a completed execution
 */
export function createHistoryEntry(
  executionState: ExecutionState,
  nodes: GradleTaskNode[],
  label?: string
): ExecutionHistoryEntry {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Calculate task counts
  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  const taskResults: ExecutionHistoryTaskResult[] = [];

  executionState.taskResults.forEach((result, taskId) => {
    const node = nodeMap.get(taskId);
    if (!node) return;

    switch (result.status) {
      case 'success':
        successCount++;
        break;
      case 'failed':
        failedCount++;
        break;
      case 'skipped':
        skippedCount++;
        break;
    }

    taskResults.push({
      taskId: result.taskId,
      taskName: result.taskName,
      taskType: node.data.taskType,
      status: result.status,
      duration: result.duration,
      error: result.error,
    });
  });

  // Determine overall status
  let status: ExecutionHistoryEntry['status'];
  if (failedCount > 0 && successCount > 0) {
    status = 'partial';
  } else if (failedCount > 0) {
    status = 'failed';
  } else if (!executionState.endTime) {
    status = 'cancelled';
  } else {
    status = 'success';
  }

  const startTime = executionState.startTime || Date.now();
  const endTime = executionState.endTime || Date.now();

  // Limit logs to save space
  const limitedLogs = executionState.logs.slice(-MAX_LOGS_PER_ENTRY);

  return {
    id: generateHistoryId(),
    startTime,
    endTime,
    duration: endTime - startTime,
    status,
    totalTasks: taskResults.length,
    successCount,
    failedCount,
    skippedCount,
    taskResults,
    logs: limitedLogs,
    label,
  };
}

/**
 * Calculate statistics from history
 */
export function calculateHistoryStats(history: ExecutionHistoryEntry[]): ExecutionHistoryStats {
  if (history.length === 0) {
    return {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      averageDuration: 0,
    };
  }

  let successfulExecutions = 0;
  let failedExecutions = 0;
  let totalDuration = 0;

  for (const entry of history) {
    if (entry.status === 'success') {
      successfulExecutions++;
    } else if (entry.status === 'failed') {
      failedExecutions++;
    }
    totalDuration += entry.duration;
  }

  return {
    totalExecutions: history.length,
    successfulExecutions,
    failedExecutions,
    averageDuration: Math.round(totalDuration / history.length),
    lastExecutionTime: history[0]?.startTime,
  };
}

/**
 * Format a timestamp as a readable date/time string
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  // Relative time for recent executions
  if (diffMins < 1) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // Absolute date for older executions
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format duration in a human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}s`;
  } else if (ms < 3600000) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const mins = Math.floor((ms % 3600000) / 60000);
    return `${hours}h ${mins}m`;
  }
}

/**
 * Get a status label for display
 */
export function getStatusLabel(status: ExecutionHistoryEntry['status']): string {
  switch (status) {
    case 'success':
      return 'Successful';
    case 'failed':
      return 'Failed';
    case 'partial':
      return 'Partial';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown';
  }
}

/**
 * Get a color for a status
 */
export function getStatusColor(status: ExecutionHistoryEntry['status'] | TaskExecutionStatus): string {
  switch (status) {
    case 'success':
      return '#22c55e';
    case 'failed':
      return '#ef4444';
    case 'partial':
      return '#f59e0b';
    case 'cancelled':
    case 'skipped':
      return '#94a3b8';
    case 'running':
      return '#3b82f6';
    case 'pending':
      return '#f59e0b';
    default:
      return '#6b7280';
  }
}

/**
 * Group history entries by date
 */
export function groupHistoryByDate(
  history: ExecutionHistoryEntry[]
): Map<string, ExecutionHistoryEntry[]> {
  const groups = new Map<string, ExecutionHistoryEntry[]>();

  for (const entry of history) {
    const date = new Date(entry.startTime);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let groupKey: string;

    if (date.toDateString() === today.toDateString()) {
      groupKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      groupKey = 'Yesterday';
    } else {
      groupKey = date.toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });
    }

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(entry);
  }

  return groups;
}

/**
 * Update the label of a history entry
 */
export function updateHistoryLabel(entryId: string, label: string): ExecutionHistoryEntry[] {
  const history = loadHistory();
  const entry = history.find((e) => e.id === entryId);
  if (entry) {
    entry.label = label || undefined;
    saveHistory(history);
  }
  return history;
}
