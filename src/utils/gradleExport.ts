import type {
  GradleTaskNode,
  GradleEdge,
  GradleTaskType,
  DependencyType,
  ExecConfig,
  CopyConfig,
  DeleteConfig,
  ArchiveConfig,
  TestConfig,
  JavaCompileConfig,
  HttpRequestConfig,
  TaskCondition,
  Condition,
  Variable,
} from '../types/gradle';

/**
 * Export options for customizing the generated Gradle file
 */
export interface GradleExportOptions {
  /** Include comments explaining each section */
  includeComments: boolean;
  /** Include task descriptions as KDoc */
  includeDescriptions: boolean;
  /** Include disabled tasks (commented out) */
  includeDisabledTasks: boolean;
  /** Format for variable references */
  variableFormat: 'properties' | 'inline';
  /** Project name for the generated file */
  projectName?: string;
}

const defaultExportOptions: GradleExportOptions = {
  includeComments: true,
  includeDescriptions: true,
  includeDisabledTasks: true,
  variableFormat: 'properties',
};

/**
 * Escape a string for use in Kotlin/Gradle
 */
function escapeString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\$/g, '\\$')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * Convert a task name to a valid Gradle task identifier
 */
function toTaskIdentifier(name: string): string {
  // Replace spaces and special characters with valid identifiers
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, '_$1') // Prefix with _ if starts with number
    .replace(/_+/g, '_'); // Collapse multiple underscores
}

/**
 * Build a map from node ID to task name
 */
function buildTaskNameMap(nodes: GradleTaskNode[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const node of nodes) {
    map.set(node.id, toTaskIdentifier(node.data.taskName));
  }
  return map;
}

/**
 * Get dependency type as Gradle DSL method
 */
function getDependencyMethod(depType: DependencyType): string {
  switch (depType) {
    case 'dependsOn':
      return 'dependsOn';
    case 'mustRunAfter':
      return 'mustRunAfter';
    case 'shouldRunAfter':
      return 'shouldRunAfter';
    case 'finalizedBy':
      return 'finalizedBy';
    default:
      return 'dependsOn';
  }
}

/**
 * Generate condition expression for onlyIf/skipIf
 */
function generateConditionExpression(condition: TaskCondition, variables: Variable[]): string {
  if (!condition.conditions.length) {
    return '';
  }

  const expressions = condition.conditions.map((c) => generateSingleCondition(c, variables));
  const combined = condition.logic === 'and'
    ? expressions.join(' && ')
    : expressions.join(' || ');

  const method = condition.type === 'onlyIf' ? 'onlyIf' : 'onlyIf';
  const negate = condition.type === 'skipIf' ? '!' : '';

  return `    ${method} { ${negate}(${combined}) }`;
}

/**
 * Generate a single condition expression
 */
function generateSingleCondition(condition: Condition, variables: Variable[]): string {
  const left = getConditionValue(condition.leftSource, condition.leftValue, variables);
  const right = condition.rightValue
    ? getConditionValue(condition.rightSource || 'literal', condition.rightValue, variables)
    : '';

  switch (condition.operator) {
    case 'equals':
      return `${left} == ${right}`;
    case 'notEquals':
      return `${left} != ${right}`;
    case 'contains':
      return `${left}.contains(${right})`;
    case 'notContains':
      return `!${left}.contains(${right})`;
    case 'startsWith':
      return `${left}.startsWith(${right})`;
    case 'endsWith':
      return `${left}.endsWith(${right})`;
    case 'matches':
      return `${left}.matches(Regex(${right}))`;
    case 'greaterThan':
      return `${left}.toInt() > ${right}.toInt()`;
    case 'lessThan':
      return `${left}.toInt() < ${right}.toInt()`;
    case 'greaterOrEqual':
      return `${left}.toInt() >= ${right}.toInt()`;
    case 'lessOrEqual':
      return `${left}.toInt() <= ${right}.toInt()`;
    case 'isEmpty':
      return `${left}.isEmpty()`;
    case 'isNotEmpty':
      return `${left}.isNotEmpty()`;
    case 'isTrue':
      return `${left}.toBoolean()`;
    case 'isFalse':
      return `!${left}.toBoolean()`;
    default:
      return 'true';
  }
}

/**
 * Get value expression based on source type
 */
function getConditionValue(source: string, value: string, variables: Variable[]): string {
  switch (source) {
    case 'variable':
      const variable = variables.find((v) => v.name === value);
      if (variable) {
        return `project.findProperty("${value}")?.toString() ?: "${escapeString(variable.defaultValue)}"`;
      }
      return `project.findProperty("${value}")?.toString() ?: ""`;
    case 'environment':
      return `System.getenv("${value}") ?: ""`;
    case 'property':
      return `project.findProperty("${value}")?.toString() ?: ""`;
    case 'literal':
    default:
      return `"${escapeString(value)}"`;
  }
}

/**
 * Generate Exec task configuration
 */
function generateExecConfig(config: ExecConfig, indent: string): string[] {
  const lines: string[] = [];

  if (config.commandLine?.length) {
    const escaped = config.commandLine.map((c) => `"${escapeString(c)}"`).join(', ');
    lines.push(`${indent}commandLine(${escaped})`);
  }

  if (config.workingDir) {
    lines.push(`${indent}workingDir = file("${escapeString(config.workingDir)}")`);
  }

  if (config.args?.length) {
    const escaped = config.args.map((a) => `"${escapeString(a)}"`).join(', ');
    lines.push(`${indent}args(${escaped})`);
  }

  if (config.environment && Object.keys(config.environment).length > 0) {
    for (const [key, value] of Object.entries(config.environment)) {
      lines.push(`${indent}environment("${escapeString(key)}", "${escapeString(value)}")`);
    }
  }

  if (config.ignoreExitValue) {
    lines.push(`${indent}isIgnoreExitValue = true`);
  }

  return lines;
}

/**
 * Generate Copy task configuration
 */
function generateCopyConfig(config: CopyConfig, indent: string): string[] {
  const lines: string[] = [];

  if (config.from?.length) {
    for (const src of config.from) {
      lines.push(`${indent}from("${escapeString(src)}")`);
    }
  }

  if (config.into) {
    lines.push(`${indent}into("${escapeString(config.into)}")`);
  }

  if (config.include?.length) {
    for (const pattern of config.include) {
      lines.push(`${indent}include("${escapeString(pattern)}")`);
    }
  }

  if (config.exclude?.length) {
    for (const pattern of config.exclude) {
      lines.push(`${indent}exclude("${escapeString(pattern)}")`);
    }
  }

  if (config.duplicatesStrategy && config.duplicatesStrategy !== 'INHERIT') {
    lines.push(`${indent}duplicatesStrategy = DuplicatesStrategy.${config.duplicatesStrategy}`);
  }

  if (config.preserveFileTimestamps === false) {
    lines.push(`${indent}preserveFileTimestamps = false`);
  }

  return lines;
}

/**
 * Generate Delete task configuration
 */
function generateDeleteConfig(config: DeleteConfig, indent: string): string[] {
  const lines: string[] = [];

  if (config.delete?.length) {
    const paths = config.delete.map((p) => `"${escapeString(p)}"`).join(', ');
    lines.push(`${indent}delete(${paths})`);
  }

  if (config.followSymlinks) {
    lines.push(`${indent}followSymlinks = true`);
  }

  return lines;
}

/**
 * Generate Archive (Zip/Jar) task configuration
 */
function generateArchiveConfig(config: ArchiveConfig, indent: string): string[] {
  const lines: string[] = [];

  if (config.from?.length) {
    for (const src of config.from) {
      lines.push(`${indent}from("${escapeString(src)}")`);
    }
  }

  if (config.archiveFileName) {
    // Using direct assignment (Gradle 8.2+ Kotlin DSL)
    lines.push(`${indent}archiveFileName = "${escapeString(config.archiveFileName)}"`);
  }

  if (config.destinationDirectory) {
    lines.push(`${indent}destinationDirectory = layout.projectDirectory.dir("${escapeString(config.destinationDirectory)}")`);
  }

  if (config.include?.length) {
    for (const pattern of config.include) {
      lines.push(`${indent}include("${escapeString(pattern)}")`);
    }
  }

  if (config.exclude?.length) {
    for (const pattern of config.exclude) {
      lines.push(`${indent}exclude("${escapeString(pattern)}")`);
    }
  }

  if (config.duplicatesStrategy && config.duplicatesStrategy !== 'INHERIT') {
    lines.push(`${indent}duplicatesStrategy = DuplicatesStrategy.${config.duplicatesStrategy}`);
  }

  if (config.preserveFileTimestamps === false) {
    lines.push(`${indent}preserveFileTimestamps = false`);
  }

  return lines;
}

/**
 * Generate Test task configuration
 */
function generateTestConfig(config: TestConfig, indent: string): string[] {
  const lines: string[] = [];

  if (config.include?.length) {
    for (const pattern of config.include) {
      lines.push(`${indent}include("${escapeString(pattern)}")`);
    }
  }

  if (config.exclude?.length) {
    for (const pattern of config.exclude) {
      lines.push(`${indent}exclude("${escapeString(pattern)}")`);
    }
  }

  if (config.maxParallelForks && config.maxParallelForks > 1) {
    lines.push(`${indent}maxParallelForks = ${config.maxParallelForks}`);
  }

  if (config.forkEvery && config.forkEvery > 0) {
    lines.push(`${indent}forkEvery = ${config.forkEvery}`);
  }

  if (config.failFast) {
    lines.push(`${indent}failFast = true`);
  }

  if (config.ignoreFailures) {
    lines.push(`${indent}ignoreFailures = true`);
  }

  if (config.jvmArgs?.length) {
    const args = config.jvmArgs.map((a) => `"${escapeString(a)}"`).join(', ');
    lines.push(`${indent}jvmArgs(${args})`);
  }

  return lines;
}

/**
 * Generate JavaCompile task configuration
 */
function generateJavaCompileConfig(config: JavaCompileConfig, indent: string): string[] {
  const lines: string[] = [];

  // JavaCompile source/target compatibility is set on the java extension, not the task
  // We'll generate options block for compiler settings
  if (config.options || config.sourceCompatibility || config.targetCompatibility) {
    lines.push(`${indent}options.apply {`);

    if (config.options?.encoding) {
      lines.push(`${indent}    encoding = "${escapeString(config.options.encoding)}"`);
    }

    if (config.options?.compilerArgs?.length) {
      const args = config.options.compilerArgs.map((a) => `"${escapeString(a)}"`).join(', ');
      lines.push(`${indent}    compilerArgs.addAll(listOf(${args}))`);
    }

    if (config.options?.deprecation) {
      lines.push(`${indent}    isDeprecation = true`);
    }

    if (config.options?.warnings === false) {
      lines.push(`${indent}    isWarnings = false`);
    }

    lines.push(`${indent}}`);
  }

  return lines;
}

/**
 * Generate HttpRequest task configuration (using de.undercouch.download plugin pattern)
 */
function generateHttpRequestConfig(config: HttpRequestConfig, indent: string): string[] {
  const lines: string[] = [];

  // Note: HttpRequest is not a standard Gradle task type
  // This generates an Exec task that uses curl or similar
  lines.push(`${indent}// HTTP Request (using curl)`);

  const curlArgs: string[] = ['-X', config.method || 'GET'];

  if (config.headers) {
    for (const [key, value] of Object.entries(config.headers)) {
      curlArgs.push('-H', `${key}: ${value}`);
    }
  }

  if (config.body) {
    curlArgs.push('-d', config.body);
  }

  if (config.contentType) {
    curlArgs.push('-H', `Content-Type: ${config.contentType}`);
  }

  if (config.timeout) {
    curlArgs.push('--max-time', config.timeout.toString());
  }

  if (config.followRedirects === false) {
    // curl follows redirects by default with -L, so we don't add -L
  } else {
    curlArgs.push('-L');
  }

  if (config.outputFile) {
    curlArgs.push('-o', config.outputFile);
  }

  if (config.url) {
    curlArgs.push(config.url);
  }

  const escapedArgs = curlArgs.map((a) => `"${escapeString(a)}"`).join(', ');
  lines.push(`${indent}commandLine("curl", ${escapedArgs})`);

  return lines;
}

/**
 * Generate task configuration based on task type
 */
function generateTaskConfig(
  taskType: GradleTaskType,
  config: Record<string, unknown> | undefined,
  indent: string
): string[] {
  if (!config) return [];

  switch (taskType) {
    case 'Exec':
      return generateExecConfig(config as ExecConfig, indent);
    case 'Copy':
    case 'ProcessResources':
      return generateCopyConfig(config as CopyConfig, indent);
    case 'Delete':
      return generateDeleteConfig(config as DeleteConfig, indent);
    case 'Zip':
    case 'Jar':
      return generateArchiveConfig(config as ArchiveConfig, indent);
    case 'Test':
      return generateTestConfig(config as TestConfig, indent);
    case 'JavaCompile':
      return generateJavaCompileConfig(config as JavaCompileConfig, indent);
    case 'HttpRequest':
      return generateHttpRequestConfig(config as HttpRequestConfig, indent);
    case 'Custom':
    default:
      return [];
  }
}

/**
 * Get Gradle task type class name
 */
function getGradleTaskClass(taskType: GradleTaskType): string {
  switch (taskType) {
    case 'Exec':
      return 'Exec';
    case 'Copy':
    case 'ProcessResources':
      return 'Copy';
    case 'Delete':
      return 'Delete';
    case 'Zip':
      return 'Zip';
    case 'Jar':
      return 'Jar';
    case 'Test':
      return 'Test';
    case 'JavaCompile':
      return 'JavaCompile';
    case 'HttpRequest':
      return 'Exec'; // HTTP requests are implemented as Exec tasks with curl
    case 'Custom':
    default:
      return 'DefaultTask';
  }
}

/**
 * Generate a single task definition
 */
function generateTask(
  node: GradleTaskNode,
  edges: GradleEdge[],
  taskNameMap: Map<string, string>,
  variables: Variable[],
  options: GradleExportOptions
): string[] {
  const lines: string[] = [];
  const data = node.data;
  const taskName = toTaskIdentifier(data.taskName);
  const taskClass = getGradleTaskClass(data.taskType);
  const indent = '    ';

  // Add description as KDoc comment
  if (options.includeDescriptions && data.description) {
    lines.push(`/**`);
    lines.push(` * ${data.description}`);
    lines.push(` */`);
  }

  // Disabled task comment
  if (data.enabled === false && options.includeDisabledTasks) {
    lines.push(`// Task disabled in visual editor`);
    lines.push(`// tasks.register<${taskClass}>("${taskName}") { ... }`);
    lines.push('');
    return lines;
  } else if (data.enabled === false) {
    return [];
  }

  // Task registration
  if (taskClass === 'DefaultTask') {
    lines.push(`tasks.register("${taskName}") {`);
  } else {
    lines.push(`tasks.register<${taskClass}>("${taskName}") {`);
  }

  // Group
  if (data.group) {
    lines.push(`${indent}group = "${escapeString(data.group)}"`);
  }

  // Description
  if (data.description) {
    lines.push(`${indent}description = "${escapeString(data.description)}"`);
  }

  // Dependencies from edges
  const dependencies = edges.filter((e) => e.target === node.id);
  for (const dep of dependencies) {
    const sourceTaskName = taskNameMap.get(dep.source);
    if (sourceTaskName) {
      const method = getDependencyMethod(dep.data?.dependencyType || 'dependsOn');
      lines.push(`${indent}${method}("${sourceTaskName}")`);
    }
  }

  // Finalizers (reverse edges)
  const finalizers = edges.filter(
    (e) => e.source === node.id && e.data?.dependencyType === 'finalizedBy'
  );
  for (const fin of finalizers) {
    const targetTaskName = taskNameMap.get(fin.target);
    if (targetTaskName) {
      lines.push(`${indent}finalizedBy("${targetTaskName}")`);
    }
  }

  // Task-specific configuration
  const configLines = generateTaskConfig(
    data.taskType,
    data.config as Record<string, unknown> | undefined,
    indent
  );
  lines.push(...configLines);

  // Conditional execution
  if (data.condition?.conditions?.length) {
    const conditionExpr = generateConditionExpression(data.condition, variables);
    if (conditionExpr) {
      lines.push(conditionExpr);
    }
  }

  // Timeout
  if (data.timeout && data.timeout > 0) {
    lines.push(`${indent}timeout.set(Duration.ofMinutes(${data.timeout}))`);
  }

  lines.push('}');
  lines.push('');

  return lines;
}

/**
 * Generate the complete build.gradle.kts file content
 */
export function generateGradleKts(
  nodes: GradleTaskNode[],
  edges: GradleEdge[],
  variables: Variable[] = [],
  options: Partial<GradleExportOptions> = {}
): string {
  const opts = { ...defaultExportOptions, ...options };
  const lines: string[] = [];
  const taskNameMap = buildTaskNameMap(nodes);

  // Header comment
  if (opts.includeComments) {
    lines.push('/**');
    lines.push(' * Generated by Gradle Flow Visual Editor');
    lines.push(` * Generated on: ${new Date().toISOString()}`);
    if (opts.projectName) {
      lines.push(` * Project: ${opts.projectName}`);
    }
    lines.push(' */');
    lines.push('');
  }

  // Imports
  lines.push('import java.time.Duration');
  lines.push('');

  // Plugins (basic setup)
  if (opts.includeComments) {
    lines.push('// Apply necessary plugins');
  }
  lines.push('plugins {');
  lines.push('    base');

  // Add Java plugin if we have JavaCompile or Test tasks
  const hasJavaTasks = nodes.some(
    (n) => n.data.taskType === 'JavaCompile' || n.data.taskType === 'Test' || n.data.taskType === 'Jar'
  );
  if (hasJavaTasks) {
    lines.push('    java');
  }

  lines.push('}');
  lines.push('');

  // Project properties from variables
  if (variables.length > 0 && opts.variableFormat === 'properties') {
    if (opts.includeComments) {
      lines.push('// Project properties (can be overridden via gradle.properties or -P flags)');
    }

    const userVariables = variables.filter((v) => !v.isSystem);
    if (userVariables.length > 0) {
      for (const variable of userVariables) {
        const defaultVal = escapeString(variable.defaultValue);
        lines.push(
          `val ${variable.name}: String by project.extra { "${defaultVal}" }`
        );
      }
      lines.push('');
    }
  }

  // Tasks section
  if (opts.includeComments) {
    lines.push('// =============================================================================');
    lines.push('// Task Definitions');
    lines.push('// =============================================================================');
    lines.push('');
  }

  // Sort nodes by dependency order (topological sort)
  const sortedNodes = topologicalSort(nodes, edges);

  // Generate each task
  for (const node of sortedNodes) {
    const taskLines = generateTask(node, edges, taskNameMap, variables, opts);
    lines.push(...taskLines);
  }

  return lines.join('\n');
}

/**
 * Topological sort of nodes based on edges
 */
function topologicalSort(nodes: GradleTaskNode[], edges: GradleEdge[]): GradleTaskNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const inDegree = new Map<string, number>();
  const adjacency = new Map<string, string[]>();

  // Initialize
  for (const node of nodes) {
    inDegree.set(node.id, 0);
    adjacency.set(node.id, []);
  }

  // Build graph (only for dependsOn relationships)
  for (const edge of edges) {
    if (edge.data?.dependencyType === 'dependsOn' || !edge.data?.dependencyType) {
      const current = inDegree.get(edge.target) || 0;
      inDegree.set(edge.target, current + 1);
      adjacency.get(edge.source)?.push(edge.target);
    }
  }

  // Kahn's algorithm
  const queue: string[] = [];
  const result: GradleTaskNode[] = [];

  for (const [id, degree] of inDegree) {
    if (degree === 0) {
      queue.push(id);
    }
  }

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const node = nodeMap.get(nodeId);
    if (node) {
      result.push(node);
    }

    for (const neighbor of adjacency.get(nodeId) || []) {
      const degree = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, degree);
      if (degree === 0) {
        queue.push(neighbor);
      }
    }
  }

  // Add any remaining nodes (in case of cycles or disconnected)
  for (const node of nodes) {
    if (!result.includes(node)) {
      result.push(node);
    }
  }

  return result;
}

/**
 * Validate the generated Gradle code (basic checks)
 */
export function validateGradleExport(
  nodes: GradleTaskNode[],
  edges: GradleEdge[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for duplicate task names
  const taskNames = new Set<string>();
  for (const node of nodes) {
    const name = toTaskIdentifier(node.data.taskName);
    if (taskNames.has(name)) {
      errors.push(`Duplicate task name: "${node.data.taskName}"`);
    }
    taskNames.add(name);
  }

  // Check for circular dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(nodeId: string): boolean {
    if (recursionStack.has(nodeId)) {
      return true;
    }
    if (visited.has(nodeId)) {
      return false;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);

    const outEdges = edges.filter(
      (e) => e.source === nodeId && e.data?.dependencyType === 'dependsOn'
    );

    for (const edge of outEdges) {
      if (hasCycle(edge.target)) {
        return true;
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of nodes) {
    if (hasCycle(node.id)) {
      errors.push('Circular dependency detected in task graph');
      break;
    }
  }

  // Check for missing required configurations
  for (const node of nodes) {
    const data = node.data;
    const config = data.config as Record<string, unknown> | undefined;

    if (data.taskType === 'Copy' && (!config?.into || config.into === '')) {
      errors.push(`Task "${data.taskName}": Copy task requires a destination (into)`);
    }

    if (data.taskType === 'HttpRequest' && (!config?.url || config.url === '')) {
      errors.push(`Task "${data.taskName}": HTTP Request task requires a URL`);
    }

    if (data.taskType === 'Delete' && (!config?.delete || (config.delete as string[]).length === 0)) {
      errors.push(`Task "${data.taskName}": Delete task requires paths to delete`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(textarea);
      return true;
    } catch {
      document.body.removeChild(textarea);
      return false;
    }
  }
}

/**
 * Download text as a file
 */
export function downloadAsFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
