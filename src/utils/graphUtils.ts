import type { Connection } from '@xyflow/react';
import type { GradleEdge, GradleTaskNode } from '../types/gradle';

/**
 * Check if adding an edge would create a cycle in the graph
 * Uses DFS to detect cycles
 */
export function wouldCreateCycle(
  nodes: GradleTaskNode[],
  edges: GradleEdge[],
  newConnection: Connection
): boolean {
  if (!newConnection.source || !newConnection.target) return false;

  // Self-loop check
  if (newConnection.source === newConnection.target) return true;

  // Build adjacency list from existing edges plus the new connection
  const adjacency = new Map<string, Set<string>>();

  // Initialize with all nodes
  nodes.forEach((node) => {
    adjacency.set(node.id, new Set());
  });

  // Add existing edges
  edges.forEach((edge) => {
    const neighbors = adjacency.get(edge.source);
    if (neighbors) {
      neighbors.add(edge.target);
    }
  });

  // Add the new edge
  const sourceNeighbors = adjacency.get(newConnection.source);
  if (sourceNeighbors) {
    sourceNeighbors.add(newConnection.target);
  }

  // DFS cycle detection
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycleDFS(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const neighbors = adjacency.get(nodeId);
    if (neighbors) {
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          if (hasCycleDFS(neighbor)) {
            return true;
          }
        } else if (recursionStack.has(neighbor)) {
          return true;
        }
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  // Check for cycles starting from each unvisited node
  for (const node of nodes) {
    if (!visited.has(node.id)) {
      if (hasCycleDFS(node.id)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Check if a duplicate edge already exists
 */
export function isDuplicateEdge(edges: GradleEdge[], connection: Connection): boolean {
  if (!connection.source || !connection.target) return false;

  return edges.some(
    (edge) => edge.source === connection.source && edge.target === connection.target
  );
}

/**
 * Validate a connection before creating an edge
 */
export interface ConnectionValidationResult {
  valid: boolean;
  message?: string;
}

export function validateConnection(
  nodes: GradleTaskNode[],
  edges: GradleEdge[],
  connection: Connection
): ConnectionValidationResult {
  // Check for self-loop
  if (connection.source === connection.target) {
    return { valid: false, message: 'Cannot connect a task to itself' };
  }

  // Check for duplicate edge
  if (isDuplicateEdge(edges, connection)) {
    return { valid: false, message: 'This dependency already exists' };
  }

  // Check for cycle (only for dependsOn edges which create hard dependencies)
  if (wouldCreateCycle(nodes, edges, connection)) {
    return { valid: false, message: 'This would create a circular dependency' };
  }

  return { valid: true };
}

/**
 * Find all paths from source to target
 * Used for visualizing dependency chains
 */
export function findAllPaths(
  nodes: GradleTaskNode[],
  edges: GradleEdge[],
  sourceId: string,
  targetId: string
): string[][] {
  const adjacency = new Map<string, string[]>();

  nodes.forEach((node) => {
    adjacency.set(node.id, []);
  });

  edges.forEach((edge) => {
    const neighbors = adjacency.get(edge.source);
    if (neighbors) {
      neighbors.push(edge.target);
    }
  });

  const paths: string[][] = [];

  function dfs(current: string, target: string, path: string[]) {
    path.push(current);

    if (current === target) {
      paths.push([...path]);
    } else {
      const neighbors = adjacency.get(current) || [];
      for (const neighbor of neighbors) {
        if (!path.includes(neighbor)) {
          dfs(neighbor, target, path);
        }
      }
    }

    path.pop();
  }

  dfs(sourceId, targetId, []);
  return paths;
}

/**
 * Get all upstream dependencies (nodes that must run before this one)
 */
export function getUpstreamDependencies(
  edges: GradleEdge[],
  nodeId: string,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const directDeps = edges
    .filter((e) => e.target === nodeId)
    .map((e) => e.source);

  const allDeps = [...directDeps];
  for (const depId of directDeps) {
    const transitiveDeps = getUpstreamDependencies(edges, depId, visited);
    allDeps.push(...transitiveDeps);
  }

  return [...new Set(allDeps)];
}

/**
 * Get all downstream dependents (nodes that depend on this one)
 */
export function getDownstreamDependents(
  edges: GradleEdge[],
  nodeId: string,
  visited: Set<string> = new Set()
): string[] {
  if (visited.has(nodeId)) return [];
  visited.add(nodeId);

  const directDependents = edges
    .filter((e) => e.source === nodeId)
    .map((e) => e.target);

  const allDependents = [...directDependents];
  for (const depId of directDependents) {
    const transitiveDependents = getDownstreamDependents(edges, depId, visited);
    allDependents.push(...transitiveDependents);
  }

  return [...new Set(allDependents)];
}

/**
 * Topological sort of nodes based on edges
 * Returns nodes in execution order (leaves first)
 */
export function topologicalSort(
  nodes: GradleTaskNode[],
  edges: GradleEdge[]
): GradleTaskNode[] {
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  nodes.forEach((node) => {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  });

  // Build graph
  edges.forEach((edge) => {
    inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    adjacency.get(edge.source)?.push(edge.target);
  });

  // Find all nodes with no dependencies
  const queue: string[] = [];
  inDegree.forEach((degree, nodeId) => {
    if (degree === 0) {
      queue.push(nodeId);
    }
  });

  const result: GradleTaskNode[] = [];
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodeMap.get(current);
    if (node) {
      result.push(node);
    }

    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      const newDegree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) {
        queue.push(neighbor);
      }
    }
  }

  return result;
}
