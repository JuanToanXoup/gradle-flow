import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  BackgroundVariant,
  SelectionMode,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GradleTaskNode } from './GradleTaskNode';
import { sampleNodes, sampleEdges } from '../data/sampleGraph';
import type {
  GradleTaskNode as GradleTaskNodeType,
  GradleEdge,
  AppNode,
} from '../types/gradle';

/**
 * Register custom node types for React Flow
 */
const nodeTypes: NodeTypes = {
  gradleTask: GradleTaskNode,
};

/**
 * Props for the selection info panel
 */
interface SelectionInfoProps {
  selectedNodes: GradleTaskNodeType[];
  onDelete: () => void;
}

/**
 * Panel showing information about selected nodes
 */
function SelectionInfo({ selectedNodes, onDelete }: SelectionInfoProps) {
  if (selectedNodes.length === 0) {
    return (
      <div className="selection-panel empty">
        <p>Click a node to select it</p>
        <p className="hint">Shift+click to multi-select</p>
      </div>
    );
  }

  if (selectedNodes.length === 1) {
    const node = selectedNodes[0];
    return (
      <div className="selection-panel">
        <h3>Selected Task</h3>
        <div className="selection-details">
          <div className="detail-row">
            <span className="label">Name:</span>
            <span className="value">{node.data.taskName}</span>
          </div>
          <div className="detail-row">
            <span className="label">Type:</span>
            <span className="value">{node.data.taskType}</span>
          </div>
          {node.data.group && (
            <div className="detail-row">
              <span className="label">Group:</span>
              <span className="value">{node.data.group}</span>
            </div>
          )}
          {node.data.description && (
            <div className="detail-row">
              <span className="label">Description:</span>
              <span className="value">{node.data.description}</span>
            </div>
          )}
        </div>
        <button className="delete-button" onClick={onDelete}>
          Delete Task
        </button>
      </div>
    );
  }

  return (
    <div className="selection-panel">
      <h3>{selectedNodes.length} Tasks Selected</h3>
      <ul className="selected-list">
        {selectedNodes.map((node) => (
          <li key={node.id}>{node.data.taskName}</li>
        ))}
      </ul>
      <button className="delete-button" onClick={onDelete}>
        Delete {selectedNodes.length} Tasks
      </button>
    </div>
  );
}

/**
 * Main canvas component for the Gradle task graph
 */
export function TaskGraphCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(sampleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GradleEdge>(sampleEdges);
  const [selectedNodes, setSelectedNodes] = useState<GradleTaskNodeType[]>([]);

  /**
   * Handle selection changes to track selected nodes
   */
  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    // Filter to only GradleTaskNodes
    const gradleNodes = selected.filter(
      (node): node is GradleTaskNodeType => node.type === 'gradleTask'
    );
    setSelectedNodes(gradleNodes);
  }, []);

  /**
   * Handle node click for single selection
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: AppNode) => {
      if (node.type === 'gradleTask') {
        console.log('Node clicked:', (node as GradleTaskNodeType).data.taskName);
      }
    },
    []
  );

  /**
   * Delete selected nodes and their connected edges
   */
  const handleDeleteSelected = useCallback(() => {
    const selectedIds = new Set(selectedNodes.map((n) => n.id));

    // Remove nodes
    setNodes((nds) => nds.filter((n) => !selectedIds.has(n.id)));

    // Remove edges connected to deleted nodes
    setEdges((eds) =>
      eds.filter((e) => !selectedIds.has(e.source) && !selectedIds.has(e.target))
    );

    // Clear selection
    setSelectedNodes([]);
  }, [selectedNodes, setNodes, setEdges]);

  /**
   * Handle keyboard events for deletion
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodes.length > 0) {
        event.preventDefault();
        handleDeleteSelected();
      }
    },
    [selectedNodes, handleDeleteSelected]
  );

  return (
    <div className="task-graph-container" onKeyDown={onKeyDown} tabIndex={0}>
      <div className="canvas-wrapper">
        <ReactFlow<AppNode, GradleEdge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
          nodeTypes={nodeTypes}
          selectionMode={SelectionMode.Partial}
          selectNodesOnDrag={false}
          selectionOnDrag
          panOnDrag={[1, 2]} // Pan with middle or right mouse button
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: 'smoothstep',
            style: { strokeWidth: 2, stroke: '#64748b' },
          }}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#94a3b8"
          />
          <Controls showInteractive={false} />
          <MiniMap
            nodeStrokeWidth={3}
            pannable
            zoomable
            style={{ backgroundColor: '#f8fafc' }}
          />
        </ReactFlow>
      </div>
      <SelectionInfo
        selectedNodes={selectedNodes}
        onDelete={handleDeleteSelected}
      />
    </div>
  );
}
