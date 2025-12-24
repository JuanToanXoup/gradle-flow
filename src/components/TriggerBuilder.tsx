import { useCallback } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Play,
  Eye,
  Clock,
  Webhook,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  TaskTrigger,
  TriggerType,
  FileWatchTrigger,
  ScheduleTrigger,
  WebhookTrigger,
} from '../types/gradle';
import {
  createTrigger,
  getTriggerType,
  getTriggerTypeLabel,
  getTriggerTypeOptions,
  describeTrigger,
  cronPresets,
  timezones,
  validateCron,
} from '../utils/triggerUtils';

interface TriggerBuilderProps {
  trigger: TaskTrigger | undefined;
  onChange: (trigger: TaskTrigger | undefined) => void;
  isExpanded: boolean;
  onToggleExpanded: () => void;
}

const triggerIcons: Record<TriggerType, React.ElementType> = {
  manual: Play,
  fileWatch: Eye,
  schedule: Clock,
  webhook: Webhook,
};

/**
 * File watch trigger configuration
 */
function FileWatchConfig({
  trigger,
  onChange,
}: {
  trigger: FileWatchTrigger;
  onChange: (trigger: FileWatchTrigger) => void;
}) {
  const handleDirectoryAdd = () => {
    onChange({
      ...trigger,
      directories: [...trigger.directories, ''],
    });
  };

  const handleDirectoryChange = (index: number, value: string) => {
    const newDirs = [...trigger.directories];
    newDirs[index] = value;
    onChange({ ...trigger, directories: newDirs });
  };

  const handleDirectoryRemove = (index: number) => {
    onChange({
      ...trigger,
      directories: trigger.directories.filter((_, i) => i !== index),
    });
  };

  const handlePatternAdd = () => {
    onChange({
      ...trigger,
      patterns: [...trigger.patterns, ''],
    });
  };

  const handlePatternChange = (index: number, value: string) => {
    const newPatterns = [...trigger.patterns];
    newPatterns[index] = value;
    onChange({ ...trigger, patterns: newPatterns });
  };

  const handlePatternRemove = (index: number) => {
    onChange({
      ...trigger,
      patterns: trigger.patterns.filter((_, i) => i !== index),
    });
  };

  const handleEventToggle = (event: 'create' | 'modify' | 'delete') => {
    const newEvents = trigger.events.includes(event)
      ? trigger.events.filter((e) => e !== event)
      : [...trigger.events, event];
    onChange({ ...trigger, events: newEvents });
  };

  return (
    <div className="trigger-config file-watch">
      {/* Directories */}
      <div className="trigger-field">
        <label>Directories to Watch</label>
        <div className="trigger-list">
          {trigger.directories.map((dir, index) => (
            <div key={index} className="trigger-list-item">
              <input
                type="text"
                value={dir}
                onChange={(e) => handleDirectoryChange(index, e.target.value)}
                placeholder="e.g., src"
              />
              {trigger.directories.length > 1 && (
                <button
                  className="trigger-list-remove"
                  onClick={() => handleDirectoryRemove(index)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button className="trigger-list-add" onClick={handleDirectoryAdd}>
            <Plus size={14} />
            Add Directory
          </button>
        </div>
      </div>

      {/* Patterns */}
      <div className="trigger-field">
        <label>File Patterns (glob)</label>
        <div className="trigger-list">
          {trigger.patterns.map((pattern, index) => (
            <div key={index} className="trigger-list-item">
              <input
                type="text"
                value={pattern}
                onChange={(e) => handlePatternChange(index, e.target.value)}
                placeholder="e.g., **/*.ts"
              />
              {trigger.patterns.length > 1 && (
                <button
                  className="trigger-list-remove"
                  onClick={() => handlePatternRemove(index)}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          <button className="trigger-list-add" onClick={handlePatternAdd}>
            <Plus size={14} />
            Add Pattern
          </button>
        </div>
      </div>

      {/* Events */}
      <div className="trigger-field">
        <label>Watch Events</label>
        <div className="trigger-checkboxes">
          {(['create', 'modify', 'delete'] as const).map((event) => (
            <label key={event} className="trigger-checkbox">
              <input
                type="checkbox"
                checked={trigger.events.includes(event)}
                onChange={() => handleEventToggle(event)}
              />
              <span>{event.charAt(0).toUpperCase() + event.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="trigger-field-row">
        <div className="trigger-field">
          <label>Recursive</label>
          <label className="trigger-checkbox">
            <input
              type="checkbox"
              checked={trigger.recursive}
              onChange={(e) => onChange({ ...trigger, recursive: e.target.checked })}
            />
            <span>Include subdirectories</span>
          </label>
        </div>
        <div className="trigger-field">
          <label>Debounce (ms)</label>
          <input
            type="number"
            value={trigger.debounceMs}
            onChange={(e) => onChange({ ...trigger, debounceMs: parseInt(e.target.value) || 0 })}
            min={0}
            step={100}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Schedule trigger configuration
 */
function ScheduleConfig({
  trigger,
  onChange,
}: {
  trigger: ScheduleTrigger;
  onChange: (trigger: ScheduleTrigger) => void;
}) {
  const cronValidation = validateCron(trigger.cron);

  return (
    <div className="trigger-config schedule">
      {/* Cron presets */}
      <div className="trigger-field">
        <label>Quick Select</label>
        <div className="trigger-presets">
          {cronPresets.slice(0, 6).map((preset) => (
            <button
              key={preset.cron}
              className={`trigger-preset ${trigger.cron === preset.cron ? 'active' : ''}`}
              onClick={() => onChange({ ...trigger, cron: preset.cron, description: preset.description })}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cron expression */}
      <div className="trigger-field">
        <label>Cron Expression</label>
        <input
          type="text"
          value={trigger.cron}
          onChange={(e) => onChange({ ...trigger, cron: e.target.value })}
          placeholder="* * * * *"
          className={!cronValidation.valid ? 'error' : ''}
        />
        {!cronValidation.valid && (
          <span className="trigger-error">{cronValidation.error}</span>
        )}
        <span className="trigger-hint">
          Format: minute hour day-of-month month day-of-week
        </span>
      </div>

      {/* Timezone */}
      <div className="trigger-field">
        <label>Timezone</label>
        <select
          value={trigger.timezone}
          onChange={(e) => onChange({ ...trigger, timezone: e.target.value })}
        >
          {timezones.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div className="trigger-field">
        <label>Description (optional)</label>
        <input
          type="text"
          value={trigger.description || ''}
          onChange={(e) => onChange({ ...trigger, description: e.target.value })}
          placeholder="e.g., Nightly build"
        />
      </div>

      {/* Enabled */}
      <div className="trigger-field">
        <label className="trigger-checkbox">
          <input
            type="checkbox"
            checked={trigger.enabled}
            onChange={(e) => onChange({ ...trigger, enabled: e.target.checked })}
          />
          <span>Schedule enabled</span>
        </label>
      </div>
    </div>
  );
}

/**
 * Webhook trigger configuration
 */
function WebhookConfig({
  trigger,
  onChange,
}: {
  trigger: WebhookTrigger;
  onChange: (trigger: WebhookTrigger) => void;
}) {
  const handleMethodToggle = (method: 'GET' | 'POST' | 'PUT') => {
    const newMethods = trigger.methods.includes(method)
      ? trigger.methods.filter((m) => m !== method)
      : [...trigger.methods, method];
    onChange({ ...trigger, methods: newMethods.length > 0 ? newMethods : ['POST'] });
  };

  return (
    <div className="trigger-config webhook">
      {/* Endpoint */}
      <div className="trigger-field">
        <label>Endpoint Path</label>
        <input
          type="text"
          value={trigger.endpoint}
          onChange={(e) => onChange({ ...trigger, endpoint: e.target.value })}
          placeholder="/hooks/my-task"
        />
        <span className="trigger-hint">
          Full URL: https://your-domain.com{trigger.endpoint || '/hooks/...'}
        </span>
      </div>

      {/* Methods */}
      <div className="trigger-field">
        <label>Accepted Methods</label>
        <div className="trigger-checkboxes">
          {(['GET', 'POST', 'PUT'] as const).map((method) => (
            <label key={method} className="trigger-checkbox">
              <input
                type="checkbox"
                checked={trigger.methods.includes(method)}
                onChange={() => handleMethodToggle(method)}
              />
              <span>{method}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Secret */}
      <div className="trigger-field">
        <label>Webhook Secret (optional)</label>
        <input
          type="password"
          value={trigger.secret || ''}
          onChange={(e) => onChange({ ...trigger, secret: e.target.value })}
          placeholder="Enter secret for validation"
        />
        <span className="trigger-hint">
          Used to validate incoming webhook requests
        </span>
      </div>
    </div>
  );
}

export function TriggerBuilder({
  trigger,
  onChange,
  isExpanded,
  onToggleExpanded,
}: TriggerBuilderProps) {
  const currentType = getTriggerType(trigger);
  const typeOptions = getTriggerTypeOptions();
  const Icon = triggerIcons[currentType];

  const handleTypeChange = useCallback(
    (newType: TriggerType) => {
      if (newType === 'manual') {
        onChange(undefined);
      } else {
        onChange(createTrigger(newType));
      }
    },
    [onChange]
  );

  const handleTriggerUpdate = useCallback(
    (updatedTrigger: TaskTrigger) => {
      onChange(updatedTrigger);
    },
    [onChange]
  );

  return (
    <div className="trigger-builder">
      <button className="trigger-header" onClick={onToggleExpanded}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Icon size={16} />
        <span className="trigger-title">Trigger</span>
        <span className="trigger-type-badge">{getTriggerTypeLabel(currentType)}</span>
      </button>

      {isExpanded && (
        <div className="trigger-content">
          {/* Type selector */}
          <div className="trigger-type-selector">
            {typeOptions.map((option) => {
              const OptionIcon = triggerIcons[option.value];
              return (
                <label
                  key={option.value}
                  className={`trigger-type-option ${currentType === option.value ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="triggerType"
                    checked={currentType === option.value}
                    onChange={() => handleTypeChange(option.value)}
                  />
                  <OptionIcon size={16} />
                  <div className="trigger-type-info">
                    <span className="trigger-type-label">{option.label}</span>
                    <span className="trigger-type-desc">{option.description}</span>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Type-specific configuration */}
          {trigger?.type === 'fileWatch' && (
            <FileWatchConfig
              trigger={trigger}
              onChange={(t) => handleTriggerUpdate(t)}
            />
          )}
          {trigger?.type === 'schedule' && (
            <ScheduleConfig
              trigger={trigger}
              onChange={(t) => handleTriggerUpdate(t)}
            />
          )}
          {trigger?.type === 'webhook' && (
            <WebhookConfig
              trigger={trigger}
              onChange={(t) => handleTriggerUpdate(t)}
            />
          )}

          {/* Manual trigger info */}
          {(!trigger || trigger.type === 'manual') && (
            <div className="trigger-manual-info">
              <p>Task will be triggered manually when you click "Run" or through dependencies.</p>
            </div>
          )}

          {/* Trigger summary */}
          {trigger && trigger.type !== 'manual' && (
            <div className="trigger-summary">
              <strong>Summary:</strong> {describeTrigger(trigger)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
