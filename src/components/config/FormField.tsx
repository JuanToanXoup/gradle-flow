import { AlertCircle } from 'lucide-react';
import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
}

export function FormField({ label, required, error, helperText, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>
      {children}
      {error && (
        <div className="form-error">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
      {helperText && !error && (
        <div className="form-helper">{helperText}</div>
      )}
    </div>
  );
}
