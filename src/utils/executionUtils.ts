import type {
  GradleTaskNode,
  GradleEdge,
  TaskExecutionStatus,
  ExecutionState,
  ExecutionLogEntry,
} from '../types/gradle';

/**
 * Create initial execution state
 */
export function createInitialExecutionState(): ExecutionState {
  return {
    isRunning: false,
    isPaused: false,
    taskResults: new Map(),
    executionOrder: [],
    logs: [],
  };
}

/**
 * Get topological order of tasks for execution
 * Returns tasks in order such that all dependencies come before dependents
 */
export function getExecutionOrder(
  nodes: GradleTaskNode[],
  edges: GradleEdge[],
  targetTaskIds?: string[]
): string[] {
  // Build adjacency and in-degree maps
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Filter to only include enabled nodes
  const enabledNodes = nodes.filter((n) => n.data.enabled !== false);
  const enabledNodeIds = new Set(enabledNodes.map((n) => n.id));

  // Initialize
  enabledNodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  // Build graph from edges (only dependsOn creates execution order)
  edges.forEach((edge) => {
    if (
      edge.data?.dependencyType === 'dependsOn' &&
      enabledNodeIds.has(edge.source) &&
      enabledNodeIds.has(edge.target)
    ) {
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
      adjacency.get(edge.source)?.push(edge.target);
    }
  });

  // If specific targets are requested, find all required dependencies
  let requiredNodes: Set<string>;
  if (targetTaskIds && targetTaskIds.length > 0) {
    requiredNodes = new Set<string>();
    const toVisit = [...targetTaskIds];

    while (toVisit.length > 0) {
      const nodeId = toVisit.pop()!;
      if (!requiredNodes.has(nodeId) && enabledNodeIds.has(nodeId)) {
        requiredNodes.add(nodeId);
        // Find all nodes this depends on
        edges.forEach((edge) => {
          if (edge.target === nodeId && edge.data?.dependencyType === 'dependsOn') {
            toVisit.push(edge.source);
          }
        });
      }
    }
  } else {
    requiredNodes = enabledNodeIds;
  }

  // Kahn's algorithm for topological sort
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0 && requiredNodes.has(nodeId)) {
      queue.push(nodeId);
    }
  });

  const result: string[] = [];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (requiredNodes.has(current)) {
      result.push(current);
    }

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0 && requiredNodes.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}

/**
 * Simulate task execution with random duration
 */
export async function simulateTaskExecution(
  node: GradleTaskNode,
  onProgress?: (output: string) => void
): Promise<{ success: boolean; output: string; error?: string }> {
  const taskType = node.data.taskType;
  const taskName = node.data.taskName;

  // Simulate different execution times based on task type
  const baseDurations: Record<string, number> = {
    JavaCompile: 2000,
    Test: 3000,
    Jar: 1500,
    Copy: 500,
    Delete: 300,
    Zip: 1000,
    Exec: 1500,
    ProcessResources: 800,
    HttpRequest: 1200,
    Custom: 200,
  };

  const baseDuration = baseDurations[taskType] || 1000;
  const duration = baseDuration + Math.random() * baseDuration * 0.5;

  // Simulate progress output
  const outputs: string[] = [];

  outputs.push(`> Task :${taskName}`);
  onProgress?.(outputs.join('\n'));

  await sleep(duration * 0.2);

  // Add task-specific output
  switch (taskType) {
    case 'JavaCompile':
      outputs.push(`Compiling Java source files...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.4);
      outputs.push(`Compiled ${Math.floor(Math.random() * 50 + 10)} source files`);
      break;

    case 'Test':
      outputs.push(`Running tests...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.5);
      const testCount = Math.floor(Math.random() * 100 + 20);
      outputs.push(`${testCount} tests completed, ${testCount} passed`);
      break;

    case 'Copy':
      outputs.push(`Copying files...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.3);
      outputs.push(`Copied ${Math.floor(Math.random() * 30 + 5)} files`);
      break;

    case 'Delete':
      outputs.push(`Deleting files...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.3);
      outputs.push(`Deleted build directory`);
      break;

    case 'Jar':
      outputs.push(`Creating JAR archive...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.4);
      outputs.push(`Created ${(node.data.config as Record<string, unknown>)?.archiveFileName || 'output.jar'}`);
      break;

    case 'Zip':
      outputs.push(`Creating ZIP archive...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.4);
      outputs.push(`Created ${(node.data.config as Record<string, unknown>)?.archiveFileName || 'archive.zip'}`);
      break;

    case 'Exec':
      outputs.push(`Executing command...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.5);
      outputs.push(`Command completed with exit code 0`);
      break;

    case 'HttpRequest':
      outputs.push(`Making HTTP request...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.5);
      outputs.push(`Received 200 OK`);
      break;

    default:
      outputs.push(`Executing task...`);
      onProgress?.(outputs.join('\n'));
      await sleep(duration * 0.3);
  }

  await sleep(duration * 0.2);

  // Small chance of failure for simulation
  const shouldFail = Math.random() < 0.05;
  if (shouldFail) {
    const error = `Task :${taskName} FAILED`;
    outputs.push(error);
    return { success: false, output: outputs.join('\n'), error };
  }

  outputs.push(`BUILD SUCCESSFUL`);
  onProgress?.(outputs.join('\n'));

  return { success: true, output: outputs.join('\n') };
}

/**
 * Create a log entry
 */
export function createLogEntry(
  level: ExecutionLogEntry['level'],
  message: string,
  taskId?: string,
  taskName?: string
): ExecutionLogEntry {
  return {
    timestamp: Date.now(),
    level,
    message,
    taskId,
    taskName,
  };
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Get status color for execution status
 */
export function getStatusColor(status: TaskExecutionStatus): string {
  switch (status) {
    case 'running':
      return '#3b82f6'; // blue
    case 'success':
      return '#22c55e'; // green
    case 'failed':
      return '#ef4444'; // red
    case 'pending':
      return '#f59e0b'; // amber
    case 'skipped':
      return '#94a3b8'; // gray
    case 'idle':
    default:
      return '#e2e8f0'; // light gray
  }
}

/**
 * Get status icon name
 */
export function getStatusIcon(status: TaskExecutionStatus): string {
  switch (status) {
    case 'running':
      return 'loader';
    case 'success':
      return 'check';
    case 'failed':
      return 'x';
    case 'pending':
      return 'clock';
    case 'skipped':
      return 'skip-forward';
    case 'idle':
    default:
      return 'circle';
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
