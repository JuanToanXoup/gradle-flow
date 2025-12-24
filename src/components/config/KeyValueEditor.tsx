import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormField } from './FormField';

interface KeyValueEditorProps {
  label: string;
  value: Record<string, string>;
  onChange: (value: Record<string, string>) => void;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function KeyValueEditor({
  label,
  value,
  onChange,
  required,
  error,
  helperText,
}: KeyValueEditorProps) {
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');

  const entries = Object.entries(value);

  const addEntry = () => {
    if (newKey.trim() && newValue.trim()) {
      onChange({ ...value, [newKey.trim()]: newValue.trim() });
      setNewKey('');
      setNewValue('');
    }
  };

  const removeEntry = (key: string) => {
    const newObj = { ...value };
    delete newObj[key];
    onChange(newObj);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addEntry();
    }
  };

  return (
    <FormField label={label} required={required} error={error} helperText={helperText}>
      <div className="keyvalue-editor">
        <div className="keyvalue-items">
          {entries.map(([key, val]) => (
            <div key={key} className="keyvalue-item">
              <span className="keyvalue-key">{key}</span>
              <span className="keyvalue-separator">=</span>
              <span className="keyvalue-value">{val}</span>
              <button
                type="button"
                className="keyvalue-remove"
                onClick={() => removeEntry(key)}
                aria-label="Remove entry"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="keyvalue-add">
          <input
            type="text"
            className="form-input keyvalue-input"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Key"
          />
          <span className="keyvalue-separator">=</span>
          <input
            type="text"
            className="form-input keyvalue-input"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Value"
          />
          <button
            type="button"
            className="keyvalue-add-button"
            onClick={addEntry}
            disabled={!newKey.trim() || !newValue.trim()}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </FormField>
  );
}
