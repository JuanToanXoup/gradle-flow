import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  Terminal,
  Copy,
  Trash2,
  FileArchive,
  Package,
  TestTube,
  Hammer,
  FolderInput,
  Globe,
  Puzzle,
  CheckCircle,
  XCircle,
  Loader,
  Clock,
  SkipForward,
} from 'lucide-react';
import type {
  GradleTaskNode as GradleTaskNodeType,
  GradleTaskType,
  TaskExecutionStatus,
} from '../types/gradle';

/**
 * Maps Gradle task types to their corresponding icons
 */
export const taskTypeIcons: Record<GradleTaskType, React.ElementType> = {
  Exec: Terminal,
  Copy: Copy,
  Delete: Trash2,
  Zip: FileArchive,
  Jar: Package,
  Test: TestTube,
  JavaCompile: Hammer,
  ProcessResources: FolderInput,
  HttpRequest: Globe,
  Custom: Puzzle,
};

/**
 * Maps Gradle task types to their display colors
 */
export const taskTypeColors: Record<GradleTaskType, string> = {
  Exec: '#3b82f6',      // blue
  Copy: '#22c55e',      // green
  Delete: '#ef4444',    // red
  Zip: '#f59e0b',       // amber
  Jar: '#8b5cf6',       // purple
  Test: '#06b6d4',      // cyan
  JavaCompile: '#f97316', // orange
  ProcessResources: '#84cc16', // lime
  HttpRequest: '#ec4899', // pink
  Custom: '#6b7280',    // gray
};

/**
 * Maps execution status to colors
 */
const executionStatusColors: Record<TaskExecutionStatus, string> = {
  idle: 'transparent',
  pending: '#f59e0b',
  running: '#3b82f6',
  success: '#22c55e',
  failed: '#ef4444',
  skipped: '#94a3b8',
};

/**
 * Custom node component for Gradle tasks
 */
function GradleTaskNodeComponent({ data, selected }: NodeProps<GradleTaskNodeType>) {
  const Icon = taskTypeIcons[data.taskType] || taskTypeIcons.Custom;
  const color = taskTypeColors[data.taskType] || taskTypeColors.Custom;
  const executionStatus = (data.executionStatus as TaskExecutionStatus) || 'idle';
  const statusColor = executionStatusColors[executionStatus];
  const isDisabled = data.enabled === false;

  // Determine border color based on execution status
  const borderColor =
    executionStatus !== 'idle'
      ? statusColor
      : selected
        ? color
        : '#e5e7eb';

  return (
    <div
      className={`gradle-task-node ${selected ? 'selected' : ''} ${executionStatus} ${isDisabled ? 'disabled' : ''}`}
      style={{
        borderColor,
        boxShadow:
          executionStatus === 'running'
            ? `0 0 0 3px ${statusColor}40, 0 0 12px ${statusColor}30`
            : selected
              ? `0 0 0 2px ${color}40`
              : 'none',
      }}
    >
      {/* Input handle for dependencies */}
      <Handle
        type="target"
        position={Position.Top}
        className="gradle-handle"
        style={{ background: color }}
      />

      <div className="gradle-task-content">
        {/* Task type icon */}
        <div
          className="gradle-task-icon"
          style={{ backgroundColor: `${color}20`, color }}
        >
          <Icon size={16} />
        </div>

        {/* Task info */}
        <div className="gradle-task-info">
          <div className="gradle-task-name">{data.taskName}</div>
          <div className="gradle-task-type">{data.taskType}</div>
        </div>

        {/* Execution status indicator */}
        {executionStatus !== 'idle' && (
          <div
            className="gradle-task-status"
            style={{ color: statusColor }}
          >
            {executionStatus === 'running' && <Loader size={14} className="animate-spin" />}
            {executionStatus === 'success' && <CheckCircle size={14} />}
            {executionStatus === 'failed' && <XCircle size={14} />}
            {executionStatus === 'pending' && <Clock size={14} />}
            {executionStatus === 'skipped' && <SkipForward size={14} />}
          </div>
        )}
      </div>

      {/* Output handle for dependents */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="gradle-handle"
        style={{ background: color }}
      />
    </div>
  );
}

export const GradleTaskNode = memo(GradleTaskNodeComponent);
