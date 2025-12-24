import { Check } from 'lucide-react';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  helperText?: string;
}

export function Checkbox({ label, checked, onChange, helperText }: CheckboxProps) {
  return (
    <div className="form-field">
      <label className="checkbox-label">
        <div className={`checkbox ${checked ? 'checked' : ''}`} onClick={() => onChange(!checked)}>
          {checked && <Check size={14} />}
        </div>
        <span className="checkbox-text">{label}</span>
      </label>
      {helperText && <div className="form-helper">{helperText}</div>}
    </div>
  );
}
