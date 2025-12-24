import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { FormField } from './FormField';

interface ListEditorProps {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function ListEditor({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  helperText,
}: ListEditorProps) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      onChange([...value, newItem.trim()]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addItem();
    }
  };

  return (
    <FormField label={label} required={required} error={error} helperText={helperText}>
      <div className="list-editor">
        <div className="list-items">
          {value.map((item, index) => (
            <div key={index} className="list-item">
              <span className="list-item-text">{item}</span>
              <button
                type="button"
                className="list-item-remove"
                onClick={() => removeItem(index)}
                aria-label="Remove item"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="list-add">
          <input
            type="text"
            className="form-input"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="list-add-button"
            onClick={addItem}
            disabled={!newItem.trim()}
          >
            <Plus size={16} />
          </button>
        </div>
      </div>
    </FormField>
  );
}
