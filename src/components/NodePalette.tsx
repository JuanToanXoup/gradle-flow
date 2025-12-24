import { useMemo } from 'react';
import { ChevronDown, ChevronRight, GripVertical } from 'lucide-react';
import { useState } from 'react';
import { taskTypeIcons, taskTypeColors } from './GradleTaskNode';
import {
  paletteItems,
  type PaletteCategory,
  type PaletteItem,
  type GradleTaskType,
} from '../types/gradle';

/**
 * Props for the NodePalette component
 */
interface NodePaletteProps {
  onDragStart: (taskType: GradleTaskType) => void;
}

/**
 * Individual palette item that can be dragged
 */
interface DraggablePaletteItemProps {
  item: PaletteItem;
  onDragStart: (taskType: GradleTaskType) => void;
}

function DraggablePaletteItem({ item, onDragStart }: DraggablePaletteItemProps) {
  const Icon = taskTypeIcons[item.taskType];
  const color = taskTypeColors[item.taskType];

  const handleDragStart = (event: React.DragEvent) => {
    event.dataTransfer.setData('application/reactflow', item.taskType);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart(item.taskType);
  };

  return (
    <div
      className="palette-item"
      draggable
      onDragStart={handleDragStart}
    >
      <div className="palette-item-drag">
        <GripVertical size={14} />
      </div>
      <div
        className="palette-item-icon"
        style={{ backgroundColor: `${color}20`, color }}
      >
        <Icon size={16} />
      </div>
      <div className="palette-item-info">
        <div className="palette-item-label">{item.label}</div>
        <div className="palette-item-desc">{item.description}</div>
      </div>
    </div>
  );
}

/**
 * Collapsible category section
 */
interface PaletteCategoryProps {
  category: PaletteCategory;
  items: PaletteItem[];
  isExpanded: boolean;
  onToggle: () => void;
  onDragStart: (taskType: GradleTaskType) => void;
}

function PaletteCategorySection({
  category,
  items,
  isExpanded,
  onToggle,
  onDragStart,
}: PaletteCategoryProps) {
  return (
    <div className="palette-category">
      <button className="palette-category-header" onClick={onToggle}>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <span className="palette-category-title">{category}</span>
        <span className="palette-category-count">{items.length}</span>
      </button>
      {isExpanded && (
        <div className="palette-category-items">
          {items.map((item) => (
            <DraggablePaletteItem
              key={item.taskType}
              item={item}
              onDragStart={onDragStart}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Node palette sidebar for dragging new nodes onto the canvas
 */
export function NodePalette({ onDragStart }: NodePaletteProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<PaletteCategory>>(
    new Set(['File Operations', 'Build', 'Network', 'Custom'])
  );

  // Group palette items by category
  const itemsByCategory = useMemo(() => {
    const categories: PaletteCategory[] = ['File Operations', 'Network', 'Build', 'Custom'];
    const grouped = new Map<PaletteCategory, PaletteItem[]>();

    categories.forEach((category) => {
      grouped.set(
        category,
        paletteItems.filter((item) => item.category === category)
      );
    });

    return grouped;
  }, []);

  const toggleCategory = (category: PaletteCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div className="node-palette">
      <div className="palette-header">
        <h2>Task Palette</h2>
        <p className="palette-hint">Drag tasks to the canvas</p>
      </div>
      <div className="palette-content">
        {Array.from(itemsByCategory.entries()).map(([category, items]) => (
          <PaletteCategorySection
            key={category}
            category={category}
            items={items}
            isExpanded={expandedCategories.has(category)}
            onToggle={() => toggleCategory(category)}
            onDragStart={onDragStart}
          />
        ))}
      </div>
    </div>
  );
}
