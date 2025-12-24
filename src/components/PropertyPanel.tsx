import { useCallback, useMemo, useState } from 'react';
import { Settings, AlertTriangle } from 'lucide-react';
import {
  TextInput,
  Checkbox,
  Select,
  ListEditor,
  KeyValueEditor,
  NodePicker,
  VariableInput,
} from './config';
import { ConditionBuilder } from './ConditionBuilder';
import {
  type GradleTaskNode,
  type GradleTaskNodeData,
  type PropertyFieldDef,
  type Variable,
  type TaskCondition,
  taskPropertySchemas,
  commonPropertyFields,
} from '../types/gradle';

interface PropertyPanelProps {
  selectedNode: GradleTaskNode | null;
  allNodes: GradleTaskNode[];
  variables: Variable[];
  onNodeUpdate: (nodeId: string, updates: Partial<GradleTaskNodeData>) => void;
  onNodeDelete: (nodeId: string) => void;
}

export function PropertyPanel({
  selectedNode,
  allNodes,
  variables,
  onNodeUpdate,
  onNodeDelete,
}: PropertyPanelProps) {
  const [conditionExpanded, setConditionExpanded] = useState(false);

  // Get the property schema for the selected node's task type
  const taskSchema = useMemo(() => {
    if (!selectedNode) return [];
    return taskPropertySchemas[selectedNode.data.taskType] || [];
  }, [selectedNode]);

  // Handle condition changes
  const handleConditionChange = useCallback(
    (condition: TaskCondition | undefined) => {
      if (!selectedNode) return;
      onNodeUpdate(selectedNode.id, { condition });
    },
    [selectedNode, onNodeUpdate]
  );

  // Get available nodes for the node picker (excluding the selected node)
  const availableNodes = useMemo(() => {
    return allNodes
      .filter((n) => n.type === 'gradleTask')
      .map((n) => ({
        id: n.id,
        label: n.data.taskName,
      }));
  }, [allNodes]);

  // Handle field value changes
  const handleFieldChange = useCallback(
    (fieldName: string, value: unknown, isConfig = false) => {
      if (!selectedNode) return;

      if (isConfig) {
        // Update config sub-object
        const newConfig = {
          ...((selectedNode.data.config as Record<string, unknown>) || {}),
          [fieldName]: value,
        };
        onNodeUpdate(selectedNode.id, { config: newConfig });
      } else {
        // Update top-level field
        onNodeUpdate(selectedNode.id, { [fieldName]: value });
      }
    },
    [selectedNode, onNodeUpdate]
  );

  // Get current value for a field
  const getFieldValue = useCallback(
    (fieldName: string, isConfig = false): unknown => {
      if (!selectedNode) return undefined;

      if (isConfig) {
        const config = selectedNode.data.config as Record<string, unknown> | undefined;
        return config?.[fieldName];
      }
      return selectedNode.data[fieldName];
    },
    [selectedNode]
  );

  // Get error for a field
  const getFieldError = useCallback(
    (fieldName: string): string | undefined => {
      if (!selectedNode?.data.errors) return undefined;
      const error = selectedNode.data.errors.find((e) => e.field === fieldName);
      return error?.message;
    },
    [selectedNode]
  );

  // Render a field based on its type
  const renderField = useCallback(
    (field: PropertyFieldDef, isConfig = false) => {
      const value = getFieldValue(field.name, isConfig);
      const error = getFieldError(field.name);

      // Use VariableInput for text fields that support variable references
      const supportsVariables = ['text', 'file', 'directory'].includes(field.type);

      switch (field.type) {
        case 'text':
          return supportsVariables && field.name !== 'taskName' ? (
            <VariableInput
              key={field.name}
              label={field.label}
              value={(value as string) || ''}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              variables={variables}
              placeholder={field.placeholder}
              required={field.required}
              error={error}
              helperText={field.helperText}
            />
          ) : (
            <TextInput
              key={field.name}
              label={field.label}
              value={(value as string) || ''}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              placeholder={field.placeholder}
              required={field.required}
              error={error}
              helperText={field.helperText}
            />
          );

        case 'number':
          return (
            <TextInput
              key={field.name}
              label={field.label}
              value={value !== undefined ? String(value) : ''}
              onChange={(v) => handleFieldChange(field.name, v ? Number(v) : undefined, isConfig)}
              placeholder={field.placeholder}
              required={field.required}
              error={error}
              helperText={field.helperText}
              type="number"
              min={field.min}
              max={field.max}
            />
          );

        case 'checkbox':
          return (
            <Checkbox
              key={field.name}
              label={field.label}
              checked={(value as boolean) ?? (field.name === 'enabled' ? true : false)}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              helperText={field.helperText}
            />
          );

        case 'select':
          return (
            <Select
              key={field.name}
              label={field.label}
              value={(value as string) || ''}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              options={field.options || []}
              placeholder={`Select ${field.label.toLowerCase()}`}
              required={field.required}
              error={error}
              helperText={field.helperText}
            />
          );

        case 'file':
        case 'directory':
          return (
            <VariableInput
              key={field.name}
              label={field.label}
              value={(value as string) || ''}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              variables={variables}
              placeholder={field.placeholder}
              required={field.required}
              error={error}
              helperText={field.helperText || `Supports variables like \${buildDir}`}
            />
          );

        case 'list':
          return (
            <ListEditor
              key={field.name}
              label={field.label}
              value={(value as string[]) || []}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              placeholder={field.placeholder}
              required={field.required}
              error={error}
              helperText={field.helperText}
            />
          );

        case 'keyvalue':
          return (
            <KeyValueEditor
              key={field.name}
              label={field.label}
              value={(value as Record<string, string>) || {}}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              required={field.required}
              error={error}
              helperText={field.helperText}
            />
          );

        case 'nodepicker':
          return (
            <NodePicker
              key={field.name}
              label={field.label}
              value={(value as string[]) || []}
              onChange={(v) => handleFieldChange(field.name, v, isConfig)}
              availableNodes={availableNodes}
              currentNodeId={selectedNode?.id || ''}
              required={field.required}
              error={error}
              helperText={field.helperText}
            />
          );

        default:
          return null;
      }
    },
    [getFieldValue, getFieldError, handleFieldChange, availableNodes, selectedNode, variables]
  );

  // Empty state
  if (!selectedNode) {
    return (
      <div className="property-panel empty">
        <Settings size={32} className="empty-icon" />
        <p>Select a task to edit its properties</p>
        <p className="hint">Click on any node in the graph</p>
      </div>
    );
  }

  // Check if there are any validation errors
  const hasErrors = (selectedNode.data.errors?.length || 0) > 0;

  return (
    <div className="property-panel">
      <div className="panel-header">
        <h2>Task Configuration</h2>
        <span className="task-type-badge">{selectedNode.data.taskType}</span>
      </div>

      {hasErrors && (
        <div className="validation-banner">
          <AlertTriangle size={16} />
          <span>This task has validation errors</span>
        </div>
      )}

      <div className="panel-content">
        {/* Common properties section */}
        <div className="property-section">
          <h3 className="section-title">General</h3>
          {commonPropertyFields
            .filter((f) => f.name !== 'dependsOn') // dependsOn rendered in task-specific section
            .map((field) => renderField(field))}
        </div>

        {/* Task-specific properties section */}
        {taskSchema.length > 0 && (
          <div className="property-section">
            <h3 className="section-title">{selectedNode.data.taskType} Configuration</h3>
            {taskSchema.map((field) => renderField(field, true))}
          </div>
        )}

        {/* Dependencies section */}
        <div className="property-section">
          <h3 className="section-title">Dependencies</h3>
          {renderField(commonPropertyFields.find((f) => f.name === 'dependsOn')!)}
        </div>

        {/* Conditional execution section */}
        <div className="property-section">
          <ConditionBuilder
            condition={selectedNode.data.condition}
            onChange={handleConditionChange}
            variables={variables}
            isExpanded={conditionExpanded}
            onToggleExpanded={() => setConditionExpanded((prev) => !prev)}
          />
        </div>
      </div>

      <div className="panel-footer">
        <button
          className="delete-button"
          onClick={() => onNodeDelete(selectedNode.id)}
        >
          Delete Task
        </button>
      </div>
    </div>
  );
}
