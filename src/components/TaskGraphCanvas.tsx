import { useCallback, useState, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type NodeTypes,
  type EdgeTypes,
  BackgroundVariant,
  SelectionMode,
  type OnSelectionChangeParams,
  addEdge,
  type Connection,
  useReactFlow,
  ReactFlowProvider,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { GradleTaskNode } from './GradleTaskNode';
import { GradleDependencyEdge } from './GradleDependencyEdge';
import { PropertyPanel } from './PropertyPanel';
import { EdgePropertyPanel } from './EdgePropertyPanel';
import { NodePalette } from './NodePalette';
import { sampleNodes, sampleEdges } from '../data/sampleGraph';
import { validateConnection } from '../utils/graphUtils';
import {
  type GradleTaskNode as GradleTaskNodeType,
  type GradleTaskNodeData,
  type GradleEdge,
  type GradleEdgeData,
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
 * Register custom edge types for React Flow
 */
const edgeTypes: EdgeTypes = {
  dependency: GradleDependencyEdge,
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
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [, setDraggedTaskType] = useState<GradleTaskType | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);

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

  // Get the selected edge
  const selectedEdge = useMemo(() => {
    if (!selectedEdgeId) return null;
    return edges.find((e) => e.id === selectedEdgeId) || null;
  }, [edges, selectedEdgeId]);

  /**
   * Handle selection changes to track selected nodes and edges
   */
  const onSelectionChange = useCallback(
    ({ nodes: selected, edges: selectedEdges }: OnSelectionChangeParams) => {
      const gradleNodeIds = selected
        .filter((node) => node.type === 'gradleTask')
        .map((node) => node.id);
      setSelectedNodeIds(gradleNodeIds);

      // Handle edge selection
      if (selectedEdges.length > 0) {
        setSelectedEdgeId(selectedEdges[0].id);
      } else if (gradleNodeIds.length > 0) {
        // Clear edge selection when nodes are selected
        setSelectedEdgeId(null);
      }
    },
    []
  );

  /**
   * Handle node click for single selection
   */
  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: AppNode) => {
      if (node.type === 'gradleTask') {
        setSelectedNodeIds([node.id]);
        setSelectedEdgeId(null);
      }
    },
    []
  );

  /**
   * Handle edge click for selection
   */
  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: GradleEdge) => {
      setSelectedEdgeId(edge.id);
      setSelectedNodeIds([]);
    },
    []
  );

  /**
   * Handle canvas click to clear selection
   */
  const onPaneClick = useCallback(() => {
    setSelectedNodeIds([]);
    setSelectedEdgeId(null);
    setConnectionError(null);
  }, []);

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
   * Handle new edge connections with validation
   */
  const onConnect = useCallback(
    (connection: Connection) => {
      // Validate the connection
      const validation = validateConnection(allGradleNodes, edges, connection);

      if (!validation.valid) {
        setConnectionError(validation.message || 'Invalid connection');
        // Auto-clear error after 3 seconds
        setTimeout(() => setConnectionError(null), 3000);
        return;
      }

      const newEdge: GradleEdge = {
        ...connection,
        id: `${connection.source}-${connection.target}`,
        type: 'dependency',
        data: { dependencyType: 'dependsOn' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 16,
          height: 16,
        },
      } as GradleEdge;

      setEdges((eds) => addEdge(newEdge, eds));
      setConnectionError(null);
    },
    [setEdges, allGradleNodes, edges]
  );

  /**
   * Update an edge's data
   */
  const handleEdgeUpdate = useCallback(
    (edgeId: string, updates: Partial<GradleEdgeData>) => {
      setEdges((eds) =>
        eds.map((edge): GradleEdge => {
          if (edge.id === edgeId) {
            return {
              ...edge,
              data: {
                dependencyType: edge.data?.dependencyType || 'dependsOn',
                ...updates,
              },
            };
          }
          return edge;
        })
      );
    },
    [setEdges]
  );

  /**
   * Delete an edge by ID
   */
  const handleEdgeDelete = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((e) => e.id !== edgeId));
      setSelectedEdgeId(null);
    },
    [setEdges]
  );

  /**
   * Handle keyboard events for deletion
   */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        // Don't delete if focus is on an input
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement
        ) {
          return;
        }
        event.preventDefault();

        // Delete selected edge
        if (selectedEdgeId) {
          handleEdgeDelete(selectedEdgeId);
          return;
        }

        // Delete selected nodes
        if (selectedNodeIds.length > 0) {
          handleDeleteSelected();
        }
      }
    },
    [selectedNodeIds, selectedEdgeId, handleDeleteSelected, handleEdgeDelete]
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
          onEdgeClick={onEdgeClick}
          onPaneClick={onPaneClick}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          selectionMode={SelectionMode.Partial}
          selectNodesOnDrag={false}
          selectionOnDrag
          panOnDrag={[1, 2]}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          defaultEdgeOptions={{
            type: 'dependency',
            markerEnd: {
              type: MarkerType.ArrowClosed,
              width: 16,
              height: 16,
            },
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

        {/* Connection error message */}
        {connectionError && (
          <div className="connection-error">
            {connectionError}
          </div>
        )}
      </div>

      {/* Show multi-select panel when multiple nodes are selected */}
      {selectedNodes.length > 1 && (
        <MultiSelectPanel
          selectedNodes={selectedNodes}
          onDelete={handleDeleteSelected}
        />
      )}

      {/* Show edge property panel when an edge is selected */}
      {selectedEdge && selectedNodes.length === 0 && (
        <EdgePropertyPanel
          selectedEdge={selectedEdge}
          nodes={allGradleNodes}
          onEdgeUpdate={handleEdgeUpdate}
          onEdgeDelete={handleEdgeDelete}
        />
      )}

      {/* Show property panel for single node selection or empty state */}
      {selectedNodes.length <= 1 && !selectedEdge && (
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
