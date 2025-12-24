import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from '@xyflow/react';
import { ArrowRight, RotateCcw } from 'lucide-react';
import type { GradleEdge, DependencyType } from '../types/gradle';

/**
 * Edge style configurations for each dependency type
 */
const edgeStyles: Record<
  DependencyType,
  {
    strokeDasharray?: string;
    stroke: string;
    label: string;
    labelBg: string;
    description: string;
  }
> = {
  dependsOn: {
    stroke: '#64748b',
    label: 'depends on',
    labelBg: '#f1f5f9',
    description: 'Must complete before target runs',
  },
  mustRunAfter: {
    strokeDasharray: '8 4',
    stroke: '#f59e0b',
    label: 'must run after',
    labelBg: '#fef3c7',
    description: 'Ordering constraint only',
  },
  shouldRunAfter: {
    strokeDasharray: '4 4',
    stroke: '#22c55e',
    label: 'should run after',
    labelBg: '#dcfce7',
    description: 'Soft ordering preference',
  },
  finalizedBy: {
    stroke: '#8b5cf6',
    label: 'finalized by',
    labelBg: '#ede9fe',
    description: 'Cleanup/reporting task',
  },
};

/**
 * Custom edge component for Gradle task dependencies
 */
function GradleDependencyEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<GradleEdge>) {
  const dependencyType = data?.dependencyType || 'dependsOn';
  const style = edgeStyles[dependencyType];

  // Use smooth step path for better visualization
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 8,
  });

  // For finalizedBy, we use a different path direction indicator
  const isFinalizedBy = dependencyType === 'finalizedBy';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: style.stroke,
          strokeWidth: selected ? 3 : 2,
          strokeDasharray: style.strokeDasharray,
          filter: selected ? 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.5))' : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className={`edge-label ${selected ? 'selected' : ''}`}
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            background: style.labelBg,
            borderColor: style.stroke,
            pointerEvents: 'all',
          }}
        >
          {isFinalizedBy ? (
            <RotateCcw size={10} style={{ color: style.stroke }} />
          ) : (
            <ArrowRight size={10} style={{ color: style.stroke }} />
          )}
          <span className="edge-label-text" style={{ color: style.stroke }}>
            {style.label}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const GradleDependencyEdge = memo(GradleDependencyEdgeComponent);

/**
 * Export edge styles for use in other components
 */
export { edgeStyles };
