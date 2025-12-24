import { useMemo } from 'react';
import {
  Play,
  Square,
  Pause,
  RotateCcw,
  CheckCircle,
  XCircle,
  Clock,
  Loader,
  SkipForward,
  Circle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import type {
  ExecutionState,
  TaskExecutionStatus,
  GradleTaskNode,
} from '../types/gradle';
import { formatDuration, getStatusColor } from '../utils/executionUtils';

interface ExecutionPanelProps {
  executionState: ExecutionState;
  nodes: GradleTaskNode[];
  selectedTaskIds: string[];
  onRun: (taskIds?: string[]) => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const statusIcons: Record<TaskExecutionStatus, React.ReactNode> = {
  idle: <Circle size={14} />,
  pending: <Clock size={14} />,
  running: <Loader size={14} className="animate-spin" />,
  success: <CheckCircle size={14} />,
  failed: <XCircle size={14} />,
  skipped: <SkipForward size={14} />,
};

export function ExecutionPanel({
  executionState,
  nodes,
  selectedTaskIds,
  onRun,
  onStop,
  onPause,
  onResume,
  onReset,
  isExpanded,
  onToggleExpanded,
}: ExecutionPanelProps) {
  const { isRunning, isPaused, taskResults, executionOrder, logs } = executionState;

  // Calculate execution statistics
  const stats = useMemo(() => {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let pendingCount = 0;
    let totalDuration = 0;

    taskResults.forEach((result) => {
      if (result.status === 'success') successCount++;
      else if (result.status === 'failed') failedCount++;
      else if (result.status === 'skipped') skippedCount++;
      else if (result.status === 'pending' || result.status === 'running') pendingCount++;
      if (result.duration) totalDuration += result.duration;
    });

    return {
      total: executionOrder.length,
      completed: successCount + failedCount + skippedCount,
      successCount,
      failedCount,
      skippedCount,
      pendingCount,
      totalDuration,
    };
  }, [taskResults, executionOrder]);

  // Get selected task names for display
  const selectedTaskNames = useMemo(() => {
    if (selectedTaskIds.length === 0) return 'all tasks';
    return selectedTaskIds
      .map((id) => nodes.find((n) => n.id === id)?.data.taskName)
      .filter(Boolean)
      .join(', ');
  }, [selectedTaskIds, nodes]);

  return (
    <div className="execution-panel">
      <button className="execution-header" onClick={onToggleExpanded}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Play size={16} />
        <span className="execution-title">Execution</span>
        {isRunning && (
          <span className="execution-status running">
            <Loader size={12} className="animate-spin" />
            Running
          </span>
        )}
        {!isRunning && stats.completed > 0 && (
          <span
            className={`execution-status ${stats.failedCount > 0 ? 'failed' : 'success'}`}
          >
            {stats.failedCount > 0 ? (
              <>
                <XCircle size={12} />
                {stats.failedCount} failed
              </>
            ) : (
              <>
                <CheckCircle size={12} />
                {stats.successCount} passed
              </>
            )}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="execution-content">
          {/* Controls */}
          <div className="execution-controls">
            {!isRunning ? (
              <>
                <button
                  className="execution-btn primary"
                  onClick={() => onRun(selectedTaskIds.length > 0 ? selectedTaskIds : undefined)}
                  title={`Run ${selectedTaskNames}`}
                >
                  <Play size={14} />
                  Run {selectedTaskIds.length > 0 ? 'Selected' : 'All'}
                </button>
                {stats.completed > 0 && (
                  <button
                    className="execution-btn secondary"
                    onClick={onReset}
                    title="Reset execution state"
                  >
                    <RotateCcw size={14} />
                    Reset
                  </button>
                )}
              </>
            ) : (
              <>
                {isPaused ? (
                  <button
                    className="execution-btn primary"
                    onClick={onResume}
                    title="Resume execution"
                  >
                    <Play size={14} />
                    Resume
                  </button>
                ) : (
                  <button
                    className="execution-btn secondary"
                    onClick={onPause}
                    title="Pause execution"
                  >
                    <Pause size={14} />
                    Pause
                  </button>
                )}
                <button
                  className="execution-btn danger"
                  onClick={onStop}
                  title="Stop execution"
                >
                  <Square size={14} />
                  Stop
                </button>
              </>
            )}
          </div>

          {/* Progress */}
          {executionOrder.length > 0 && (
            <div className="execution-progress">
              <div className="progress-bar">
                <div
                  className="progress-fill success"
                  style={{ width: `${(stats.successCount / stats.total) * 100}%` }}
                />
                <div
                  className="progress-fill failed"
                  style={{ width: `${(stats.failedCount / stats.total) * 100}%` }}
                />
                <div
                  className="progress-fill skipped"
                  style={{ width: `${(stats.skippedCount / stats.total) * 100}%` }}
                />
              </div>
              <div className="progress-text">
                {stats.completed} / {stats.total} tasks
                {stats.totalDuration > 0 && (
                  <span className="progress-duration">
                    {formatDuration(stats.totalDuration)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Task list */}
          {executionOrder.length > 0 && (
            <div className="execution-tasks">
              <div className="execution-tasks-header">Tasks</div>
              <div className="execution-tasks-list">
                {executionOrder.map((taskId) => {
                  const result = taskResults.get(taskId);
                  const node = nodes.find((n) => n.id === taskId);
                  const status = result?.status || 'idle';
                  const color = getStatusColor(status);

                  return (
                    <div
                      key={taskId}
                      className={`execution-task-item ${status}`}
                    >
                      <span
                        className="task-status-icon"
                        style={{ color }}
                      >
                        {statusIcons[status]}
                      </span>
                      <span className="task-name">
                        {node?.data.taskName || taskId}
                      </span>
                      {result?.duration && (
                        <span className="task-duration">
                          {formatDuration(result.duration)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Logs */}
          {logs.length > 0 && (
            <div className="execution-logs">
              <div className="execution-logs-header">Output</div>
              <div className="execution-logs-content">
                {logs.map((log, index) => (
                  <div key={index} className={`log-entry ${log.level}`}>
                    {log.taskName && (
                      <span className="log-task">[{log.taskName}]</span>
                    )}
                    <span className="log-message">{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {executionOrder.length === 0 && !isRunning && (
            <div className="execution-empty">
              <p>Click "Run" to execute tasks</p>
              <p className="hint">
                {selectedTaskIds.length > 0
                  ? `Will run: ${selectedTaskNames}`
                  : 'All enabled tasks will be executed'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
