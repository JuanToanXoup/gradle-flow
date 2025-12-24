import { useCallback } from 'react';
import { Link, Trash2 } from 'lucide-react';
import { Select } from './config';
import type { GradleEdge, GradleEdgeData, DependencyType, GradleTaskNode } from '../types/gradle';
import { edgeStyles } from './GradleDependencyEdge';

interface EdgePropertyPanelProps {
  selectedEdge: GradleEdge;
  nodes: GradleTaskNode[];
  onEdgeUpdate: (edgeId: string, updates: Partial<GradleEdgeData>) => void;
  onEdgeDelete: (edgeId: string) => void;
}

const dependencyTypeOptions = [
  { value: 'dependsOn', label: 'Depends On' },
  { value: 'mustRunAfter', label: 'Must Run After' },
  { value: 'shouldRunAfter', label: 'Should Run After' },
  { value: 'finalizedBy', label: 'Finalized By' },
];

export function EdgePropertyPanel({
  selectedEdge,
  nodes,
  onEdgeUpdate,
  onEdgeDelete,
}: EdgePropertyPanelProps) {
  const sourceNode = nodes.find((n) => n.id === selectedEdge.source);
  const targetNode = nodes.find((n) => n.id === selectedEdge.target);
  const dependencyType = selectedEdge.data?.dependencyType || 'dependsOn';
  const style = edgeStyles[dependencyType];

  const handleTypeChange = useCallback(
    (value: string) => {
      onEdgeUpdate(selectedEdge.id, { dependencyType: value as DependencyType });
    },
    [selectedEdge.id, onEdgeUpdate]
  );

  return (
    <div className="property-panel edge-panel">
      <div className="panel-header">
        <h2>Dependency Configuration</h2>
        <span className="edge-type-badge" style={{ background: style.labelBg, color: style.stroke }}>
          {style.label}
        </span>
      </div>

      <div className="panel-content">
        {/* Connection visualization */}
        <div className="edge-connection-viz">
          <div className="edge-node-box source">
            <div className="edge-node-label">From</div>
            <div className="edge-node-name">{sourceNode?.data.taskName || 'Unknown'}</div>
            <div className="edge-node-type">{sourceNode?.data.taskType || ''}</div>
          </div>

          <div className="edge-arrow">
            <div
              className="edge-arrow-line"
              style={{
                borderColor: style.stroke,
                borderStyle: dependencyType === 'mustRunAfter' ? 'dashed' :
                             dependencyType === 'shouldRunAfter' ? 'dotted' : 'solid',
              }}
            />
            <Link size={16} style={{ color: style.stroke }} />
          </div>

          <div className="edge-node-box target">
            <div className="edge-node-label">To</div>
            <div className="edge-node-name">{targetNode?.data.taskName || 'Unknown'}</div>
            <div className="edge-node-type">{targetNode?.data.taskType || ''}</div>
          </div>
        </div>

        {/* Dependency type section */}
        <div className="property-section">
          <h3 className="section-title">Relationship Type</h3>
          <Select
            label="Dependency Type"
            value={dependencyType}
            onChange={handleTypeChange}
            options={dependencyTypeOptions}
          />
          <p className="edge-type-description">{style.description}</p>
        </div>

        {/* Dependency type explanation */}
        <div className="property-section">
          <h3 className="section-title">Behavior</h3>
          <div className="edge-behavior-info">
            {dependencyType === 'dependsOn' && (
              <ul>
                <li>The target task will not run until the source task completes</li>
                <li>If the source task fails, the target will not execute</li>
                <li>Creates a hard dependency chain</li>
              </ul>
            )}
            {dependencyType === 'mustRunAfter' && (
              <ul>
                <li>Only affects ordering when both tasks are scheduled</li>
                <li>Does not cause the source task to run</li>
                <li>Used when tasks share resources</li>
              </ul>
            )}
            {dependencyType === 'shouldRunAfter' && (
              <ul>
                <li>A soft ordering preference</li>
                <li>May be ignored to break cycles</li>
                <li>Useful for optimization hints</li>
              </ul>
            )}
            {dependencyType === 'finalizedBy' && (
              <ul>
                <li>The finalizer runs after the source task</li>
                <li>Runs even if the source task fails</li>
                <li>Used for cleanup or reporting</li>
              </ul>
            )}
          </div>
        </div>
      </div>

      <div className="panel-footer">
        <button
          className="delete-button"
          onClick={() => onEdgeDelete(selectedEdge.id)}
        >
          <Trash2 size={14} />
          Remove Dependency
        </button>
      </div>
    </div>
  );
}
