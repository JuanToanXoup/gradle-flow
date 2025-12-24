import { useCallback, useState, useMemo, useRef } from 'react';
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
  addEdge,
  type Connection,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GradleTaskNode } from './GradleTaskNode';
import { PropertyPanel } from './PropertyPanel';
import { NodePalette } from './NodePalette';
import { sampleNodes, sampleEdges } from '../data/sampleGraph';
import {
  type GradleTaskNode as GradleTaskNodeType,
  type GradleTaskNodeData,
  type GradleEdge,
  type AppNode,
  type GradleTaskType,
  defaultTaskConfigs,
} from '../types/gradle';

/**
 * Register custom node types for React Flow
 */
const nodeTypes: NodeTypes = {
  gradleTask: GradleTaskNode,
};

/**
 * Generate a unique ID for new nodes
 */
let nodeIdCounter = 100;
function generateNodeId(): string {
  return `task_${++nodeIdCounter}`;
}

/**
 * Generate a unique task name
 */
function generateTaskName(taskType: GradleTaskType, existingNames: Set<string>): string {
  const baseName = taskType.toLowerCase();
  let name = baseName;
  let counter = 1;

  while (existingNames.has(name)) {
    name = `${baseName}${counter}`;
    counter++;
  }

  return name;
}

/**
 * Multi-select info panel component
 */
interface MultiSelectPanelProps {
  selectedNodes: GradleTaskNodeType[];
  onDelete: () => void;
}

function MultiSelectPanel({ selectedNodes, onDelete }: MultiSelectPanelProps) {
  return (
    <div className="multi-select-panel">
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
 * Inner canvas component that uses React Flow hooks
 */
function TaskGraphCanvasInner() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const [nodes, setNodes, onNodesChange] = useNodesState<AppNode>(sampleNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<GradleEdge>(sampleEdges);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [, setDraggedTaskType] = useState<GradleTaskType | null>(null);

  // Get the selected nodes from the node list
  const selectedNodes = useMemo(() => {
    return nodes.filter(
      (n): n is GradleTaskNodeType =>
        n.type === 'gradleTask' && selectedNodeIds.includes(n.id)
    );
  }, [nodes, selectedNodeIds]);

  // Get the first selected node for the property panel
  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  // Get all gradle task nodes for the node picker
  const allGradleNodes = useMemo(() => {
    return nodes.filter((n): n is GradleTaskNodeType => n.type === 'gradleTask');
  }, [nodes]);

  // Get existing task names for unique name generation
  const existingTaskNames = useMemo(() => {
    return new Set(allGradleNodes.map((n) => n.data.taskName));
  }, [allGradleNodes]);

  /**
   * Handle selection changes to track selected nodes
   */
  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    const gradleNodeIds = selected
      .filter((node) => node.type === 'gradleTask')
      .map((node) => node.id);
    setSelectedNodeIds(gradleNodeIds);
  }, []);

  /**
   * Handle node click for single selection
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: AppNode) => {
      if (node.type === 'gradleTask') {
        setSelectedNodeIds([node.id]);
      }
    },
    []
  );

  /**
   * Update a node's data
   */
  const handleNodeUpdate = useCallback(
    (nodeId: string, updates: Partial<GradleTaskNodeData>) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId && node.type === 'gradleTask') {
            return {
              ...node,
              data: {
                ...node.data,
                ...updates,
              },
            };
          }
          return node;
        })
      );

      // Handle dependency updates - create/remove edges
      if ('dependsOn' in updates) {
        const newDependsOn = updates.dependsOn || [];

        setEdges((eds) => {
          // Remove existing edges where this node is the target with dependsOn type
          const filtered = eds.filter(
            (e) => !(e.target === nodeId && e.data?.dependencyType === 'dependsOn')
          );

          // Add new edges for the dependencies
          const newEdges: GradleEdge[] = newDependsOn.map((sourceId) => ({
            id: `${sourceId}-${nodeId}`,
            source: sourceId,
            target: nodeId,
            data: { dependencyType: 'dependsOn' as const },
          }));

          return [...filtered, ...newEdges];
        });
      }
    },
    [setNodes, setEdges]
  );

  /**
   * Delete a node by ID
   */
  const handleNodeDelete = useCallback(
    (nodeId: string) => {
      // Remove the node
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));

      // Remove connected edges
      setEdges((eds) =>
        eds.filter((e) => e.source !== nodeId && e.target !== nodeId)
      );

      // Clear selection
      setSelectedNodeIds((ids) => ids.filter((id) => id !== nodeId));
    },
    [setNodes, setEdges]
  );

  /**
   * Delete all selected nodes
   */
  const handleDeleteSelected = useCallback(() => {
    const selectedIdSet = new Set(selectedNodeIds);

    // Remove nodes
    setNodes((nds) => nds.filter((n) => !selectedIdSet.has(n.id)));

    // Remove connected edges
    setEdges((eds) =>
      eds.filter((e) => !selectedIdSet.has(e.source) && !selectedIdSet.has(e.target))
    );

    // Clear selection
    setSelectedNodeIds([]);
  }, [selectedNodeIds, setNodes, setEdges]);

  /**
   * Handle new edge connections
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge: GradleEdge = {
        ...connection,
        id: `${connection.source}-${connection.target}`,
        data: { dependencyType: 'dependsOn' },
      } as GradleEdge;
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges]
  );

  /**
   * Handle keyboard events for deletion
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeIds.length > 0) {
        // Don't delete if focus is on an input
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement
        ) {
          return;
        }
        event.preventDefault();
        handleDeleteSelected();
      }
    },
    [selectedNodeIds, handleDeleteSelected]
  );

  /**
   * Handle drag start from palette
   */
  const handlePaletteDragStart = useCallback((taskType: GradleTaskType) => {
    setDraggedTaskType(taskType);
  }, []);

  /**
   * Handle drag over the canvas
   */
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  /**
   * Handle drop on the canvas to create a new node
   */
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const taskType = event.dataTransfer.getData('application/reactflow') as GradleTaskType;
      if (!taskType) return;

      // Get the position where the node was dropped
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      // Generate unique ID and name
      const nodeId = generateNodeId();
      const taskName = generateTaskName(taskType, existingTaskNames);

      // Create the new node with default configuration
      const newNode: GradleTaskNodeType = {
        id: nodeId,
        type: 'gradleTask',
        position,
        data: {
          taskName,
          taskType,
          enabled: true,
          config: { ...defaultTaskConfigs[taskType] },
        },
      };

      // Add the node to the graph
      setNodes((nds) => [...nds, newNode]);

      // Select the new node
      setSelectedNodeIds([nodeId]);
      setDraggedTaskType(null);
    },
    [screenToFlowPosition, existingTaskNames, setNodes]
  );

  return (
    <div className="task-graph-container" onKeyDown={onKeyDown} tabIndex={0}>
      {/* Node palette sidebar */}
      <NodePalette onDragStart={handlePaletteDragStart} />

      {/* Canvas wrapper */}
      <div
        className="canvas-wrapper"
        ref={reactFlowWrapper}
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow<AppNode, GradleEdge>
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onSelectionChange={onSelectionChange}
          onNodeClick={onNodeClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          selectionMode={SelectionMode.Partial}
          selectNodesOnDrag={false}
          selectionOnDrag
          panOnDrag={[1, 2]}
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

      {/* Show multi-select panel when multiple nodes are selected */}
      {selectedNodes.length > 1 && (
        <MultiSelectPanel
          selectedNodes={selectedNodes}
          onDelete={handleDeleteSelected}
        />
      )}

      {/* Show property panel for single selection or empty state */}
      {selectedNodes.length <= 1 && (
        <PropertyPanel
          selectedNode={selectedNode}
          allNodes={allGradleNodes}
          onNodeUpdate={handleNodeUpdate}
          onNodeDelete={handleNodeDelete}
        />
      )}
    </div>
  );
}

/**
 * Main canvas component wrapped with ReactFlowProvider
 */
export function TaskGraphCanvas() {
  return (
    <ReactFlowProvider>
      <TaskGraphCanvasInner />
    </ReactFlowProvider>
  );
}
