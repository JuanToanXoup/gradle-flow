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
 * Duplicates handling strategy (used in Copy, Jar, Zip tasks)
 */
export type DuplicatesStrategy =
  | 'INCLUDE'
  | 'EXCLUDE'
  | 'WARN'
  | 'FAIL'
  | 'INHERIT';

/**
 * Configuration for Exec tasks
 */
export interface ExecConfig {
  commandLine?: string[];
  workingDir?: string;
  environment?: Record<string, string>;
  args?: string[];
  standardInput?: string;
  ignoreExitValue?: boolean;
}

/**
 * Configuration for Copy tasks
 */
export interface CopyConfig {
  from?: string[];
  into?: string;
  include?: string[];
  exclude?: string[];
  duplicatesStrategy?: DuplicatesStrategy;
  preserveFileTimestamps?: boolean;
}

/**
 * Configuration for Delete tasks
 */
export interface DeleteConfig {
  delete?: string[];
  followSymlinks?: boolean;
}

/**
 * Configuration for Zip/Jar tasks
 */
export interface ArchiveConfig {
  from?: string[];
  archiveFileName?: string;
  destinationDirectory?: string;
  duplicatesStrategy?: DuplicatesStrategy;
  preserveFileTimestamps?: boolean;
  include?: string[];
  exclude?: string[];
}

/**
 * Configuration for Test tasks
 */
export interface TestConfig {
  testClassesDirs?: string[];
  include?: string[];
  exclude?: string[];
  maxParallelForks?: number;
  forkEvery?: number;
  failFast?: boolean;
  ignoreFailures?: boolean;
  jvmArgs?: string[];
}

/**
 * Configuration for JavaCompile tasks
 */
export interface JavaCompileConfig {
  sourceCompatibility?: string;
  targetCompatibility?: string;
  options?: {
    encoding?: string;
    compilerArgs?: string[];
    deprecation?: boolean;
    warnings?: boolean;
  };
}

/**
 * Union type for all task configurations
 */
export type TaskConfig =
  | ExecConfig
  | CopyConfig
  | DeleteConfig
  | ArchiveConfig
  | TestConfig
  | JavaCompileConfig
  | Record<string, unknown>;

/**
 * Validation error for a field
 */
export interface ValidationError {
  field: string;
  message: string;
}

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
  /** Whether the task is enabled */
  enabled?: boolean;
  /** Timeout in minutes */
  timeout?: number;
  /** Task-specific configuration */
  config?: TaskConfig;
  /** Task dependencies (other task IDs) */
  dependsOn?: string[];
  /** Validation errors */
  errors?: ValidationError[];
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

/**
 * Property field definition for dynamic form generation
 */
export interface PropertyFieldDef {
  name: string;
  label: string;
  type: 'text' | 'number' | 'checkbox' | 'select' | 'file' | 'directory' | 'list' | 'keyvalue' | 'nodepicker';
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  helperText?: string;
}

/**
 * Schema defining which properties are available for each task type
 */
export const taskPropertySchemas: Record<GradleTaskType, PropertyFieldDef[]> = {
  Exec: [
    { name: 'commandLine', label: 'Command', type: 'list', placeholder: 'e.g., bash, script.sh', helperText: 'Command and arguments to execute' },
    { name: 'workingDir', label: 'Working Directory', type: 'directory', placeholder: 'e.g., ./scripts' },
    { name: 'args', label: 'Arguments', type: 'list', placeholder: 'Add argument' },
    { name: 'environment', label: 'Environment Variables', type: 'keyvalue', helperText: 'Key-value pairs for environment' },
    { name: 'ignoreExitValue', label: 'Ignore Exit Value', type: 'checkbox' },
  ],
  Copy: [
    { name: 'from', label: 'Source Paths', type: 'list', placeholder: 'Add source path' },
    { name: 'into', label: 'Destination', type: 'directory', required: true, placeholder: 'e.g., build/output' },
    { name: 'include', label: 'Include Patterns', type: 'list', placeholder: 'e.g., **/*.txt' },
    { name: 'exclude', label: 'Exclude Patterns', type: 'list', placeholder: 'e.g., **/*.bak' },
    { name: 'duplicatesStrategy', label: 'Duplicates Strategy', type: 'select', options: [
      { value: 'INCLUDE', label: 'Include' },
      { value: 'EXCLUDE', label: 'Exclude' },
      { value: 'WARN', label: 'Warn' },
      { value: 'FAIL', label: 'Fail' },
      { value: 'INHERIT', label: 'Inherit' },
    ]},
    { name: 'preserveFileTimestamps', label: 'Preserve Timestamps', type: 'checkbox' },
  ],
  Delete: [
    { name: 'delete', label: 'Paths to Delete', type: 'list', required: true, placeholder: 'Add path to delete' },
    { name: 'followSymlinks', label: 'Follow Symlinks', type: 'checkbox' },
  ],
  Zip: [
    { name: 'from', label: 'Source Paths', type: 'list', placeholder: 'Add source path' },
    { name: 'archiveFileName', label: 'Archive Name', type: 'text', placeholder: 'e.g., release.zip' },
    { name: 'destinationDirectory', label: 'Destination', type: 'directory', placeholder: 'e.g., build/distributions' },
    { name: 'include', label: 'Include Patterns', type: 'list', placeholder: 'e.g., **/*' },
    { name: 'exclude', label: 'Exclude Patterns', type: 'list', placeholder: 'e.g., **/*.log' },
    { name: 'duplicatesStrategy', label: 'Duplicates Strategy', type: 'select', options: [
      { value: 'INCLUDE', label: 'Include' },
      { value: 'EXCLUDE', label: 'Exclude' },
      { value: 'WARN', label: 'Warn' },
      { value: 'FAIL', label: 'Fail' },
      { value: 'INHERIT', label: 'Inherit' },
    ]},
    { name: 'preserveFileTimestamps', label: 'Preserve Timestamps', type: 'checkbox' },
  ],
  Jar: [
    { name: 'from', label: 'Source Paths', type: 'list', placeholder: 'Add source path' },
    { name: 'archiveFileName', label: 'JAR Name', type: 'text', placeholder: 'e.g., myapp.jar' },
    { name: 'destinationDirectory', label: 'Destination', type: 'directory', placeholder: 'e.g., build/libs' },
    { name: 'duplicatesStrategy', label: 'Duplicates Strategy', type: 'select', options: [
      { value: 'INCLUDE', label: 'Include' },
      { value: 'EXCLUDE', label: 'Exclude' },
      { value: 'WARN', label: 'Warn' },
      { value: 'FAIL', label: 'Fail' },
      { value: 'INHERIT', label: 'Inherit' },
    ]},
  ],
  Test: [
    { name: 'include', label: 'Include Patterns', type: 'list', placeholder: 'e.g., **/*Test.class' },
    { name: 'exclude', label: 'Exclude Patterns', type: 'list', placeholder: 'e.g., **/*IntegrationTest.class' },
    { name: 'maxParallelForks', label: 'Max Parallel Forks', type: 'number', min: 1, placeholder: '1' },
    { name: 'forkEvery', label: 'Fork Every N Tests', type: 'number', min: 0, placeholder: '0' },
    { name: 'failFast', label: 'Fail Fast', type: 'checkbox' },
    { name: 'ignoreFailures', label: 'Ignore Failures', type: 'checkbox' },
    { name: 'jvmArgs', label: 'JVM Arguments', type: 'list', placeholder: 'e.g., -Xmx512m' },
  ],
  JavaCompile: [
    { name: 'sourceCompatibility', label: 'Source Compatibility', type: 'select', options: [
      { value: '8', label: 'Java 8' },
      { value: '11', label: 'Java 11' },
      { value: '17', label: 'Java 17' },
      { value: '21', label: 'Java 21' },
    ]},
    { name: 'targetCompatibility', label: 'Target Compatibility', type: 'select', options: [
      { value: '8', label: 'Java 8' },
      { value: '11', label: 'Java 11' },
      { value: '17', label: 'Java 17' },
      { value: '21', label: 'Java 21' },
    ]},
    { name: 'encoding', label: 'Encoding', type: 'text', placeholder: 'e.g., UTF-8' },
    { name: 'compilerArgs', label: 'Compiler Arguments', type: 'list', placeholder: 'e.g., -Xlint:deprecation' },
    { name: 'deprecation', label: 'Show Deprecation Warnings', type: 'checkbox' },
    { name: 'warnings', label: 'Show Warnings', type: 'checkbox' },
  ],
  ProcessResources: [
    { name: 'from', label: 'Source Paths', type: 'list', placeholder: 'Add source path' },
    { name: 'into', label: 'Destination', type: 'directory', placeholder: 'e.g., build/resources' },
    { name: 'include', label: 'Include Patterns', type: 'list', placeholder: 'e.g., **/*.properties' },
    { name: 'exclude', label: 'Exclude Patterns', type: 'list', placeholder: 'e.g., **/*.bak' },
    { name: 'duplicatesStrategy', label: 'Duplicates Strategy', type: 'select', options: [
      { value: 'INCLUDE', label: 'Include' },
      { value: 'EXCLUDE', label: 'Exclude' },
      { value: 'WARN', label: 'Warn' },
      { value: 'FAIL', label: 'Fail' },
      { value: 'INHERIT', label: 'Inherit' },
    ]},
  ],
  Custom: [
    { name: 'dependsOn', label: 'Dependencies', type: 'nodepicker', helperText: 'Tasks that must run before this one' },
  ],
};

/**
 * Common properties available for all task types
 */
export const commonPropertyFields: PropertyFieldDef[] = [
  { name: 'taskName', label: 'Task Name', type: 'text', required: true, placeholder: 'e.g., myTask' },
  { name: 'group', label: 'Group', type: 'text', placeholder: 'e.g., build, verification' },
  { name: 'description', label: 'Description', type: 'text', placeholder: 'What this task does' },
  { name: 'enabled', label: 'Enabled', type: 'checkbox' },
  { name: 'timeout', label: 'Timeout (minutes)', type: 'number', min: 1, placeholder: '30' },
  { name: 'dependsOn', label: 'Dependencies', type: 'nodepicker', helperText: 'Tasks that must run before this one' },
];
