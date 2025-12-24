import { FormField } from './FormField';

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  type?: 'text' | 'number';
  min?: number;
  max?: number;
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder,
  required,
  error,
  helperText,
  type = 'text',
  min,
  max,
}: TextInputProps) {
  return (
    <FormField label={label} required={required} error={error} helperText={helperText}>
      <input
        type={type}
        className={`form-input ${error ? 'has-error' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={min}
        max={max}
      />
    </FormField>
  );
}
