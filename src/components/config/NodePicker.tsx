import { useState } from 'react';
import { Plus, X, Link } from 'lucide-react';
import { FormField } from './FormField';

interface NodeOption {
  id: string;
  label: string;
}

interface NodePickerProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  availableNodes: NodeOption[];
  currentNodeId: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function NodePicker({
  label,
  value,
  onChange,
  availableNodes,
  currentNodeId,
  required,
  error,
  helperText,
}: NodePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Filter out current node and already selected nodes
  const selectableNodes = availableNodes.filter(
    (node) => node.id !== currentNodeId && !value.includes(node.id)
  );

  const addNode = (nodeId: string) => {
    onChange([...value, nodeId]);
    setIsOpen(false);
  };

  const removeNode = (nodeId: string) => {
    onChange(value.filter((id) => id !== nodeId));
  };

  const getNodeLabel = (nodeId: string) => {
    const node = availableNodes.find((n) => n.id === nodeId);
    return node?.label || nodeId;
  };

  return (
    <FormField label={label} required={required} error={error} helperText={helperText}>
      <div className="node-picker">
        <div className="node-picker-items">
          {value.map((nodeId) => (
            <div key={nodeId} className="node-picker-item">
              <Link size={12} />
              <span className="node-picker-label">{getNodeLabel(nodeId)}</span>
              <button
                type="button"
                className="node-picker-remove"
                onClick={() => removeNode(nodeId)}
                aria-label="Remove dependency"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="node-picker-add">
          {isOpen ? (
            <div className="node-picker-dropdown">
              {selectableNodes.length === 0 ? (
                <div className="node-picker-empty">No available tasks</div>
              ) : (
                selectableNodes.map((node) => (
                  <button
                    key={node.id}
                    type="button"
                    className="node-picker-option"
                    onClick={() => addNode(node.id)}
                  >
                    {node.label}
                  </button>
                ))
              )}
              <button
                type="button"
                className="node-picker-cancel"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="node-picker-trigger"
              onClick={() => setIsOpen(true)}
              disabled={selectableNodes.length === 0}
            >
              <Plus size={14} />
              <span>Add Dependency</span>
            </button>
          )}
        </div>
      </div>
    </FormField>
  );
}
