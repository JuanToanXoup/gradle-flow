import type { Variable } from '../types/gradle';

/**
 * Regular expression to match variable references like ${varName}
 */
export const VARIABLE_PATTERN = /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g;

/**
 * Extract all variable references from a string
 */
export function extractVariableReferences(text: string): string[] {
  const matches: string[] = [];
  let match;

  while ((match = VARIABLE_PATTERN.exec(text)) !== null) {
    matches.push(match[1]);
  }

  // Reset regex lastIndex for next use
  VARIABLE_PATTERN.lastIndex = 0;

  return [...new Set(matches)];
}

/**
 * Check if a string contains variable references
 */
export function hasVariableReferences(text: string): boolean {
  VARIABLE_PATTERN.lastIndex = 0;
  const result = VARIABLE_PATTERN.test(text);
  VARIABLE_PATTERN.lastIndex = 0;
  return result;
}

/**
 * Resolve variable references in a string
 */
export function resolveVariables(
  text: string,
  variables: Variable[]
): { resolved: string; unresolvedVars: string[] } {
  const unresolvedVars: string[] = [];
  const variableMap = new Map(variables.map((v) => [v.name, v.value]));

  const resolved = text.replace(VARIABLE_PATTERN, (match, varName) => {
    if (variableMap.has(varName)) {
      return variableMap.get(varName)!;
    }
    unresolvedVars.push(varName);
    return match;
  });

  VARIABLE_PATTERN.lastIndex = 0;
  return { resolved, unresolvedVars };
}

/**
 * Validate a variable name
 */
export function isValidVariableName(name: string): boolean {
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Generate a unique variable ID
 */
let variableIdCounter = 0;
export function generateVariableId(): string {
  return `var_${++variableIdCounter}_${Date.now()}`;
}

/**
 * Format a variable reference for display
 */
export function formatVariableReference(varName: string): string {
  return `\${${varName}}`;
}

/**
 * Parse a value based on variable type
 */
export function parseVariableValue(
  value: string,
  type: Variable['type']
): { valid: boolean; error?: string } {
  switch (type) {
    case 'number':
      if (value === '') return { valid: true };
      const num = Number(value);
      if (isNaN(num)) {
        return { valid: false, error: 'Must be a valid number' };
      }
      return { valid: true };

    case 'boolean':
      if (!['true', 'false', ''].includes(value.toLowerCase())) {
        return { valid: false, error: 'Must be true or false' };
      }
      return { valid: true };

    case 'list':
      // List values are comma-separated
      return { valid: true };

    case 'path':
    case 'string':
    default:
      return { valid: true };
  }
}

/**
 * Get variable type icon/color
 */
export const variableTypeStyles: Record<
  Variable['type'],
  { color: string; icon: string }
> = {
  string: { color: '#22c55e', icon: 'Aa' },
  number: { color: '#3b82f6', icon: '#' },
  boolean: { color: '#f59e0b', icon: '⊕' },
  path: { color: '#8b5cf6', icon: '/' },
  list: { color: '#ec4899', icon: '[]' },
};

/**
 * Find variables used in an object (recursively)
 */
export function findVariablesInObject(obj: unknown): string[] {
  const variables: string[] = [];

  function traverse(value: unknown): void {
    if (typeof value === 'string') {
      variables.push(...extractVariableReferences(value));
    } else if (Array.isArray(value)) {
      value.forEach(traverse);
    } else if (value && typeof value === 'object') {
      Object.values(value).forEach(traverse);
    }
  }

  traverse(obj);
  return [...new Set(variables)];
}

/**
 * Check if all variable references in an object are defined
 */
export function validateVariableReferences(
  obj: unknown,
  variables: Variable[]
): { valid: boolean; missingVars: string[] } {
  const usedVars = findVariablesInObject(obj);
  const definedVarNames = new Set(variables.map((v) => v.name));
  const missingVars = usedVars.filter((name) => !definedVarNames.has(name));

  return {
    valid: missingVars.length === 0,
    missingVars,
  };
}
