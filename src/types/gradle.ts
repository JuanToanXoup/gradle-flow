import type { Node, Edge, BuiltInNode } from '@xyflow/react';

/**
 * Gradle task types supported by the visual editor
 */
export type GradleTaskType =
  | 'Exec'
  | 'Copy'
  | 'Delete'
  | 'Zip'
  | 'Jar'
  | 'Test'
  | 'JavaCompile'
  | 'ProcessResources'
  | 'Custom';

/**
 * Gradle dependency relationship types
 */
export type DependencyType =
  | 'dependsOn'      // Solid edge - hard dependency
  | 'mustRunAfter'   // Dashed edge - ordering only
  | 'shouldRunAfter' // Dotted edge - soft ordering
  | 'finalizedBy';   // Reverse arrow - cleanup/reporting

/**
 * Data structure for a Gradle task node
 */
export interface GradleTaskNodeData extends Record<string, unknown> {
  /** The task name as it appears in build.gradle.kts */
  taskName: string;
  /** The task type (e.g., Exec, Copy, Delete) */
  taskType: GradleTaskType;
  /** Optional task group for organization */
  group?: string;
  /** Optional task description */
  description?: string;
  /** Whether the task is currently selected */
  selected?: boolean;
}

/**
 * Typed node for React Flow with Gradle task data
 */
export type GradleTaskNode = Node<GradleTaskNodeData, 'gradleTask'>;

/**
 * Data structure for edges between Gradle tasks
 */
export interface GradleEdgeData extends Record<string, unknown> {
  /** The type of dependency relationship */
  dependencyType: DependencyType;
}

/**
 * Typed edge for React Flow with Gradle dependency data
 */
export type GradleEdge = Edge<GradleEdgeData>;

/**
 * All node types used in the application
 */
export type AppNode = GradleTaskNode | BuiltInNode;

/**
 * The complete graph structure
 */
export interface GradleTaskGraph {
  nodes: GradleTaskNode[];
  edges: GradleEdge[];
}
