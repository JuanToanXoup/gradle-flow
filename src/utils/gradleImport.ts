import type {
  GradleTaskNode,
  GradleEdge,
  GradleTaskType,
  GradleTaskNodeData,
  DependencyType,
  ExecConfig,
  CopyConfig,
  DeleteConfig,
  ArchiveConfig,
  TestConfig,
  JavaCompileConfig,
  TaskCondition,
  Condition,
} from '../types/gradle';

/**
 * Result of parsing a Gradle file
 */
export interface GradleParseResult {
  nodes: GradleTaskNode[];
  edges: GradleEdge[];
  errors: string[];
  warnings: string[];
}

/**
 * Parsed task from Gradle DSL
 */
interface ParsedTask {
  id: string;
  name: string;
  type: GradleTaskType;
  group?: string;
  description?: string;
  enabled?: boolean;
  config: Record<string, unknown>;
  dependsOn: string[];
  mustRunAfter: string[];
  shouldRunAfter: string[];
  finalizedBy: string[];
  condition?: TaskCondition;
  bodyContent: string;
}

/**
 * Map Gradle task class names to our task types
 */
const TASK_TYPE_MAP: Record<string, GradleTaskType> = {
  'Exec': 'Exec',
  'Copy': 'Copy',
  'Delete': 'Delete',
  'Zip': 'Zip',
  'Jar': 'Jar',
  'Test': 'Test',
  'JavaCompile': 'JavaCompile',
  'ProcessResources': 'ProcessResources',
  'DefaultTask': 'Custom',
};

/**
 * Parse a Gradle Kotlin DSL file and extract tasks
 */
export function parseGradleKts(content: string): GradleParseResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const parsedTasks: ParsedTask[] = [];

  // Remove comments for cleaner parsing
  const cleanContent = removeComments(content);

  // Track matched positions to avoid duplicates
  const matchedPositions = new Set<number>();

  // Pattern 1: tasks.register<Type>("name") { ... }
  const pattern1 = /tasks\.register<(\w+)>\s*\(\s*"([^"]+)"\s*\)\s*\{/g;
  let match;
  while ((match = pattern1.exec(cleanContent)) !== null) {
    if (matchedPositions.has(match.index)) continue;
    matchedPositions.add(match.index);

    const taskType = TASK_TYPE_MAP[match[1]] || 'Custom';
    const taskName = match[2];
    const bodyStart = match.index + match[0].length;
    const bodyContent = extractBalancedBraces(cleanContent, bodyStart - 1);

    try {
      const parsed = parseTaskBody(taskName, taskType, bodyContent);
      parsedTasks.push(parsed);
    } catch (e) {
      errors.push(`Error parsing task "${taskName}": ${e}`);
    }
  }

  // Pattern 2: tasks.register("name") { ... }
  const pattern2 = /tasks\.register\s*\(\s*"([^"]+)"\s*\)\s*\{/g;
  while ((match = pattern2.exec(cleanContent)) !== null) {
    if (matchedPositions.has(match.index)) continue;
    matchedPositions.add(match.index);

    const taskName = match[1];
    const bodyStart = match.index + match[0].length;
    const bodyContent = extractBalancedBraces(cleanContent, bodyStart - 1);

    try {
      const parsed = parseTaskBody(taskName, 'Custom', bodyContent);
      parsedTasks.push(parsed);
    } catch (e) {
      errors.push(`Error parsing task "${taskName}": ${e}`);
    }
  }

  // Pattern 3: tasks.register("name", Type::class) { ... }
  const pattern3 = /tasks\.register\s*\(\s*"([^"]+)"\s*,\s*(\w+)::class(?:\.java)?\s*\)\s*\{/g;
  while ((match = pattern3.exec(cleanContent)) !== null) {
    if (matchedPositions.has(match.index)) continue;
    matchedPositions.add(match.index);

    const taskName = match[1];
    const taskType = TASK_TYPE_MAP[match[2]] || 'Custom';
    const bodyStart = match.index + match[0].length;
    const bodyContent = extractBalancedBraces(cleanContent, bodyStart - 1);

    try {
      const parsed = parseTaskBody(taskName, taskType, bodyContent);
      parsedTasks.push(parsed);
    } catch (e) {
      errors.push(`Error parsing task "${taskName}": ${e}`);
    }
  }

  // Pattern 4: tasks.create<Type>("name") { ... }
  const pattern4 = /tasks\.create<(\w+)>\s*\(\s*"([^"]+)"\s*\)\s*\{/g;
  while ((match = pattern4.exec(cleanContent)) !== null) {
    if (matchedPositions.has(match.index)) continue;
    matchedPositions.add(match.index);

    const taskType = TASK_TYPE_MAP[match[1]] || 'Custom';
    const taskName = match[2];
    const bodyStart = match.index + match[0].length;
    const bodyContent = extractBalancedBraces(cleanContent, bodyStart - 1);

    try {
      const parsed = parseTaskBody(taskName, taskType, bodyContent);
      parsedTasks.push(parsed);
    } catch (e) {
      errors.push(`Error parsing task "${taskName}": ${e}`);
    }
  }

  // Convert parsed tasks to nodes and edges
  const { nodes, edges } = convertToGraph(parsedTasks);

  if (parsedTasks.length === 0) {
    warnings.push('No tasks found in the Gradle file. Make sure tasks use tasks.register or tasks.create syntax.');
  }

  return { nodes, edges, errors, warnings };
}

/**
 * Remove single-line and multi-line comments
 */
function removeComments(content: string): string {
  // Remove multi-line comments
  let result = content.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments (but preserve strings)
  result = result.replace(/\/\/.*$/gm, '');
  return result;
}

/**
 * Extract content between balanced braces starting at position
 */
function extractBalancedBraces(content: string, start: number): string {
  let depth = 0;
  let inString = false;
  let stringChar = '';
  let result = '';

  for (let i = start; i < content.length; i++) {
    const char = content[i];
    const prevChar = i > 0 ? content[i - 1] : '';

    // Handle string literals
    if ((char === '"' || char === '\'') && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
    }

    if (!inString) {
      if (char === '{') {
        depth++;
        if (depth === 1) continue; // Skip the opening brace
      } else if (char === '}') {
        depth--;
        if (depth === 0) break;
      }
    }

    if (depth > 0) {
      result += char;
    }
  }

  return result;
}

/**
 * Parse the body of a task definition
 */
function parseTaskBody(name: string, type: GradleTaskType, body: string): ParsedTask {
  const task: ParsedTask = {
    id: `task_${name.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name,
    type,
    config: {},
    dependsOn: [],
    mustRunAfter: [],
    shouldRunAfter: [],
    finalizedBy: [],
    bodyContent: body,
  };

  // Parse group
  const groupMatch = body.match(/group\s*=\s*"([^"]+)"/);
  if (groupMatch) {
    task.group = groupMatch[1];
  }

  // Parse description
  const descMatch = body.match(/description\s*=\s*"([^"]+)"/);
  if (descMatch) {
    task.description = descMatch[1];
  }

  // Parse enabled
  const enabledMatch = body.match(/enabled\s*=\s*(true|false)/);
  if (enabledMatch) {
    task.enabled = enabledMatch[1] === 'true';
  }

  // Parse dependencies
  task.dependsOn = parseTaskReferences(body, 'dependsOn');
  task.mustRunAfter = parseTaskReferences(body, 'mustRunAfter');
  task.shouldRunAfter = parseTaskReferences(body, 'shouldRunAfter');
  task.finalizedBy = parseTaskReferences(body, 'finalizedBy');

  // Parse onlyIf condition
  const onlyIfMatch = body.match(/onlyIf\s*\{([^}]+)\}/);
  if (onlyIfMatch) {
    task.condition = parseCondition('onlyIf', onlyIfMatch[1]);
  }

  // Parse type-specific configuration
  switch (type) {
    case 'Exec':
      task.config = parseExecConfig(body) as Record<string, unknown>;
      break;
    case 'Copy':
    case 'ProcessResources':
      task.config = parseCopyConfig(body) as Record<string, unknown>;
      break;
    case 'Delete':
      task.config = parseDeleteConfig(body) as Record<string, unknown>;
      break;
    case 'Zip':
    case 'Jar':
      task.config = parseArchiveConfig(body) as Record<string, unknown>;
      break;
    case 'Test':
      task.config = parseTestConfig(body) as Record<string, unknown>;
      break;
    case 'JavaCompile':
      task.config = parseJavaCompileConfig(body) as Record<string, unknown>;
      break;
    case 'HttpRequest':
      // HttpRequest is custom, parse as Exec with curl
      task.config = parseExecConfig(body) as Record<string, unknown>;
      break;
  }

  return task;
}

/**
 * Parse task references from a method call like dependsOn("task1", "task2")
 */
function parseTaskReferences(body: string, method: string): string[] {
  const results: string[] = [];

  // Match method("task1", "task2") or method("task1")
  const regex = new RegExp(`${method}\\s*\\(([^)]+)\\)`, 'g');
  let match;

  while ((match = regex.exec(body)) !== null) {
    const args = match[1];
    // Extract quoted strings
    const taskRefs = args.match(/"([^"]+)"/g);
    if (taskRefs) {
      for (const ref of taskRefs) {
        results.push(ref.replace(/"/g, ''));
      }
    }
  }

  return results;
}

/**
 * Parse a simple condition expression
 */
function parseCondition(type: 'onlyIf' | 'skipIf', expr: string): TaskCondition {
  const conditions: Condition[] = [];

  // Try to parse common patterns
  // Environment variable check: System.getenv("VAR") != null
  const envMatch = expr.match(/System\.getenv\s*\(\s*"([^"]+)"\s*\)\s*(!=|==)\s*(null|"[^"]*")/);
  if (envMatch) {
    conditions.push({
      id: `cond_${Date.now()}`,
      leftSource: 'environment',
      leftValue: envMatch[1],
      operator: envMatch[2] === '!=' ? 'isNotEmpty' : 'isEmpty',
    });
  }

  // Property check: project.hasProperty("prop")
  const propMatch = expr.match(/project\.hasProperty\s*\(\s*"([^"]+)"\s*\)/);
  if (propMatch) {
    conditions.push({
      id: `cond_${Date.now()}`,
      leftSource: 'property',
      leftValue: propMatch[1],
      operator: 'isNotEmpty',
    });
  }

  // If we couldn't parse specific conditions, create a generic one
  if (conditions.length === 0) {
    conditions.push({
      id: `cond_${Date.now()}`,
      leftSource: 'literal',
      leftValue: expr.trim(),
      operator: 'isTrue',
    });
  }

  return {
    type,
    conditions,
    logic: 'and',
  };
}

/**
 * Parse Exec task configuration
 */
function parseExecConfig(body: string): ExecConfig {
  const config: ExecConfig = {};

  // commandLine("cmd", "arg1", "arg2")
  const cmdMatch = body.match(/commandLine\s*\(([^)]+)\)/);
  if (cmdMatch) {
    const args = cmdMatch[1].match(/"([^"]+)"/g);
    if (args) {
      config.commandLine = args.map(a => a.replace(/"/g, ''));
    }
  }

  // workingDir = file("path") or workingDir("path")
  const wdMatch = body.match(/workingDir\s*=?\s*(?:file\s*\()?\s*"([^"]+)"/);
  if (wdMatch) {
    config.workingDir = wdMatch[1];
  }

  // args("arg1", "arg2")
  const argsMatch = body.match(/\bargs\s*\(([^)]+)\)/);
  if (argsMatch) {
    const args = argsMatch[1].match(/"([^"]+)"/g);
    if (args) {
      config.args = args.map(a => a.replace(/"/g, ''));
    }
  }

  // environment("KEY", "value")
  const envMatches = body.matchAll(/environment\s*\(\s*"([^"]+)"\s*,\s*"([^"]+)"\s*\)/g);
  const env: Record<string, string> = {};
  for (const m of envMatches) {
    env[m[1]] = m[2];
  }
  if (Object.keys(env).length > 0) {
    config.environment = env;
  }

  // isIgnoreExitValue = true
  if (body.includes('isIgnoreExitValue = true') || body.includes('ignoreExitValue = true')) {
    config.ignoreExitValue = true;
  }

  return config;
}

/**
 * Parse Copy task configuration
 */
function parseCopyConfig(body: string): CopyConfig {
  const config: CopyConfig = {};

  // from("path")
  const fromMatches = body.matchAll(/from\s*\(\s*"([^"]+)"\s*\)/g);
  const fromPaths: string[] = [];
  for (const m of fromMatches) {
    fromPaths.push(m[1]);
  }
  if (fromPaths.length > 0) {
    config.from = fromPaths;
  }

  // into("path")
  const intoMatch = body.match(/into\s*\(\s*"([^"]+)"\s*\)/);
  if (intoMatch) {
    config.into = intoMatch[1];
  }

  // include("pattern")
  const includeMatches = body.matchAll(/include\s*\(\s*"([^"]+)"\s*\)/g);
  const includes: string[] = [];
  for (const m of includeMatches) {
    includes.push(m[1]);
  }
  if (includes.length > 0) {
    config.include = includes;
  }

  // exclude("pattern")
  const excludeMatches = body.matchAll(/exclude\s*\(\s*"([^"]+)"\s*\)/g);
  const excludes: string[] = [];
  for (const m of excludeMatches) {
    excludes.push(m[1]);
  }
  if (excludes.length > 0) {
    config.exclude = excludes;
  }

  // duplicatesStrategy = DuplicatesStrategy.EXCLUDE
  const dupsMatch = body.match(/duplicatesStrategy\s*=\s*DuplicatesStrategy\.(\w+)/);
  if (dupsMatch) {
    config.duplicatesStrategy = dupsMatch[1] as CopyConfig['duplicatesStrategy'];
  }

  return config;
}

/**
 * Parse Delete task configuration
 */
function parseDeleteConfig(body: string): DeleteConfig {
  const config: DeleteConfig = {};

  // delete("path1", "path2")
  const deleteMatch = body.match(/delete\s*\(([^)]+)\)/);
  if (deleteMatch) {
    const paths = deleteMatch[1].match(/"([^"]+)"/g);
    if (paths) {
      config.delete = paths.map(p => p.replace(/"/g, ''));
    }
  }

  return config;
}

/**
 * Parse Archive (Zip/Jar) task configuration
 */
function parseArchiveConfig(body: string): ArchiveConfig {
  const config: ArchiveConfig = {};

  // from("path")
  const fromMatches = body.matchAll(/from\s*\(\s*"([^"]+)"\s*\)/g);
  const fromPaths: string[] = [];
  for (const m of fromMatches) {
    fromPaths.push(m[1]);
  }
  if (fromPaths.length > 0) {
    config.from = fromPaths;
  }

  // archiveFileName = "name.zip" or archiveFileName.set("name.zip")
  const nameMatch = body.match(/archiveFileName(?:\.set\s*\(|\s*=\s*)"([^"]+)"/);
  if (nameMatch) {
    config.archiveFileName = nameMatch[1];
  }

  // destinationDirectory
  const destMatch = body.match(/destinationDirectory(?:\.set\s*\(|\s*=\s*)(?:file\s*\(|layout\.\w+\.dir\s*\()?\s*"([^"]+)"/);
  if (destMatch) {
    config.destinationDirectory = destMatch[1];
  }

  // include/exclude
  const includeMatches = body.matchAll(/include\s*\(\s*"([^"]+)"\s*\)/g);
  const includes: string[] = [];
  for (const m of includeMatches) {
    includes.push(m[1]);
  }
  if (includes.length > 0) {
    config.include = includes;
  }

  const excludeMatches = body.matchAll(/exclude\s*\(\s*"([^"]+)"\s*\)/g);
  const excludes: string[] = [];
  for (const m of excludeMatches) {
    excludes.push(m[1]);
  }
  if (excludes.length > 0) {
    config.exclude = excludes;
  }

  return config;
}

/**
 * Parse Test task configuration
 */
function parseTestConfig(body: string): TestConfig {
  const config: TestConfig = {};

  // include/exclude
  const includeMatches = body.matchAll(/include\s*\(\s*"([^"]+)"\s*\)/g);
  const includes: string[] = [];
  for (const m of includeMatches) {
    includes.push(m[1]);
  }
  if (includes.length > 0) {
    config.include = includes;
  }

  const excludeMatches = body.matchAll(/exclude\s*\(\s*"([^"]+)"\s*\)/g);
  const excludes: string[] = [];
  for (const m of excludeMatches) {
    excludes.push(m[1]);
  }
  if (excludes.length > 0) {
    config.exclude = excludes;
  }

  // maxParallelForks = N
  const forksMatch = body.match(/maxParallelForks\s*=\s*(\d+)/);
  if (forksMatch) {
    config.maxParallelForks = parseInt(forksMatch[1], 10);
  }

  // failFast = true
  if (body.includes('failFast = true')) {
    config.failFast = true;
  }

  // ignoreFailures = true
  if (body.includes('ignoreFailures = true')) {
    config.ignoreFailures = true;
  }

  // jvmArgs
  const jvmMatch = body.match(/jvmArgs\s*\(([^)]+)\)/);
  if (jvmMatch) {
    const args = jvmMatch[1].match(/"([^"]+)"/g);
    if (args) {
      config.jvmArgs = args.map(a => a.replace(/"/g, ''));
    }
  }

  return config;
}

/**
 * Parse JavaCompile task configuration
 */
function parseJavaCompileConfig(body: string): JavaCompileConfig {
  const config: JavaCompileConfig = {};

  // sourceCompatibility/targetCompatibility
  const srcMatch = body.match(/sourceCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?(\d+)/);
  if (srcMatch) {
    config.sourceCompatibility = srcMatch[1];
  }

  const tgtMatch = body.match(/targetCompatibility\s*=\s*(?:JavaVersion\.VERSION_)?(\d+)/);
  if (tgtMatch) {
    config.targetCompatibility = tgtMatch[1];
  }

  // options.encoding
  const encMatch = body.match(/options\s*\.\s*encoding\s*=\s*"([^"]+)"/);
  if (encMatch) {
    config.options = config.options || {};
    config.options.encoding = encMatch[1];
  }

  return config;
}

/**
 * Convert parsed tasks to graph nodes and edges
 */
function convertToGraph(tasks: ParsedTask[]): { nodes: GradleTaskNode[]; edges: GradleEdge[] } {
  const nodes: GradleTaskNode[] = [];
  const edges: GradleEdge[] = [];
  const taskNameToId = new Map<string, string>();

  // Create nodes
  let x = 100;
  let y = 100;
  const spacing = 200;
  const perRow = 4;

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    taskNameToId.set(task.name, task.id);

    const nodeData: GradleTaskNodeData = {
      taskName: task.name,
      taskType: task.type,
      group: task.group,
      description: task.description,
      enabled: task.enabled ?? true,
      config: task.config,
      condition: task.condition,
    };

    nodes.push({
      id: task.id,
      type: 'gradleTask',
      position: {
        x: x + (i % perRow) * spacing,
        y: y + Math.floor(i / perRow) * spacing,
      },
      data: nodeData,
    });
  }

  // Create edges
  for (const task of tasks) {
    // dependsOn edges
    for (const dep of task.dependsOn) {
      const sourceId = taskNameToId.get(dep);
      if (sourceId) {
        edges.push({
          id: `${sourceId}-${task.id}`,
          source: sourceId,
          target: task.id,
          type: 'dependency',
          data: { dependencyType: 'dependsOn' as DependencyType },
        });
      }
    }

    // mustRunAfter edges
    for (const dep of task.mustRunAfter) {
      const sourceId = taskNameToId.get(dep);
      if (sourceId) {
        edges.push({
          id: `${sourceId}-${task.id}-mustRunAfter`,
          source: sourceId,
          target: task.id,
          type: 'dependency',
          data: { dependencyType: 'mustRunAfter' as DependencyType },
        });
      }
    }

    // shouldRunAfter edges
    for (const dep of task.shouldRunAfter) {
      const sourceId = taskNameToId.get(dep);
      if (sourceId) {
        edges.push({
          id: `${sourceId}-${task.id}-shouldRunAfter`,
          source: sourceId,
          target: task.id,
          type: 'dependency',
          data: { dependencyType: 'shouldRunAfter' as DependencyType },
        });
      }
    }

    // finalizedBy edges (reverse direction)
    for (const dep of task.finalizedBy) {
      const targetId = taskNameToId.get(dep);
      if (targetId) {
        edges.push({
          id: `${task.id}-${targetId}-finalizedBy`,
          source: task.id,
          target: targetId,
          type: 'dependency',
          data: { dependencyType: 'finalizedBy' as DependencyType },
        });
      }
    }
  }

  return { nodes, edges };
}

/**
 * Read a file and parse it as Gradle
 */
export async function importGradleFile(file: File): Promise<GradleParseResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        resolve(parseGradleKts(content));
      } else {
        reject(new Error('Failed to read file content'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };

    reader.readAsText(file);
  });
}
