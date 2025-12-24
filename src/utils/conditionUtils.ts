import type {
  Condition,
  ConditionOperator,
  ConditionSource,
  TaskCondition,
  Variable,
} from '../types/gradle';

/**
 * Simulated environment variables for demo purposes
 */
export const simulatedEnvVars: Record<string, string> = {
  NODE_ENV: 'development',
  CI: 'false',
  DEBUG: 'true',
  BUILD_NUMBER: '42',
  BRANCH_NAME: 'main',
  USER: 'developer',
  HOME: '/home/developer',
  PATH: '/usr/bin:/bin',
};

/**
 * Simulated project properties for demo purposes
 */
export const simulatedProperties: Record<string, string> = {
  'project.version': '1.0.0',
  'project.name': 'gradle-flow',
  'build.type': 'debug',
  'test.enabled': 'true',
  'deploy.environment': 'staging',
};

/**
 * Resolve a value based on its source type
 */
export function resolveValue(
  source: ConditionSource,
  value: string,
  variables: Variable[]
): string {
  switch (source) {
    case 'variable': {
      const variable = variables.find((v) => v.name === value);
      return variable?.value ?? '';
    }
    case 'environment':
      return simulatedEnvVars[value] ?? '';
    case 'property':
      return simulatedProperties[value] ?? '';
    case 'literal':
    default:
      return value;
  }
}

/**
 * Check if an operator is unary (doesn't need right side)
 */
export function isUnaryOperator(operator: ConditionOperator): boolean {
  return ['isEmpty', 'isNotEmpty', 'isTrue', 'isFalse'].includes(operator);
}

/**
 * Evaluate a single condition
 */
export function evaluateCondition(
  condition: Condition,
  variables: Variable[]
): boolean {
  const leftValue = resolveValue(condition.leftSource, condition.leftValue, variables);
  const rightValue = condition.rightSource && condition.rightValue
    ? resolveValue(condition.rightSource, condition.rightValue, variables)
    : '';

  switch (condition.operator) {
    case 'equals':
      return leftValue === rightValue;

    case 'notEquals':
      return leftValue !== rightValue;

    case 'contains':
      return leftValue.includes(rightValue);

    case 'notContains':
      return !leftValue.includes(rightValue);

    case 'startsWith':
      return leftValue.startsWith(rightValue);

    case 'endsWith':
      return leftValue.endsWith(rightValue);

    case 'matches':
      try {
        const regex = new RegExp(rightValue);
        return regex.test(leftValue);
      } catch {
        return false;
      }

    case 'greaterThan':
      return parseFloat(leftValue) > parseFloat(rightValue);

    case 'lessThan':
      return parseFloat(leftValue) < parseFloat(rightValue);

    case 'greaterOrEqual':
      return parseFloat(leftValue) >= parseFloat(rightValue);

    case 'lessOrEqual':
      return parseFloat(leftValue) <= parseFloat(rightValue);

    case 'isEmpty':
      return leftValue.trim() === '';

    case 'isNotEmpty':
      return leftValue.trim() !== '';

    case 'isTrue':
      return leftValue.toLowerCase() === 'true' || leftValue === '1';

    case 'isFalse':
      return leftValue.toLowerCase() === 'false' || leftValue === '0' || leftValue === '';

    default:
      return false;
  }
}

/**
 * Evaluate a task condition (combination of conditions with logic)
 */
export function evaluateTaskCondition(
  taskCondition: TaskCondition,
  variables: Variable[]
): boolean {
  if (taskCondition.conditions.length === 0) {
    // No conditions means always true for onlyIf, always false for skipIf
    return taskCondition.type === 'onlyIf';
  }

  const results = taskCondition.conditions.map((condition) =>
    evaluateCondition(condition, variables)
  );

  const combinedResult = taskCondition.logic === 'and'
    ? results.every((r) => r)
    : results.some((r) => r);

  return combinedResult;
}

/**
 * Determine if a task should be executed based on its condition
 */
export function shouldExecuteTask(
  condition: TaskCondition | undefined,
  variables: Variable[]
): { execute: boolean; reason?: string } {
  if (!condition || condition.conditions.length === 0) {
    return { execute: true };
  }

  const conditionResult = evaluateTaskCondition(condition, variables);

  if (condition.type === 'onlyIf') {
    // onlyIf: execute if condition is true
    return {
      execute: conditionResult,
      reason: conditionResult
        ? undefined
        : 'Condition not met (onlyIf evaluated to false)',
    };
  } else {
    // skipIf: skip if condition is true
    return {
      execute: !conditionResult,
      reason: conditionResult
        ? 'Skipped due to skipIf condition'
        : undefined,
    };
  }
}

/**
 * Generate a unique condition ID
 */
let conditionIdCounter = 0;
export function generateConditionId(): string {
  return `cond_${++conditionIdCounter}_${Date.now()}`;
}

/**
 * Create a new empty condition
 */
export function createEmptyCondition(): Condition {
  return {
    id: generateConditionId(),
    leftSource: 'variable',
    leftValue: '',
    operator: 'equals',
    rightSource: 'literal',
    rightValue: '',
  };
}

/**
 * Create a new task condition
 */
export function createTaskCondition(type: 'onlyIf' | 'skipIf'): TaskCondition {
  return {
    type,
    conditions: [],
    logic: 'and',
  };
}

/**
 * Get human-readable label for an operator
 */
export function getOperatorLabel(operator: ConditionOperator): string {
  const labels: Record<ConditionOperator, string> = {
    equals: 'equals',
    notEquals: 'does not equal',
    contains: 'contains',
    notContains: 'does not contain',
    startsWith: 'starts with',
    endsWith: 'ends with',
    matches: 'matches regex',
    greaterThan: 'is greater than',
    lessThan: 'is less than',
    greaterOrEqual: 'is greater or equal to',
    lessOrEqual: 'is less or equal to',
    isEmpty: 'is empty',
    isNotEmpty: 'is not empty',
    isTrue: 'is true',
    isFalse: 'is false',
  };
  return labels[operator];
}

/**
 * Get human-readable label for a source type
 */
export function getSourceLabel(source: ConditionSource): string {
  const labels: Record<ConditionSource, string> = {
    variable: 'Variable',
    environment: 'Environment',
    property: 'Property',
    literal: 'Value',
  };
  return labels[source];
}

/**
 * Get available operators grouped by type
 */
export interface OperatorOption {
  value: ConditionOperator;
  label: string;
  group: string;
}

export function getOperatorOptions(): OperatorOption[] {
  return [
    // String comparisons
    { value: 'equals', label: 'Equals', group: 'Comparison' },
    { value: 'notEquals', label: 'Not Equals', group: 'Comparison' },
    { value: 'contains', label: 'Contains', group: 'String' },
    { value: 'notContains', label: 'Not Contains', group: 'String' },
    { value: 'startsWith', label: 'Starts With', group: 'String' },
    { value: 'endsWith', label: 'Ends With', group: 'String' },
    { value: 'matches', label: 'Matches Regex', group: 'String' },
    // Numeric comparisons
    { value: 'greaterThan', label: 'Greater Than', group: 'Numeric' },
    { value: 'lessThan', label: 'Less Than', group: 'Numeric' },
    { value: 'greaterOrEqual', label: 'Greater or Equal', group: 'Numeric' },
    { value: 'lessOrEqual', label: 'Less or Equal', group: 'Numeric' },
    // Unary checks
    { value: 'isEmpty', label: 'Is Empty', group: 'Check' },
    { value: 'isNotEmpty', label: 'Is Not Empty', group: 'Check' },
    { value: 'isTrue', label: 'Is True', group: 'Check' },
    { value: 'isFalse', label: 'Is False', group: 'Check' },
  ];
}

/**
 * Get available source options
 */
export interface SourceOption {
  value: ConditionSource;
  label: string;
}

export function getSourceOptions(): SourceOption[] {
  return [
    { value: 'variable', label: 'Variable' },
    { value: 'environment', label: 'Environment Var' },
    { value: 'property', label: 'Property' },
    { value: 'literal', label: 'Literal Value' },
  ];
}

/**
 * Format a condition as a human-readable string
 */
export function formatCondition(condition: Condition): string {
  const leftPart = `${getSourceLabel(condition.leftSource)}(${condition.leftValue})`;
  const operatorPart = getOperatorLabel(condition.operator);

  if (isUnaryOperator(condition.operator)) {
    return `${leftPart} ${operatorPart}`;
  }

  const rightPart = condition.rightSource && condition.rightValue
    ? `${getSourceLabel(condition.rightSource)}(${condition.rightValue})`
    : '';

  return `${leftPart} ${operatorPart} ${rightPart}`;
}

/**
 * Format a task condition as a human-readable string
 */
export function formatTaskCondition(taskCondition: TaskCondition): string {
  if (taskCondition.conditions.length === 0) {
    return taskCondition.type === 'onlyIf' ? 'Always run' : 'Never skip';
  }

  const conditionStrings = taskCondition.conditions.map(formatCondition);
  const joined = conditionStrings.join(` ${taskCondition.logic.toUpperCase()} `);

  return `${taskCondition.type === 'onlyIf' ? 'Only if' : 'Skip if'}: ${joined}`;
}
