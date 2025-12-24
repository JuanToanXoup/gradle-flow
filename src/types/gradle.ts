import type { Node, Edge, BuiltInNode } from '@xyflow/react';

/**
 * Execution status for a task
 */
export type TaskExecutionStatus =
  | 'idle'       // Not started
  | 'pending'    // Waiting for dependencies
  | 'running'    // Currently executing
  | 'success'    // Completed successfully
  | 'failed'     // Execution failed
  | 'skipped';   // Skipped (disabled or condition not met)

/**
 * Execution result for a single task
 */
export interface TaskExecutionResult {
  taskId: string;
  taskName: string;
  status: TaskExecutionStatus;
  startTime?: number;
  endTime?: number;
  duration?: number;
  output?: string;
  error?: string;
}

/**
 * Overall execution state
 */
export interface ExecutionState {
  isRunning: boolean;
  isPaused: boolean;
  startTime?: number;
  endTime?: number;
  currentTaskId?: string;
  taskResults: Map<string, TaskExecutionResult>;
  executionOrder: string[];
  logs: ExecutionLogEntry[];
}

/**
 * Log entry for execution output
 */
export interface ExecutionLogEntry {
  timestamp: number;
  taskId?: string;
  taskName?: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
}

/**
 * Execution history entry for storing past runs
 */
export interface ExecutionHistoryEntry {
  /** Unique identifier for this execution */
  id: string;
  /** When the execution started */
  startTime: number;
  /** When the execution ended */
  endTime: number;
  /** Total duration in milliseconds */
  duration: number;
  /** Overall execution status */
  status: 'success' | 'failed' | 'partial' | 'cancelled';
  /** Total number of tasks executed */
  totalTasks: number;
  /** Number of successful tasks */
  successCount: number;
  /** Number of failed tasks */
  failedCount: number;
  /** Number of skipped tasks */
  skippedCount: number;
  /** Results for each task (compact format for storage) */
  taskResults: ExecutionHistoryTaskResult[];
  /** Execution logs (limited for storage) */
  logs: ExecutionLogEntry[];
  /** Optional label/name for this execution */
  label?: string;
}

/**
 * Compact task result for history storage
 */
export interface ExecutionHistoryTaskResult {
  taskId: string;
  taskName: string;
  taskType: GradleTaskType;
  status: TaskExecutionStatus;
  duration?: number;
  error?: string;
}

/**
 * Summary statistics for execution history
 */
export interface ExecutionHistoryStats {
  /** Total number of executions */
  totalExecutions: number;
  /** Number of successful executions */
  successfulExecutions: number;
  /** Number of failed executions */
  failedExecutions: number;
  /** Average execution duration */
  averageDuration: number;
  /** Most recent execution timestamp */
  lastExecutionTime?: number;
}

/**
 * Task group for organizing related tasks
 */
export interface TaskGroup {
  /** Unique identifier for the group */
  id: string;
  /** Display name for the group */
  name: string;
  /** Optional description */
  description?: string;
  /** Background color for the group container */
  color: string;
  /** Whether the group is collapsed */
  collapsed: boolean;
  /** IDs of tasks contained in this group */
  taskIds: string[];
  /** Position of the group container */
  position: { x: number; y: number };
  /** Size of the group container (auto-calculated when null) */
  size?: { width: number; height: number };
}

/**
 * Predefined group colors
 */
export const groupColors = [
  { value: '#dbeafe', label: 'Blue', border: '#3b82f6' },
  { value: '#dcfce7', label: 'Green', border: '#22c55e' },
  { value: '#fef3c7', label: 'Yellow', border: '#f59e0b' },
  { value: '#fce7f3', label: 'Pink', border: '#ec4899' },
  { value: '#f3e8ff', label: 'Purple', border: '#a855f7' },
  { value: '#e0f2fe', label: 'Cyan', border: '#06b6d4' },
  { value: '#fee2e2', label: 'Red', border: '#ef4444' },
  { value: '#f1f5f9', label: 'Gray', border: '#64748b' },
];

/**
 * Variable types for parameterizing task configurations
 */
export type VariableType = 'string' | 'number' | 'boolean' | 'path' | 'list';

/**
 * Variable definition for the graph
 */
export interface Variable {
  /** Unique identifier for the variable */
  id: string;
  /** Variable name (used in references like ${varName}) */
  name: string;
  /** Type of the variable */
  type: VariableType;
  /** Default value */
  defaultValue: string;
  /** Current value (can be overridden at runtime) */
  value: string;
  /** Optional description */
  description?: string;
  /** Whether this is a system/environment variable */
  isSystem?: boolean;
}

/**
 * Predefined system variables available in all graphs
 */
export const systemVariables: Variable[] = [
  {
    id: 'sys_project_dir',
    name: 'projectDir',
    type: 'path',
    defaultValue: '.',
    value: '.',
    description: 'The root directory of the project',
    isSystem: true,
  },
  {
    id: 'sys_build_dir',
    name: 'buildDir',
    type: 'path',
    defaultValue: 'build',
    value: 'build',
    description: 'The build output directory',
    isSystem: true,
  },
  {
    id: 'sys_version',
    name: 'version',
    type: 'string',
    defaultValue: '1.0.0',
    value: '1.0.0',
    description: 'The project version',
    isSystem: true,
  },
  {
    id: 'sys_group',
    name: 'group',
    type: 'string',
    defaultValue: 'com.example',
    value: 'com.example',
    description: 'The project group/package',
    isSystem: true,
  },
];

/**
 * Condition operators for comparisons
 */
export type ConditionOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'matches'       // Regex match
  | 'greaterThan'
  | 'lessThan'
  | 'greaterOrEqual'
  | 'lessOrEqual'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue'
  | 'isFalse';

/**
 * Source type for condition values
 */
export type ConditionSource =
  | 'variable'      // Reference a defined variable
  | 'environment'   // Environment variable (process.env)
  | 'property'      // Task or project property
  | 'literal';      // Literal value

/**
 * A single condition definition
 */
export interface Condition {
  /** Unique identifier */
  id: string;
  /** Source type for the left side value */
  leftSource: ConditionSource;
  /** Left side value (variable name, env var name, property path, or literal) */
  leftValue: string;
  /** Comparison operator */
  operator: ConditionOperator;
  /** Source type for the right side value (optional for unary operators) */
  rightSource?: ConditionSource;
  /** Right side value */
  rightValue?: string;
}

/**
 * Logic for combining multiple conditions
 */
export type ConditionLogic = 'and' | 'or';

/**
 * Task condition configuration (onlyIf / skipIf)
 */
export interface TaskCondition {
  /** Condition type - onlyIf runs task when true, skipIf skips task when true */
  type: 'onlyIf' | 'skipIf';
  /** List of conditions to evaluate */
  conditions: Condition[];
  /** How to combine multiple conditions */
  logic: ConditionLogic;
}

/**
 * Trigger types for automatic task execution
 */
export type TriggerType =
  | 'manual'      // Default - triggered by user
  | 'fileWatch'   // Triggered when files change
  | 'schedule'    // Triggered on a schedule (cron-like)
  | 'webhook';    // Triggered by external webhook/event

/**
 * File watch trigger configuration
 */
export interface FileWatchTrigger {
  type: 'fileWatch';
  /** Glob patterns to watch */
  patterns: string[];
  /** Directories to watch (relative to project root) */
  directories: string[];
  /** Whether to include subdirectories */
  recursive: boolean;
  /** Debounce time in milliseconds */
  debounceMs: number;
  /** Watch for specific events */
  events: ('create' | 'modify' | 'delete')[];
}

/**
 * Schedule trigger configuration (cron-like)
 */
export interface ScheduleTrigger {
  type: 'schedule';
  /** Cron expression (e.g., "0 * * * *" for every hour) */
  cron: string;
  /** Human-readable description */
  description?: string;
  /** Timezone for the schedule */
  timezone: string;
  /** Whether the schedule is active */
  enabled: boolean;
}

/**
 * Webhook trigger configuration
 */
export interface WebhookTrigger {
  type: 'webhook';
  /** Endpoint path for the webhook */
  endpoint: string;
  /** HTTP methods to accept */
  methods: ('GET' | 'POST' | 'PUT')[];
  /** Required headers for authentication */
  requiredHeaders?: Record<string, string>;
  /** Secret for webhook validation */
  secret?: string;
}

/**
 * Manual trigger (default - no configuration needed)
 */
export interface ManualTrigger {
  type: 'manual';
}

/**
 * Union type for all trigger configurations
 */
export type TaskTrigger =
  | ManualTrigger
  | FileWatchTrigger
  | ScheduleTrigger
  | WebhookTrigger;

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
  | 'HttpRequest'
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
 * HTTP method types
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

/**
 * Configuration for HttpRequest tasks
 */
export interface HttpRequestConfig {
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: string;
  contentType?: string;
  timeout?: number;
  followRedirects?: boolean;
  outputFile?: string;
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
  | HttpRequestConfig
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
  /** Conditional execution settings (onlyIf/skipIf) */
  condition?: TaskCondition;
  /** Trigger configuration for automatic execution */
  trigger?: TaskTrigger;
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
  HttpRequest: [
    { name: 'url', label: 'URL', type: 'text', required: true, placeholder: 'https://api.example.com/endpoint' },
    { name: 'method', label: 'Method', type: 'select', options: [
      { value: 'GET', label: 'GET' },
      { value: 'POST', label: 'POST' },
      { value: 'PUT', label: 'PUT' },
      { value: 'DELETE', label: 'DELETE' },
      { value: 'PATCH', label: 'PATCH' },
    ]},
    { name: 'headers', label: 'Headers', type: 'keyvalue', helperText: 'HTTP request headers' },
    { name: 'body', label: 'Request Body', type: 'text', placeholder: 'JSON or text body' },
    { name: 'contentType', label: 'Content Type', type: 'select', options: [
      { value: 'application/json', label: 'JSON' },
      { value: 'application/xml', label: 'XML' },
      { value: 'text/plain', label: 'Plain Text' },
      { value: 'application/x-www-form-urlencoded', label: 'Form URL Encoded' },
    ]},
    { name: 'timeout', label: 'Timeout (seconds)', type: 'number', min: 1, placeholder: '30' },
    { name: 'followRedirects', label: 'Follow Redirects', type: 'checkbox' },
    { name: 'outputFile', label: 'Save Response To', type: 'file', placeholder: 'e.g., build/response.json' },
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

/**
 * Palette category for organizing task types
 */
export type PaletteCategory = 'File Operations' | 'Network' | 'Build' | 'Custom';

/**
 * Palette item definition for drag-and-drop
 */
export interface PaletteItem {
  taskType: GradleTaskType;
  label: string;
  description: string;
  category: PaletteCategory;
}

/**
 * Palette items organized by category
 */
export const paletteItems: PaletteItem[] = [
  // File Operations
  {
    taskType: 'Copy',
    label: 'Copy Files',
    description: 'Copy files from source to destination',
    category: 'File Operations',
  },
  {
    taskType: 'Delete',
    label: 'Delete Files',
    description: 'Delete files and directories',
    category: 'File Operations',
  },
  {
    taskType: 'Zip',
    label: 'Create Zip',
    description: 'Create a ZIP archive',
    category: 'File Operations',
  },
  {
    taskType: 'ProcessResources',
    label: 'Process Resources',
    description: 'Process and copy resource files',
    category: 'File Operations',
  },
  // Network
  {
    taskType: 'HttpRequest',
    label: 'HTTP Request',
    description: 'Make HTTP API calls',
    category: 'Network',
  },
  // Build
  {
    taskType: 'Exec',
    label: 'Run Command',
    description: 'Execute shell commands',
    category: 'Build',
  },
  {
    taskType: 'JavaCompile',
    label: 'Compile Java',
    description: 'Compile Java source files',
    category: 'Build',
  },
  {
    taskType: 'Jar',
    label: 'Create JAR',
    description: 'Package classes into JAR',
    category: 'Build',
  },
  {
    taskType: 'Test',
    label: 'Run Tests',
    description: 'Execute test suites',
    category: 'Build',
  },
  // Custom
  {
    taskType: 'Custom',
    label: 'Lifecycle Task',
    description: 'Aggregate task for dependencies',
    category: 'Custom',
  },
];

/**
 * Default configurations for new tasks of each type
 */
export const defaultTaskConfigs: Record<GradleTaskType, TaskConfig> = {
  Exec: {
    commandLine: [],
    args: [],
    environment: {},
    ignoreExitValue: false,
  },
  Copy: {
    from: [],
    into: '',
    include: [],
    exclude: [],
    duplicatesStrategy: 'EXCLUDE',
    preserveFileTimestamps: true,
  },
  Delete: {
    delete: [],
    followSymlinks: false,
  },
  Zip: {
    from: [],
    archiveFileName: 'archive.zip',
    destinationDirectory: 'build/distributions',
    include: [],
    exclude: [],
    duplicatesStrategy: 'EXCLUDE',
    preserveFileTimestamps: true,
  },
  Jar: {
    from: [],
    archiveFileName: 'output.jar',
    destinationDirectory: 'build/libs',
    duplicatesStrategy: 'EXCLUDE',
  },
  Test: {
    include: ['**/*Test.class'],
    exclude: [],
    maxParallelForks: 1,
    failFast: false,
    ignoreFailures: false,
    jvmArgs: [],
  },
  JavaCompile: {
    sourceCompatibility: '17',
    targetCompatibility: '17',
    encoding: 'UTF-8',
    compilerArgs: [],
    deprecation: true,
    warnings: true,
  },
  ProcessResources: {
    from: [],
    into: '',
    include: [],
    exclude: [],
    duplicatesStrategy: 'EXCLUDE',
  },
  HttpRequest: {
    url: '',
    method: 'GET',
    headers: {},
    followRedirects: true,
    timeout: 30,
  },
  Custom: {},
};
