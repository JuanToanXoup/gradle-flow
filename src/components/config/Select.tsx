import { ChevronDown } from 'lucide-react';
import { FormField } from './FormField';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
}

export function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  required,
  error,
  helperText,
}: SelectProps) {
  return (
    <FormField label={label} required={required} error={error} helperText={helperText}>
      <div className="select-wrapper">
        <select
          className={`form-select ${error ? 'has-error' : ''}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <ChevronDown className="select-icon" size={16} />
      </div>
    </FormField>
  );
}
