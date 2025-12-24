import { memo, useCallback } from 'react';
import { type NodeProps, NodeResizer, useReactFlow } from '@xyflow/react';
import {
  ChevronDown,
  ChevronRight,
  Layers,
  Edit2,
  Trash2,
  MoreHorizontal,
} from 'lucide-react';
import type { TaskGroup } from '../types/gradle';
import { groupColors } from '../types/gradle';

export interface TaskGroupNodeData extends Record<string, unknown> {
  group: TaskGroup;
  isSelected?: boolean;
  onToggleCollapse?: (groupId: string) => void;
  onEditGroup?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
}

/**
 * Get border color for a group based on its background color
 */
function getBorderColor(bgColor: string): string {
  const colorDef = groupColors.find((c) => c.value === bgColor);
  return colorDef?.border || '#64748b';
}

/**
 * Task group node component for visual grouping
 */
function TaskGroupNodeComponent({ data, selected }: NodeProps) {
  const { group, onToggleCollapse, onEditGroup, onDeleteGroup } =
    data as TaskGroupNodeData;
  const { getNodes } = useReactFlow();

  const borderColor = getBorderColor(group.color);
  const taskCount = group.taskIds.length;

  // Count execution statuses of contained tasks
  const getTaskStats = useCallback(() => {
    const nodes = getNodes();
    let running = 0;
    let success = 0;
    let failed = 0;

    for (const taskId of group.taskIds) {
      const node = nodes.find((n) => n.id === taskId);
      if (node?.data?.executionStatus) {
        switch (node.data.executionStatus) {
          case 'running':
            running++;
            break;
          case 'success':
            success++;
            break;
          case 'failed':
            failed++;
            break;
        }
      }
    }

    return { running, success, failed };
  }, [getNodes, group.taskIds]);

  const stats = getTaskStats();

  const handleToggleCollapse = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleCollapse?.(group.id);
    },
    [group.id, onToggleCollapse]
  );

  const handleEdit = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onEditGroup?.(group.id);
    },
    [group.id, onEditGroup]
  );

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDeleteGroup?.(group.id);
    },
    [group.id, onDeleteGroup]
  );

  return (
    <>
      <NodeResizer
        minWidth={200}
        minHeight={100}
        isVisible={selected}
        lineClassName="group-resizer-line"
        handleClassName="group-resizer-handle"
      />

      <div
        className={`task-group-node ${group.collapsed ? 'collapsed' : ''} ${
          selected ? 'selected' : ''
        }`}
        style={{
          backgroundColor: group.color,
          borderColor: borderColor,
          minWidth: group.collapsed ? 200 : undefined,
          minHeight: group.collapsed ? 60 : undefined,
        }}
      >
        {/* Group Header */}
        <div className="task-group-header" style={{ borderColor }}>
          <button
            className="group-collapse-btn"
            onClick={handleToggleCollapse}
            title={group.collapsed ? 'Expand group' : 'Collapse group'}
          >
            {group.collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          <Layers size={16} style={{ color: borderColor }} />

          <span className="group-name">{group.name}</span>

          <span className="group-task-count" style={{ color: borderColor }}>
            {taskCount} task{taskCount !== 1 ? 's' : ''}
          </span>

          {/* Execution status indicators */}
          {(stats.running > 0 || stats.success > 0 || stats.failed > 0) && (
            <div className="group-status-indicators">
              {stats.running > 0 && (
                <span className="group-status running">{stats.running}</span>
              )}
              {stats.success > 0 && (
                <span className="group-status success">{stats.success}</span>
              )}
              {stats.failed > 0 && (
                <span className="group-status failed">{stats.failed}</span>
              )}
            </div>
          )}

          {/* Group actions */}
          <div className="group-actions">
            <button
              className="group-action-btn"
              onClick={handleEdit}
              title="Edit group"
            >
              <Edit2 size={14} />
            </button>
            <button
              className="group-action-btn delete"
              onClick={handleDelete}
              title="Delete group"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Group description */}
        {group.description && !group.collapsed && (
          <div className="group-description">{group.description}</div>
        )}

        {/* Collapsed indicator */}
        {group.collapsed && (
          <div className="group-collapsed-content">
            <MoreHorizontal size={20} style={{ color: borderColor }} />
            <span>Click to expand</span>
          </div>
        )}
      </div>
    </>
  );
}

export const TaskGroupNode = memo(TaskGroupNodeComponent);
