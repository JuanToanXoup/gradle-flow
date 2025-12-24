import { useState, useCallback } from 'react';
import { Variable, Plus, Trash2, ChevronDown, ChevronRight, Lock } from 'lucide-react';
import { TextInput, Select } from './config';
import type { Variable as VariableType, VariableType as VarType } from '../types/gradle';
import {
  isValidVariableName,
  generateVariableId,
  parseVariableValue,
  variableTypeStyles,
} from '../utils/variableUtils';

interface VariablesPanelProps {
  variables: VariableType[];
  onVariablesChange: (variables: VariableType[]) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const variableTypeOptions = [
  { value: 'string', label: 'String' },
  { value: 'number', label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'path', label: 'Path' },
  { value: 'list', label: 'List' },
];

export function VariablesPanel({
  variables,
  onVariablesChange,
  isExpanded,
  onToggleExpanded,
}: VariablesPanelProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newVarName, setNewVarName] = useState('');
  const [newVarType, setNewVarType] = useState<VarType>('string');
  const [nameError, setNameError] = useState<string | null>(null);

  // Separate system and user variables
  const systemVars = variables.filter((v) => v.isSystem);
  const userVars = variables.filter((v) => !v.isSystem);

  const handleAddVariable = useCallback(() => {
    if (!newVarName.trim()) {
      setNameError('Variable name is required');
      return;
    }

    if (!isValidVariableName(newVarName)) {
      setNameError('Invalid name. Use letters, numbers, and underscores');
      return;
    }

    if (variables.some((v) => v.name === newVarName)) {
      setNameError('A variable with this name already exists');
      return;
    }

    const newVar: VariableType = {
      id: generateVariableId(),
      name: newVarName,
      type: newVarType,
      defaultValue: '',
      value: '',
    };

    onVariablesChange([...variables, newVar]);
    setNewVarName('');
    setNewVarType('string');
    setNameError(null);
    setEditingId(newVar.id);
  }, [newVarName, newVarType, variables, onVariablesChange]);

  const handleUpdateVariable = useCallback(
    (id: string, updates: Partial<VariableType>) => {
      onVariablesChange(
        variables.map((v) => (v.id === id ? { ...v, ...updates } : v))
      );
    },
    [variables, onVariablesChange]
  );

  const handleDeleteVariable = useCallback(
    (id: string) => {
      onVariablesChange(variables.filter((v) => v.id !== id));
      if (editingId === id) {
        setEditingId(null);
      }
    },
    [variables, onVariablesChange, editingId]
  );

  const handleValueChange = useCallback(
    (id: string, value: string, varType: VarType) => {
      const validation = parseVariableValue(value, varType);
      if (validation.valid) {
        handleUpdateVariable(id, { value, defaultValue: value });
      }
    },
    [handleUpdateVariable]
  );

  return (
    <div className="variables-panel">
      <button className="variables-header" onClick={onToggleExpanded}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Variable size={16} />
        <span className="variables-title">Variables</span>
        <span className="variables-count">{variables.length}</span>
      </button>

      {isExpanded && (
        <div className="variables-content">
          {/* Add new variable */}
          <div className="add-variable-form">
            <div className="add-variable-inputs">
              <input
                type="text"
                className={`form-input add-var-name ${nameError ? 'has-error' : ''}`}
                placeholder="variableName"
                value={newVarName}
                onChange={(e) => {
                  setNewVarName(e.target.value);
                  setNameError(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddVariable()}
              />
              <select
                className="form-select add-var-type"
                value={newVarType}
                onChange={(e) => setNewVarType(e.target.value as VarType)}
              >
                {variableTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                className="add-var-button"
                onClick={handleAddVariable}
                title="Add variable"
              >
                <Plus size={16} />
              </button>
            </div>
            {nameError && <div className="add-var-error">{nameError}</div>}
          </div>

          {/* User variables */}
          {userVars.length > 0 && (
            <div className="variables-section">
              <div className="variables-section-title">User Variables</div>
              <div className="variables-list">
                {userVars.map((variable) => (
                  <VariableItem
                    key={variable.id}
                    variable={variable}
                    isEditing={editingId === variable.id}
                    onEdit={() =>
                      setEditingId(editingId === variable.id ? null : variable.id)
                    }
                    onUpdate={(updates) =>
                      handleUpdateVariable(variable.id, updates)
                    }
                    onValueChange={(value) =>
                      handleValueChange(variable.id, value, variable.type)
                    }
                    onDelete={() => handleDeleteVariable(variable.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* System variables */}
          <div className="variables-section">
            <div className="variables-section-title">
              <Lock size={12} />
              System Variables
            </div>
            <div className="variables-list">
              {systemVars.map((variable) => (
                <VariableItem
                  key={variable.id}
                  variable={variable}
                  isEditing={editingId === variable.id}
                  onEdit={() =>
                    setEditingId(editingId === variable.id ? null : variable.id)
                  }
                  onUpdate={(updates) =>
                    handleUpdateVariable(variable.id, updates)
                  }
                  onValueChange={(value) =>
                    handleValueChange(variable.id, value, variable.type)
                  }
                  isSystem
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface VariableItemProps {
  variable: VariableType;
  isEditing: boolean;
  onEdit: () => void;
  onUpdate: (updates: Partial<VariableType>) => void;
  onValueChange: (value: string) => void;
  onDelete?: () => void;
  isSystem?: boolean;
}

function VariableItem({
  variable,
  isEditing,
  onEdit,
  onUpdate,
  onValueChange,
  onDelete,
  isSystem,
}: VariableItemProps) {
  const style = variableTypeStyles[variable.type];

  return (
    <div className={`variable-item ${isEditing ? 'editing' : ''}`}>
      <div className="variable-item-header" onClick={onEdit}>
        <span
          className="variable-type-badge"
          style={{ background: `${style.color}20`, color: style.color }}
        >
          {style.icon}
        </span>
        <span className="variable-name">${`{${variable.name}}`}</span>
        <span className="variable-value-preview">
          {variable.value || <em>empty</em>}
        </span>
        {!isSystem && onDelete && (
          <button
            className="variable-delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete variable"
          >
            <Trash2 size={14} />
          </button>
        )}
        {isSystem && <Lock size={12} className="variable-lock" />}
      </div>

      {isEditing && (
        <div className="variable-item-details">
          {!isSystem && (
            <>
              <TextInput
                label="Name"
                value={variable.name}
                onChange={(name) => onUpdate({ name })}
                placeholder="variableName"
              />
              <Select
                label="Type"
                value={variable.type}
                onChange={(type) => onUpdate({ type: type as VarType })}
                options={variableTypeOptions}
              />
            </>
          )}
          <TextInput
            label="Value"
            value={variable.value}
            onChange={onValueChange}
            placeholder={`Enter ${variable.type} value`}
          />
          <TextInput
            label="Description"
            value={variable.description || ''}
            onChange={(description) => onUpdate({ description })}
            placeholder="Optional description"
          />
        </div>
      )}
    </div>
  );
}
