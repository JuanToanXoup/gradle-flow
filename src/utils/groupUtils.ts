import type { Node } from '@xyflow/react';
import type { TaskGroup, GradleTaskNode } from '../types/gradle';
import { groupColors } from '../types/gradle';

const GROUP_PADDING = 40;
const GROUP_HEADER_HEIGHT = 44;

/**
 * Generate a unique ID for a new group
 */
export function generateGroupId(): string {
  return `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new group from selected nodes
 */
export function createGroupFromNodes(
  nodes: GradleTaskNode[],
  name: string,
  color: string = groupColors[0].value,
  description?: string
): TaskGroup {
  const taskIds = nodes.map((n) => n.id);
  const bounds = calculateNodesBounds(nodes);

  return {
    id: generateGroupId(),
    name,
    description,
    color,
    collapsed: false,
    taskIds,
    position: {
      x: bounds.x - GROUP_PADDING,
      y: bounds.y - GROUP_HEADER_HEIGHT - GROUP_PADDING / 2,
    },
    size: {
      width: bounds.width + GROUP_PADDING * 2,
      height: bounds.height + GROUP_HEADER_HEIGHT + GROUP_PADDING,
    },
  };
}

/**
 * Calculate the bounding box of a set of nodes
 */
export function calculateNodesBounds(nodes: Node[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  if (nodes.length === 0) {
    return { x: 0, y: 0, width: 200, height: 100 };
  }

  const NODE_WIDTH = 180;
  const NODE_HEIGHT = 60;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    const x = node.position.x;
    const y = node.position.y;
    const width = (node.measured?.width as number) || NODE_WIDTH;
    const height = (node.measured?.height as number) || NODE_HEIGHT;

    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + width);
    maxY = Math.max(maxY, y + height);
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Update group bounds based on contained nodes
 */
export function updateGroupBounds(
  group: TaskGroup,
  nodes: GradleTaskNode[]
): TaskGroup {
  const containedNodes = nodes.filter((n) => group.taskIds.includes(n.id));
  if (containedNodes.length === 0) {
    return group;
  }

  const bounds = calculateNodesBounds(containedNodes);

  return {
    ...group,
    position: {
      x: bounds.x - GROUP_PADDING,
      y: bounds.y - GROUP_HEADER_HEIGHT - GROUP_PADDING / 2,
    },
    size: {
      width: bounds.width + GROUP_PADDING * 2,
      height: bounds.height + GROUP_HEADER_HEIGHT + GROUP_PADDING,
    },
  };
}

/**
 * Add tasks to an existing group
 */
export function addTasksToGroup(
  group: TaskGroup,
  taskIds: string[]
): TaskGroup {
  const newTaskIds = [...new Set([...group.taskIds, ...taskIds])];
  return {
    ...group,
    taskIds: newTaskIds,
  };
}

/**
 * Remove tasks from a group
 */
export function removeTasksFromGroup(
  group: TaskGroup,
  taskIds: string[]
): TaskGroup {
  const taskIdSet = new Set(taskIds);
  return {
    ...group,
    taskIds: group.taskIds.filter((id) => !taskIdSet.has(id)),
  };
}

/**
 * Check if a node is inside a group's bounds
 */
export function isNodeInsideGroup(
  nodePosition: { x: number; y: number },
  group: TaskGroup
): boolean {
  if (!group.size) return false;

  const { x, y } = group.position;
  const { width, height } = group.size;

  return (
    nodePosition.x >= x &&
    nodePosition.x <= x + width &&
    nodePosition.y >= y &&
    nodePosition.y <= y + height
  );
}

/**
 * Find which group a node belongs to
 */
export function findNodeGroup(
  nodeId: string,
  groups: TaskGroup[]
): TaskGroup | undefined {
  return groups.find((g) => g.taskIds.includes(nodeId));
}

/**
 * Convert a TaskGroup to a React Flow node
 */
export function groupToNode(
  group: TaskGroup,
  onToggleCollapse?: (groupId: string) => void,
  onEditGroup?: (groupId: string) => void,
  onDeleteGroup?: (groupId: string) => void
): Node {
  return {
    id: group.id,
    type: 'taskGroup',
    position: group.position,
    style: group.size
      ? { width: group.size.width, height: group.size.height }
      : undefined,
    data: {
      group,
      onToggleCollapse,
      onEditGroup,
      onDeleteGroup,
    },
    // Groups should be rendered below task nodes
    zIndex: -1,
    // Allow resizing
    resizing: true,
  };
}

/**
 * Get statistics about a group's tasks
 */
export function getGroupStats(
  group: TaskGroup,
  nodes: GradleTaskNode[]
): {
  total: number;
  enabled: number;
  disabled: number;
  withConditions: number;
  withTriggers: number;
} {
  const containedNodes = nodes.filter((n) => group.taskIds.includes(n.id));

  let enabled = 0;
  let disabled = 0;
  let withConditions = 0;
  let withTriggers = 0;

  for (const node of containedNodes) {
    if (node.data.enabled === false) {
      disabled++;
    } else {
      enabled++;
    }
    if (node.data.condition?.conditions?.length) {
      withConditions++;
    }
    if (node.data.trigger && node.data.trigger.type !== 'manual') {
      withTriggers++;
    }
  }

  return {
    total: containedNodes.length,
    enabled,
    disabled,
    withConditions,
    withTriggers,
  };
}

/**
 * Validate group name
 */
export function validateGroupName(
  name: string,
  existingGroups: TaskGroup[],
  excludeId?: string
): string | null {
  const trimmed = name.trim();

  if (!trimmed) {
    return 'Group name is required';
  }

  if (trimmed.length > 50) {
    return 'Group name must be 50 characters or less';
  }

  const duplicate = existingGroups.find(
    (g) => g.id !== excludeId && g.name.toLowerCase() === trimmed.toLowerCase()
  );

  if (duplicate) {
    return 'A group with this name already exists';
  }

  return null;
}
