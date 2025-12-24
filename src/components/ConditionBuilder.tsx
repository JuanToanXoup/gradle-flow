import { useCallback } from 'react';
import {
  Plus,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type {
  Condition,
  ConditionOperator,
  ConditionSource,
  ConditionLogic,
  TaskCondition,
  Variable,
} from '../types/gradle';
import {
  createEmptyCondition,
  isUnaryOperator,
  getOperatorOptions,
  getSourceOptions,
  evaluateTaskCondition,
  simulatedEnvVars,
  simulatedProperties,
} from '../utils/conditionUtils';

interface ConditionBuilderProps {
  condition: TaskCondition | undefined;
  onChange: (condition: TaskCondition | undefined) => void;
  variables: Variable[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

interface ConditionRowProps {
  condition: Condition;
  variables: Variable[];
  onChange: (condition: Condition) => void;
  onDelete: () => void;
  showDeleteButton: boolean;
}

function ConditionRow({
  condition,
  variables,
  onChange,
  onDelete,
  showDeleteButton,
}: ConditionRowProps) {
  const operatorOptions = getOperatorOptions();
  const sourceOptions = getSourceOptions();
  const isUnary = isUnaryOperator(condition.operator);

  const handleLeftSourceChange = (source: ConditionSource) => {
    onChange({ ...condition, leftSource: source, leftValue: '' });
  };

  const handleLeftValueChange = (value: string) => {
    onChange({ ...condition, leftValue: value });
  };

  const handleOperatorChange = (operator: ConditionOperator) => {
    onChange({ ...condition, operator });
  };

  const handleRightSourceChange = (source: ConditionSource) => {
    onChange({ ...condition, rightSource: source, rightValue: '' });
  };

  const handleRightValueChange = (value: string) => {
    onChange({ ...condition, rightValue: value });
  };

  // Get suggestions based on source type
  const getLeftSuggestions = (): string[] => {
    switch (condition.leftSource) {
      case 'variable':
        return variables.map((v) => v.name);
      case 'environment':
        return Object.keys(simulatedEnvVars);
      case 'property':
        return Object.keys(simulatedProperties);
      default:
        return [];
    }
  };

  const getRightSuggestions = (): string[] => {
    if (!condition.rightSource) return [];
    switch (condition.rightSource) {
      case 'variable':
        return variables.map((v) => v.name);
      case 'environment':
        return Object.keys(simulatedEnvVars);
      case 'property':
        return Object.keys(simulatedProperties);
      default:
        return [];
    }
  };

  return (
    <div className="condition-row">
      {/* Left side */}
      <div className="condition-part left">
        <select
          className="condition-source-select"
          value={condition.leftSource}
          onChange={(e) => handleLeftSourceChange(e.target.value as ConditionSource)}
        >
          {sourceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          className="condition-value-input"
          value={condition.leftValue}
          onChange={(e) => handleLeftValueChange(e.target.value)}
          placeholder="Enter value..."
          list={`left-suggestions-${condition.id}`}
        />
        <datalist id={`left-suggestions-${condition.id}`}>
          {getLeftSuggestions().map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      </div>

      {/* Operator */}
      <select
        className="condition-operator-select"
        value={condition.operator}
        onChange={(e) => handleOperatorChange(e.target.value as ConditionOperator)}
      >
        {operatorOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Right side (only for binary operators) */}
      {!isUnary && (
        <div className="condition-part right">
          <select
            className="condition-source-select"
            value={condition.rightSource || 'literal'}
            onChange={(e) => handleRightSourceChange(e.target.value as ConditionSource)}
          >
            {sourceOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            className="condition-value-input"
            value={condition.rightValue || ''}
            onChange={(e) => handleRightValueChange(e.target.value)}
            placeholder="Enter value..."
            list={`right-suggestions-${condition.id}`}
          />
          <datalist id={`right-suggestions-${condition.id}`}>
            {getRightSuggestions().map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
      )}

      {/* Delete button */}
      {showDeleteButton && (
        <button
          className="condition-delete-btn"
          onClick={onDelete}
          title="Remove condition"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
}

export function ConditionBuilder({
  condition,
  onChange,
  variables,
  isExpanded,
  onToggleExpanded,
}: ConditionBuilderProps) {
  // Check if condition is currently evaluating to true
  const conditionResult = condition
    ? evaluateTaskCondition(condition, variables)
    : true;

  const hasConditions = condition && condition.conditions.length > 0;

  const handleTypeChange = useCallback(
    (type: 'onlyIf' | 'skipIf') => {
      if (!condition) {
        onChange({
          type,
          conditions: [createEmptyCondition()],
          logic: 'and',
        });
      } else {
        onChange({ ...condition, type });
      }
    },
    [condition, onChange]
  );

  const handleLogicChange = useCallback(
    (logic: ConditionLogic) => {
      if (condition) {
        onChange({ ...condition, logic });
      }
    },
    [condition, onChange]
  );

  const handleAddCondition = useCallback(() => {
    if (!condition) {
      onChange({
        type: 'onlyIf',
        conditions: [createEmptyCondition()],
        logic: 'and',
      });
    } else {
      onChange({
        ...condition,
        conditions: [...condition.conditions, createEmptyCondition()],
      });
    }
  }, [condition, onChange]);

  const handleUpdateCondition = useCallback(
    (index: number, updatedCondition: Condition) => {
      if (condition) {
        const newConditions = [...condition.conditions];
        newConditions[index] = updatedCondition;
        onChange({ ...condition, conditions: newConditions });
      }
    },
    [condition, onChange]
  );

  const handleDeleteCondition = useCallback(
    (index: number) => {
      if (condition) {
        const newConditions = condition.conditions.filter((_, i) => i !== index);
        if (newConditions.length === 0) {
          onChange(undefined);
        } else {
          onChange({ ...condition, conditions: newConditions });
        }
      }
    },
    [condition, onChange]
  );

  const handleClearAll = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return (
    <div className="condition-builder">
      <button className="condition-header" onClick={onToggleExpanded}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="condition-title">Conditional Execution</span>
        {hasConditions && (
          <span
            className={`condition-status ${conditionResult ? 'will-run' : 'will-skip'}`}
          >
            {conditionResult ? (
              <>
                <CheckCircle size={12} />
                {condition?.type === 'onlyIf' ? 'Will run' : 'Will run'}
              </>
            ) : (
              <>
                <AlertCircle size={12} />
                {condition?.type === 'onlyIf' ? 'Condition not met' : 'Will skip'}
              </>
            )}
          </span>
        )}
      </button>

      {isExpanded && (
        <div className="condition-content">
          {/* Condition type selector */}
          <div className="condition-type-selector">
            <label className="condition-type-label">
              <input
                type="radio"
                name="conditionType"
                checked={!condition || condition.type === 'onlyIf'}
                onChange={() => handleTypeChange('onlyIf')}
              />
              <span>Only If</span>
              <span className="condition-type-hint">Run only when conditions are met</span>
            </label>
            <label className="condition-type-label">
              <input
                type="radio"
                name="conditionType"
                checked={condition?.type === 'skipIf'}
                onChange={() => handleTypeChange('skipIf')}
              />
              <span>Skip If</span>
              <span className="condition-type-hint">Skip when conditions are met</span>
            </label>
          </div>

          {/* Conditions list */}
          {hasConditions && (
            <>
              <div className="conditions-list">
                {condition.conditions.map((cond, index) => (
                  <div key={cond.id} className="condition-item">
                    {index > 0 && (
                      <div className="condition-logic-separator">
                        <select
                          className="condition-logic-select"
                          value={condition.logic}
                          onChange={(e) =>
                            handleLogicChange(e.target.value as ConditionLogic)
                          }
                        >
                          <option value="and">AND</option>
                          <option value="or">OR</option>
                        </select>
                      </div>
                    )}
                    <ConditionRow
                      condition={cond}
                      variables={variables}
                      onChange={(updated) => handleUpdateCondition(index, updated)}
                      onDelete={() => handleDeleteCondition(index)}
                      showDeleteButton={condition.conditions.length > 1}
                    />
                  </div>
                ))}
              </div>

              <div className="condition-actions">
                <button className="condition-add-btn" onClick={handleAddCondition}>
                  <Plus size={14} />
                  Add Condition
                </button>
                <button className="condition-clear-btn" onClick={handleClearAll}>
                  <Trash2 size={14} />
                  Clear All
                </button>
              </div>
            </>
          )}

          {/* Empty state / Add first condition */}
          {!hasConditions && (
            <div className="condition-empty">
              <p>No conditions set - task will always run if enabled</p>
              <button className="condition-add-btn" onClick={handleAddCondition}>
                <Plus size={14} />
                Add Condition
              </button>
            </div>
          )}

          {/* Available sources hint */}
          <div className="condition-hint">
            <strong>Available sources:</strong>
            <ul>
              <li><strong>Variable:</strong> {variables.map((v) => v.name).join(', ') || 'None defined'}</li>
              <li><strong>Environment:</strong> NODE_ENV, CI, DEBUG, BUILD_NUMBER, BRANCH_NAME</li>
              <li><strong>Property:</strong> project.version, project.name, build.type</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
