import type {
  TaskTrigger,
  TriggerType,
  FileWatchTrigger,
  ScheduleTrigger,
  WebhookTrigger,
  ManualTrigger,
} from '../types/gradle';

/**
 * Common cron presets for schedules
 */
export interface CronPreset {
  label: string;
  cron: string;
  description: string;
}

export const cronPresets: CronPreset[] = [
  { label: 'Every minute', cron: '* * * * *', description: 'Runs every minute' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *', description: 'Runs every 5 minutes' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *', description: 'Runs every 15 minutes' },
  { label: 'Every hour', cron: '0 * * * *', description: 'Runs at the start of every hour' },
  { label: 'Every 6 hours', cron: '0 */6 * * *', description: 'Runs every 6 hours' },
  { label: 'Daily at midnight', cron: '0 0 * * *', description: 'Runs at midnight every day' },
  { label: 'Daily at noon', cron: '0 12 * * *', description: 'Runs at noon every day' },
  { label: 'Weekly (Sunday)', cron: '0 0 * * 0', description: 'Runs at midnight every Sunday' },
  { label: 'Weekly (Monday)', cron: '0 0 * * 1', description: 'Runs at midnight every Monday' },
  { label: 'Monthly', cron: '0 0 1 * *', description: 'Runs at midnight on the 1st of every month' },
];

/**
 * Common timezones
 */
export const timezones = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Singapore',
  'Australia/Sydney',
];

/**
 * Create a default manual trigger
 */
export function createManualTrigger(): ManualTrigger {
  return { type: 'manual' };
}

/**
 * Create a default file watch trigger
 */
export function createFileWatchTrigger(): FileWatchTrigger {
  return {
    type: 'fileWatch',
    patterns: ['**/*'],
    directories: ['src'],
    recursive: true,
    debounceMs: 500,
    events: ['create', 'modify', 'delete'],
  };
}

/**
 * Create a default schedule trigger
 */
export function createScheduleTrigger(): ScheduleTrigger {
  return {
    type: 'schedule',
    cron: '0 * * * *',
    description: 'Runs every hour',
    timezone: 'UTC',
    enabled: true,
  };
}

/**
 * Create a default webhook trigger
 */
export function createWebhookTrigger(): WebhookTrigger {
  return {
    type: 'webhook',
    endpoint: '/hooks/task',
    methods: ['POST'],
    requiredHeaders: {},
  };
}

/**
 * Create a trigger of the specified type
 */
export function createTrigger(type: TriggerType): TaskTrigger {
  switch (type) {
    case 'fileWatch':
      return createFileWatchTrigger();
    case 'schedule':
      return createScheduleTrigger();
    case 'webhook':
      return createWebhookTrigger();
    case 'manual':
    default:
      return createManualTrigger();
  }
}

/**
 * Get the trigger type from a trigger configuration
 */
export function getTriggerType(trigger: TaskTrigger | undefined): TriggerType {
  return trigger?.type || 'manual';
}

/**
 * Get a human-readable label for a trigger type
 */
export function getTriggerTypeLabel(type: TriggerType): string {
  switch (type) {
    case 'fileWatch':
      return 'File Watch';
    case 'schedule':
      return 'Schedule';
    case 'webhook':
      return 'Webhook';
    case 'manual':
    default:
      return 'Manual';
  }
}

/**
 * Get an icon name for a trigger type
 */
export function getTriggerTypeIcon(type: TriggerType): string {
  switch (type) {
    case 'fileWatch':
      return 'eye';
    case 'schedule':
      return 'clock';
    case 'webhook':
      return 'webhook';
    case 'manual':
    default:
      return 'play';
  }
}

/**
 * Parse a cron expression and return a human-readable description
 */
export function describeCron(cron: string): string {
  // Check if it matches a preset
  const preset = cronPresets.find((p) => p.cron === cron);
  if (preset) {
    return preset.description;
  }

  // Basic parsing for common patterns
  const parts = cron.split(' ');
  if (parts.length !== 5) {
    return 'Custom schedule';
  }

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  // Every minute
  if (minute === '*' && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return 'Every minute';
  }

  // Every X minutes
  if (minute.startsWith('*/') && hour === '*') {
    return `Every ${minute.slice(2)} minutes`;
  }

  // Every X hours
  if (minute === '0' && hour.startsWith('*/')) {
    return `Every ${hour.slice(2)} hours`;
  }

  // Daily at specific time
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    if (hour !== '*' && minute !== '*') {
      return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
    }
  }

  return 'Custom schedule';
}

/**
 * Format a file watch trigger for display
 */
export function describeFileWatchTrigger(trigger: FileWatchTrigger): string {
  const dirs = trigger.directories.join(', ');
  const patterns = trigger.patterns.join(', ');
  const events = trigger.events.join('/');
  return `Watching ${dirs} for ${patterns} (${events})`;
}

/**
 * Format a schedule trigger for display
 */
export function describeScheduleTrigger(trigger: ScheduleTrigger): string {
  if (trigger.description) {
    return trigger.description;
  }
  return `${describeCron(trigger.cron)} (${trigger.timezone})`;
}

/**
 * Format a webhook trigger for display
 */
export function describeWebhookTrigger(trigger: WebhookTrigger): string {
  return `${trigger.methods.join('/')} ${trigger.endpoint}`;
}

/**
 * Get a description for any trigger
 */
export function describeTrigger(trigger: TaskTrigger | undefined): string {
  if (!trigger || trigger.type === 'manual') {
    return 'Manual execution';
  }

  switch (trigger.type) {
    case 'fileWatch':
      return describeFileWatchTrigger(trigger);
    case 'schedule':
      return describeScheduleTrigger(trigger);
    case 'webhook':
      return describeWebhookTrigger(trigger);
    default:
      return 'Unknown trigger';
  }
}

/**
 * Check if a trigger is active/enabled
 */
export function isTriggerActive(trigger: TaskTrigger | undefined): boolean {
  if (!trigger || trigger.type === 'manual') {
    return false;
  }

  if (trigger.type === 'schedule') {
    return trigger.enabled;
  }

  return true;
}

/**
 * Validate a cron expression
 */
export function validateCron(cron: string): { valid: boolean; error?: string } {
  const parts = cron.trim().split(/\s+/);

  if (parts.length !== 5) {
    return { valid: false, error: 'Cron expression must have 5 parts' };
  }

  const ranges = [
    { min: 0, max: 59, name: 'minute' },
    { min: 0, max: 23, name: 'hour' },
    { min: 1, max: 31, name: 'day of month' },
    { min: 1, max: 12, name: 'month' },
    { min: 0, max: 7, name: 'day of week' },
  ];

  for (let i = 0; i < 5; i++) {
    const part = parts[i];
    const range = ranges[i];

    // Allow wildcards
    if (part === '*') continue;

    // Allow step values
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2), 10);
      if (isNaN(step) || step < 1) {
        return { valid: false, error: `Invalid step value for ${range.name}` };
      }
      continue;
    }

    // Allow single values
    const value = parseInt(part, 10);
    if (!isNaN(value)) {
      if (value < range.min || value > range.max) {
        return { valid: false, error: `${range.name} must be between ${range.min} and ${range.max}` };
      }
      continue;
    }

    // For simplicity, reject more complex expressions
    return { valid: false, error: `Invalid value for ${range.name}` };
  }

  return { valid: true };
}

/**
 * Get available trigger type options
 */
export interface TriggerTypeOption {
  value: TriggerType;
  label: string;
  description: string;
}

export function getTriggerTypeOptions(): TriggerTypeOption[] {
  return [
    { value: 'manual', label: 'Manual', description: 'Triggered by user action' },
    { value: 'fileWatch', label: 'File Watch', description: 'Triggered when files change' },
    { value: 'schedule', label: 'Schedule', description: 'Triggered on a schedule' },
    { value: 'webhook', label: 'Webhook', description: 'Triggered by external events' },
  ];
}
