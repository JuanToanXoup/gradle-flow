import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Variable, AlertCircle } from 'lucide-react';
import type { Variable as VariableType } from '../../types/gradle';
import {
  hasVariableReferences,
  extractVariableReferences,
  variableTypeStyles,
  formatVariableReference,
} from '../../utils/variableUtils';

interface VariableInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  variables: VariableType[];
  placeholder?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  type?: 'text' | 'number';
  multiline?: boolean;
}

export function VariableInput({
  label,
  value,
  onChange,
  variables,
  placeholder,
  required,
  error,
  helperText,
  type = 'text',
  multiline = false,
}: VariableInputProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check for unresolved variable references
  const unresolvedVars = useMemo(() => {
    const refs = extractVariableReferences(value);
    const definedNames = new Set(variables.map((v) => v.name));
    return refs.filter((name) => !definedNames.has(name));
  }, [value, variables]);

  // Filter variables based on input
  const filteredVariables = useMemo(() => {
    if (!filterText) return variables;
    const lower = filterText.toLowerCase();
    return variables.filter(
      (v) =>
        v.name.toLowerCase().includes(lower) ||
        v.description?.toLowerCase().includes(lower)
    );
  }, [variables, filterText]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Detect when user types ${ to show autocomplete
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const newValue = e.target.value;
      const position = e.target.selectionStart || 0;
      setCursorPosition(position);
      onChange(newValue);

      // Check if user just typed ${
      const textBeforeCursor = newValue.slice(0, position);
      const lastDollarBrace = textBeforeCursor.lastIndexOf('${');

      if (lastDollarBrace !== -1) {
        const textAfterDollarBrace = textBeforeCursor.slice(lastDollarBrace + 2);
        // If no closing brace yet, show autocomplete
        if (!textAfterDollarBrace.includes('}')) {
          setFilterText(textAfterDollarBrace);
          setShowDropdown(true);
          return;
        }
      }

      setShowDropdown(false);
    },
    [onChange]
  );

  // Insert a variable at cursor position
  const insertVariable = useCallback(
    (variable: VariableType) => {
      const input = inputRef.current;
      if (!input) return;

      const textBeforeCursor = value.slice(0, cursorPosition);
      const textAfterCursor = value.slice(cursorPosition);

      // Find the ${ that triggered the autocomplete
      const lastDollarBrace = textBeforeCursor.lastIndexOf('${');

      let newValue: string;
      let newCursorPos: number;

      if (lastDollarBrace !== -1 && !textBeforeCursor.slice(lastDollarBrace).includes('}')) {
        // Replace from ${ to cursor with the variable reference
        const beforeRef = value.slice(0, lastDollarBrace);
        const varRef = formatVariableReference(variable.name);
        newValue = beforeRef + varRef + textAfterCursor;
        newCursorPos = beforeRef.length + varRef.length;
      } else {
        // Insert full variable reference at cursor
        const varRef = formatVariableReference(variable.name);
        newValue = textBeforeCursor + varRef + textAfterCursor;
        newCursorPos = cursorPosition + varRef.length;
      }

      onChange(newValue);
      setShowDropdown(false);
      setFilterText('');

      // Restore focus and cursor position
      setTimeout(() => {
        input.focus();
        input.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, cursorPosition, onChange]
  );

  // Toggle dropdown manually
  const toggleDropdown = useCallback(() => {
    setShowDropdown((prev) => !prev);
    setFilterText('');
  }, []);

  const hasVarRefs = hasVariableReferences(value);
  const hasUnresolved = unresolvedVars.length > 0;

  const InputComponent = multiline ? 'textarea' : 'input';

  return (
    <div className="form-field variable-input-field">
      <label className="form-label">
        {label}
        {required && <span className="required">*</span>}
      </label>

      <div className="variable-input-wrapper" ref={dropdownRef}>
        <div className={`variable-input-container ${hasVarRefs ? 'has-vars' : ''}`}>
          <InputComponent
            ref={inputRef as React.RefObject<HTMLInputElement & HTMLTextAreaElement>}
            type={type}
            className={`form-input variable-input ${error || hasUnresolved ? 'has-error' : ''}`}
            value={value}
            onChange={handleInputChange}
            placeholder={placeholder}
          />
          <button
            type="button"
            className="variable-insert-btn"
            onClick={toggleDropdown}
            title="Insert variable"
          >
            <Variable size={14} />
          </button>
        </div>

        {showDropdown && (
          <div className="variable-dropdown">
            {filteredVariables.length === 0 ? (
              <div className="variable-dropdown-empty">
                No variables found
              </div>
            ) : (
              filteredVariables.map((variable) => {
                const style = variableTypeStyles[variable.type];
                return (
                  <button
                    key={variable.id}
                    className="variable-dropdown-item"
                    onClick={() => insertVariable(variable)}
                  >
                    <span
                      className="variable-dropdown-type"
                      style={{ background: `${style.color}20`, color: style.color }}
                    >
                      {style.icon}
                    </span>
                    <span className="variable-dropdown-name">
                      ${`{${variable.name}}`}
                    </span>
                    {variable.description && (
                      <span className="variable-dropdown-desc">
                        {variable.description}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {hasUnresolved && (
        <div className="form-error">
          <AlertCircle size={12} />
          Undefined variable{unresolvedVars.length > 1 ? 's' : ''}: {unresolvedVars.join(', ')}
        </div>
      )}
      {error && !hasUnresolved && (
        <div className="form-error">
          <AlertCircle size={12} />
          {error}
        </div>
      )}
      {helperText && !error && !hasUnresolved && (
        <div className="form-helper">{helperText}</div>
      )}
    </div>
  );
}
