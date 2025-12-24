import { useState, useCallback, useMemo } from 'react';
import {
  Layers,
  ChevronDown,
  ChevronRight,
  Plus,
  Edit2,
  Trash2,
  Check,
  X,
  FolderPlus,
} from 'lucide-react';
import type { TaskGroup, GradleTaskNode } from '../types/gradle';
import { groupColors } from '../types/gradle';
import { validateGroupName, getGroupStats } from '../utils/groupUtils';

interface GroupPanelProps {
  groups: TaskGroup[];
  selectedNodeIds: string[];
  allNodes: GradleTaskNode[];
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onCreateGroup: (name: string, color: string, description?: string) => void;
  onUpdateGroup: (groupId: string, updates: Partial<TaskGroup>) => void;
  onDeleteGroup: (groupId: string) => void;
  onToggleGroupCollapse: (groupId: string) => void;
  onSelectGroup: (groupId: string) => void;
}

/**
 * Color picker component
 */
function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="color-picker">
      {groupColors.map((color) => (
        <button
          key={color.value}
          className={`color-option ${value === color.value ? 'selected' : ''}`}
          style={{
            backgroundColor: color.value,
            borderColor: color.border,
          }}
          onClick={() => onChange(color.value)}
          title={color.label}
        />
      ))}
    </div>
  );
}

/**
 * Group item in the list
 */
function GroupItem({
  group,
  stats,
  isEditing,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onToggleCollapse,
  onSelect,
  editName,
  editColor,
  editDescription,
  onEditNameChange,
  onEditColorChange,
  onEditDescriptionChange,
  validationError,
}: {
  group: TaskGroup;
  stats: ReturnType<typeof getGroupStats>;
  isEditing: boolean;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onToggleCollapse: () => void;
  onSelect: () => void;
  editName: string;
  editColor: string;
  editDescription: string;
  onEditNameChange: (name: string) => void;
  onEditColorChange: (color: string) => void;
  onEditDescriptionChange: (desc: string) => void;
  validationError: string | null;
}) {
  const borderColor =
    groupColors.find((c) => c.value === group.color)?.border || '#64748b';

  if (isEditing) {
    return (
      <div className="group-item editing">
        <div className="group-edit-form">
          <div className="group-edit-field">
            <label>Name</label>
            <input
              type="text"
              value={editName}
              onChange={(e) => onEditNameChange(e.target.value)}
              placeholder="Group name"
              autoFocus
            />
            {validationError && (
              <span className="group-edit-error">{validationError}</span>
            )}
          </div>
          <div className="group-edit-field">
            <label>Color</label>
            <ColorPicker value={editColor} onChange={onEditColorChange} />
          </div>
          <div className="group-edit-field">
            <label>Description</label>
            <input
              type="text"
              value={editDescription}
              onChange={(e) => onEditDescriptionChange(e.target.value)}
              placeholder="Optional description"
            />
          </div>
          <div className="group-edit-actions">
            <button className="group-save-btn" onClick={onSaveEdit}>
              <Check size={14} />
              Save
            </button>
            <button className="group-cancel-btn" onClick={onCancelEdit}>
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="group-item"
      style={{
        backgroundColor: group.color,
        borderLeftColor: borderColor,
      }}
    >
      <div className="group-item-header" onClick={onSelect}>
        <button
          className="group-collapse-toggle"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          title={group.collapsed ? 'Expand' : 'Collapse'}
        >
          {group.collapsed ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronDown size={14} />
          )}
        </button>

        <Layers size={14} style={{ color: borderColor }} />

        <span className="group-item-name">{group.name}</span>

        <span className="group-item-count">{stats.total}</span>

        <div className="group-item-actions">
          <button
            className="group-item-action"
            onClick={(e) => {
              e.stopPropagation();
              onStartEdit();
            }}
            title="Edit group"
          >
            <Edit2 size={12} />
          </button>
          <button
            className="group-item-action delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Delete group"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {group.description && (
        <div className="group-item-description">{group.description}</div>
      )}
    </div>
  );
}

export function GroupPanel({
  groups,
  selectedNodeIds,
  allNodes,
  isExpanded,
  onToggleExpanded,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onToggleGroupCollapse,
  onSelectGroup,
}: GroupPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);

  // Form state for creating/editing
  const [formName, setFormName] = useState('');
  const [formColor, setFormColor] = useState(groupColors[0].value);
  const [formDescription, setFormDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Check if we can create a group from selection
  const canCreateFromSelection = useMemo(() => {
    if (selectedNodeIds.length < 1) return false;

    // Check if any selected node is already in a group
    for (const nodeId of selectedNodeIds) {
      const inGroup = groups.some((g) => g.taskIds.includes(nodeId));
      if (inGroup) return false;
    }
    return true;
  }, [selectedNodeIds, groups]);

  // Reset form
  const resetForm = useCallback(() => {
    setFormName('');
    setFormColor(groupColors[0].value);
    setFormDescription('');
    setValidationError(null);
  }, []);

  // Start creating a new group
  const handleStartCreate = useCallback(() => {
    resetForm();
    setIsCreating(true);
    setEditingGroupId(null);
  }, [resetForm]);

  // Start editing an existing group
  const handleStartEdit = useCallback((group: TaskGroup) => {
    setFormName(group.name);
    setFormColor(group.color);
    setFormDescription(group.description || '');
    setValidationError(null);
    setEditingGroupId(group.id);
    setIsCreating(false);
  }, []);

  // Cancel creating/editing
  const handleCancel = useCallback(() => {
    setIsCreating(false);
    setEditingGroupId(null);
    resetForm();
  }, [resetForm]);

  // Save new group
  const handleSaveCreate = useCallback(() => {
    const error = validateGroupName(formName, groups);
    if (error) {
      setValidationError(error);
      return;
    }

    onCreateGroup(formName.trim(), formColor, formDescription.trim() || undefined);
    setIsCreating(false);
    resetForm();
  }, [formName, formColor, formDescription, groups, onCreateGroup, resetForm]);

  // Save edited group
  const handleSaveEdit = useCallback(() => {
    if (!editingGroupId) return;

    const error = validateGroupName(formName, groups, editingGroupId);
    if (error) {
      setValidationError(error);
      return;
    }

    onUpdateGroup(editingGroupId, {
      name: formName.trim(),
      color: formColor,
      description: formDescription.trim() || undefined,
    });
    setEditingGroupId(null);
    resetForm();
  }, [
    editingGroupId,
    formName,
    formColor,
    formDescription,
    groups,
    onUpdateGroup,
    resetForm,
  ]);

  // Handle delete with confirmation
  const handleDelete = useCallback(
    (groupId: string) => {
      if (confirm('Are you sure you want to delete this group? Tasks will not be deleted.')) {
        onDeleteGroup(groupId);
      }
    },
    [onDeleteGroup]
  );

  return (
    <div className="group-panel">
      <button className="group-panel-header" onClick={onToggleExpanded}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Layers size={16} />
        <span className="group-panel-title">Task Groups</span>
        {groups.length > 0 && (
          <span className="group-panel-count">{groups.length}</span>
        )}
      </button>

      {isExpanded && (
        <div className="group-panel-content">
          {/* Create from selection button */}
          {canCreateFromSelection && !isCreating && (
            <button
              className="group-create-from-selection"
              onClick={handleStartCreate}
            >
              <FolderPlus size={14} />
              <span>Group {selectedNodeIds.length} selected task{selectedNodeIds.length !== 1 ? 's' : ''}</span>
            </button>
          )}

          {/* Create new group form */}
          {isCreating && (
            <div className="group-create-form">
              <div className="group-edit-field">
                <label>Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="Group name"
                  autoFocus
                />
                {validationError && (
                  <span className="group-edit-error">{validationError}</span>
                )}
              </div>
              <div className="group-edit-field">
                <label>Color</label>
                <ColorPicker value={formColor} onChange={setFormColor} />
              </div>
              <div className="group-edit-field">
                <label>Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="group-edit-actions">
                <button className="group-save-btn" onClick={handleSaveCreate}>
                  <Check size={14} />
                  Create Group
                </button>
                <button className="group-cancel-btn" onClick={handleCancel}>
                  <X size={14} />
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Group list */}
          {groups.length === 0 && !isCreating ? (
            <div className="group-empty">
              <Layers size={24} />
              <p>No groups yet</p>
              <p className="hint">Select tasks and click "Create Group" to organize them</p>
              {!canCreateFromSelection && (
                <button className="group-add-btn" onClick={handleStartCreate}>
                  <Plus size={14} />
                  Create Empty Group
                </button>
              )}
            </div>
          ) : (
            <div className="group-list">
              {groups.map((group) => (
                <GroupItem
                  key={group.id}
                  group={group}
                  stats={getGroupStats(group, allNodes)}
                  isEditing={editingGroupId === group.id}
                  onStartEdit={() => handleStartEdit(group)}
                  onSaveEdit={handleSaveEdit}
                  onCancelEdit={handleCancel}
                  onDelete={() => handleDelete(group.id)}
                  onToggleCollapse={() => onToggleGroupCollapse(group.id)}
                  onSelect={() => onSelectGroup(group.id)}
                  editName={formName}
                  editColor={formColor}
                  editDescription={formDescription}
                  onEditNameChange={(name) => {
                    setFormName(name);
                    setValidationError(null);
                  }}
                  onEditColorChange={setFormColor}
                  onEditDescriptionChange={setFormDescription}
                  validationError={validationError}
                />
              ))}
            </div>
          )}

          {/* Add group button when groups exist */}
          {groups.length > 0 && !isCreating && !editingGroupId && (
            <button className="group-add-btn" onClick={handleStartCreate}>
              <Plus size={14} />
              Add Group
            </button>
          )}
        </div>
      )}
    </div>
  );
}
