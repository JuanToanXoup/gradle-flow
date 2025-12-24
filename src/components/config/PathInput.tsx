import { Folder, File } from 'lucide-react';
import { FormField } from './FormField';

interface PathInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type: 'file' | 'directory';
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function PathInput({
  label,
  value,
  onChange,
  type,
  placeholder,
  required,
  error,
  helperText,
}: PathInputProps) {
  const Icon = type === 'directory' ? Folder : File;

  return (
    <FormField label={label} required={required} error={error} helperText={helperText}>
      <div className="path-input-wrapper">
        <Icon className="path-icon" size={16} />
        <input
          type="text"
          className={`form-input path-input ${error ? 'has-error' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      </div>
    </FormField>
  );
}
