import { useState, useCallback, useMemo } from 'react';
import {
  History,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Ban,
  Clock,
  Trash2,
  Tag,
  BarChart2,
  RefreshCw,
  ChevronUp,
} from 'lucide-react';
import type {
  ExecutionHistoryEntry,
  ExecutionHistoryStats,
  ExecutionHistoryTaskResult,
} from '../types/gradle';
import {
  loadHistory,
  deleteHistoryEntry,
  clearHistory,
  calculateHistoryStats,
  formatTimestamp,
  formatDuration,
  getStatusColor,
  groupHistoryByDate,
  updateHistoryLabel,
} from '../utils/historyUtils';

interface HistoryPanelProps {
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onReplayExecution?: (entry: ExecutionHistoryEntry) => void;
}

/**
 * Status icon component
 */
function StatusIcon({ status }: { status: ExecutionHistoryEntry['status'] }) {
  const color = getStatusColor(status);

  switch (status) {
    case 'success':
      return <CheckCircle size={14} style={{ color }} />;
    case 'failed':
      return <XCircle size={14} style={{ color }} />;
    case 'partial':
      return <AlertTriangle size={14} style={{ color }} />;
    case 'cancelled':
      return <Ban size={14} style={{ color }} />;
    default:
      return null;
  }
}

/**
 * Single history entry row
 */
function HistoryEntry({
  entry,
  onDelete,
  onLabelChange,
  onReplay,
}: {
  entry: ExecutionHistoryEntry;
  onDelete: () => void;
  onLabelChange: (label: string) => void;
  onReplay?: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [labelInput, setLabelInput] = useState(entry.label || '');

  const handleLabelSave = () => {
    onLabelChange(labelInput.trim());
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLabelSave();
    } else if (e.key === 'Escape') {
      setLabelInput(entry.label || '');
      setIsEditing(false);
    }
  };

  return (
    <div className={`history-entry ${entry.status}`}>
      <div className="history-entry-header" onClick={() => setIsExpanded(!isExpanded)}>
        <button className="history-entry-toggle">
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>

        <StatusIcon status={entry.status} />

        <div className="history-entry-info">
          {entry.label ? (
            <span className="history-entry-label">{entry.label}</span>
          ) : (
            <span className="history-entry-time">{formatTimestamp(entry.startTime)}</span>
          )}
          <span className="history-entry-stats">
            {entry.successCount}/{entry.totalTasks} tasks
          </span>
        </div>

        <span className="history-entry-duration">
          <Clock size={12} />
          {formatDuration(entry.duration)}
        </span>
      </div>

      {isExpanded && (
        <div className="history-entry-details">
          {/* Summary stats */}
          <div className="history-entry-summary">
            <div className="history-stat success">
              <CheckCircle size={12} />
              <span>{entry.successCount} passed</span>
            </div>
            <div className="history-stat failed">
              <XCircle size={12} />
              <span>{entry.failedCount} failed</span>
            </div>
            <div className="history-stat skipped">
              <Ban size={12} />
              <span>{entry.skippedCount} skipped</span>
            </div>
          </div>

          {/* Label editor */}
          <div className="history-entry-label-row">
            <Tag size={12} />
            {isEditing ? (
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                onBlur={handleLabelSave}
                onKeyDown={handleKeyDown}
                placeholder="Add a label..."
                autoFocus
                className="history-label-input"
              />
            ) : (
              <button
                className="history-label-edit"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
              >
                {entry.label || 'Add label...'}
              </button>
            )}
          </div>

          {/* Task results */}
          <div className="history-task-list">
            {entry.taskResults.map((result) => (
              <TaskResultRow key={result.taskId} result={result} />
            ))}
          </div>

          {/* Actions */}
          <div className="history-entry-actions">
            {onReplay && (
              <button className="history-action-btn replay" onClick={onReplay}>
                <RefreshCw size={12} />
                Replay
              </button>
            )}
            <button className="history-action-btn delete" onClick={onDelete}>
              <Trash2 size={12} />
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Task result row within an expanded entry
 */
function TaskResultRow({ result }: { result: ExecutionHistoryTaskResult }) {
  const statusColor = getStatusColor(result.status);

  return (
    <div className={`history-task-row ${result.status}`}>
      <span className="history-task-status" style={{ color: statusColor }}>
        {result.status === 'success' && <CheckCircle size={12} />}
        {result.status === 'failed' && <XCircle size={12} />}
        {result.status === 'skipped' && <Ban size={12} />}
      </span>
      <span className="history-task-name">{result.taskName}</span>
      <span className="history-task-type">{result.taskType}</span>
      {result.duration !== undefined && (
        <span className="history-task-duration">{formatDuration(result.duration)}</span>
      )}
      {result.error && <span className="history-task-error" title={result.error}>Error</span>}
    </div>
  );
}

/**
 * Stats summary component
 */
function HistoryStatsBar({ stats }: { stats: ExecutionHistoryStats }) {
  if (stats.totalExecutions === 0) return null;

  const successRate =
    stats.totalExecutions > 0
      ? Math.round((stats.successfulExecutions / stats.totalExecutions) * 100)
      : 0;

  return (
    <div className="history-stats-bar">
      <div className="history-stat-item">
        <BarChart2 size={14} />
        <span>{stats.totalExecutions} runs</span>
      </div>
      <div className="history-stat-item success">
        <span>{successRate}% success</span>
      </div>
      <div className="history-stat-item">
        <Clock size={14} />
        <span>Avg: {formatDuration(stats.averageDuration)}</span>
      </div>
    </div>
  );
}

export function HistoryPanel({
  isExpanded,
  onToggleExpanded,
  onReplayExecution,
}: HistoryPanelProps) {
  const [history, setHistory] = useState<ExecutionHistoryEntry[]>(() => loadHistory());
  const [showStats, setShowStats] = useState(false);

  // Calculate stats
  const stats = useMemo(() => calculateHistoryStats(history), [history]);

  // Group history by date
  const groupedHistory = useMemo(() => groupHistoryByDate(history), [history]);

  // Refresh history from storage
  const refreshHistory = useCallback(() => {
    setHistory(loadHistory());
  }, []);

  // Handle delete
  const handleDelete = useCallback((entryId: string) => {
    const updated = deleteHistoryEntry(entryId);
    setHistory(updated);
  }, []);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    if (confirm('Are you sure you want to clear all execution history?')) {
      clearHistory();
      setHistory([]);
    }
  }, []);

  // Handle label change
  const handleLabelChange = useCallback((entryId: string, label: string) => {
    const updated = updateHistoryLabel(entryId, label);
    setHistory(updated);
  }, []);

  return (
    <div className="history-panel">
      <button className="history-header" onClick={onToggleExpanded}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <History size={16} />
        <span className="history-title">Execution History</span>
        {history.length > 0 && (
          <span className="history-count">{history.length}</span>
        )}
      </button>

      {isExpanded && (
        <div className="history-content">
          {/* Stats toggle */}
          {history.length > 0 && (
            <button
              className="history-stats-toggle"
              onClick={() => setShowStats(!showStats)}
            >
              <BarChart2 size={14} />
              <span>Statistics</span>
              {showStats ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          {/* Stats bar */}
          {showStats && <HistoryStatsBar stats={stats} />}

          {/* History entries grouped by date */}
          {history.length === 0 ? (
            <div className="history-empty">
              <History size={24} />
              <p>No execution history yet</p>
              <p className="hint">Run tasks to see history here</p>
            </div>
          ) : (
            <div className="history-list">
              {Array.from(groupedHistory.entries()).map(([dateGroup, entries]) => (
                <div key={dateGroup} className="history-group">
                  <div className="history-group-header">{dateGroup}</div>
                  {entries.map((entry) => (
                    <HistoryEntry
                      key={entry.id}
                      entry={entry}
                      onDelete={() => handleDelete(entry.id)}
                      onLabelChange={(label) => handleLabelChange(entry.id, label)}
                      onReplay={
                        onReplayExecution
                          ? () => onReplayExecution(entry)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          {history.length > 0 && (
            <div className="history-actions">
              <button className="history-refresh-btn" onClick={refreshHistory}>
                <RefreshCw size={12} />
                Refresh
              </button>
              <button className="history-clear-btn" onClick={handleClearAll}>
                <Trash2 size={12} />
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Re-export for use in TaskGraphCanvas to record history
export { loadHistory, addHistoryEntry } from '../utils/historyUtils';
