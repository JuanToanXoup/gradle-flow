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
import { VariablesPanel } from './VariablesPanel';
import { ExecutionPanel } from './ExecutionPanel';
import { sampleNodes, sampleEdges } from '../data/sampleGraph';
import { validateConnection } from '../utils/graphUtils';
import {
  createInitialExecutionState,
  getExecutionOrder,
  simulateTaskExecution,
  createLogEntry,
} from '../utils/executionUtils';
import { shouldExecuteTask } from '../utils/conditionUtils';
import {
  type GradleTaskNode as GradleTaskNodeType,
  type GradleTaskNodeData,
  type GradleEdge,
  type GradleEdgeData,
  type AppNode,
  type GradleTaskType,
  type Variable,
  type ExecutionState,
  type TaskExecutionStatus,
  defaultTaskConfigs,
  systemVariables,
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
  const [variables, setVariables] = useState<Variable[]>([...systemVariables]);
  const [variablesPanelExpanded, setVariablesPanelExpanded] = useState(true);
  const [executionState, setExecutionState] = useState<ExecutionState>(
    createInitialExecutionState()
  );
  const [executionPanelExpanded, setExecutionPanelExpanded] = useState(true);
  const abortControllerRef = useRef<AbortController | null>(null);

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
   * Update node execution status
   */
  const updateNodeExecutionStatus = useCallback(
    (nodeId: string, status: TaskExecutionStatus) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId && node.type === 'gradleTask') {
            return {
              ...node,
              data: {
                ...node.data,
                executionStatus: status,
              },
            };
          }
          return node;
        })
      );
    },
    [setNodes]
  );

  /**
   * Clear all node execution statuses
   */
  const clearNodeExecutionStatuses = useCallback(() => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.type === 'gradleTask') {
          return {
            ...node,
            data: {
              ...node.data,
              executionStatus: 'idle' as TaskExecutionStatus,
            },
          };
        }
        return node;
      })
    );
  }, [setNodes]);

  /**
   * Run execution for the specified tasks or all tasks
   */
  const handleRun = useCallback(
    async (taskIds?: string[]) => {
      // Calculate execution order
      const order = getExecutionOrder(allGradleNodes, edges, taskIds);

      if (order.length === 0) {
        setExecutionState((prev) => ({
          ...prev,
          logs: [
            ...prev.logs,
            createLogEntry('warn', 'No tasks to execute'),
          ],
        }));
        return;
      }

      // Create abort controller for stopping execution
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // Initialize execution state
      const initialResults = new Map<string, {
        taskId: string;
        taskName: string;
        status: TaskExecutionStatus;
      }>();
      order.forEach((taskId) => {
        const node = allGradleNodes.find((n) => n.id === taskId);
        if (node) {
          initialResults.set(taskId, {
            taskId,
            taskName: node.data.taskName,
            status: 'pending',
          });
          updateNodeExecutionStatus(taskId, 'pending');
        }
      });

      setExecutionState({
        isRunning: true,
        isPaused: false,
        startTime: Date.now(),
        executionOrder: order,
        taskResults: initialResults,
        logs: [createLogEntry('info', `Starting execution of ${order.length} tasks...`)],
      });

      // Execute tasks in order
      for (const taskId of order) {
        // Check for abort
        if (abortController.signal.aborted) {
          break;
        }

        // Wait while paused
        while (
          !abortController.signal.aborted &&
          abortControllerRef.current === abortController
        ) {
          const state = await new Promise<ExecutionState>((resolve) => {
            setExecutionState((prev) => {
              resolve(prev);
              return prev;
            });
          });
          if (!state.isPaused) break;
          await new Promise((r) => setTimeout(r, 100));
        }

        if (abortController.signal.aborted) break;

        const node = allGradleNodes.find((n) => n.id === taskId);
        if (!node) continue;

        // Check if task should be executed based on conditions
        const conditionResult = shouldExecuteTask(node.data.condition, variables);
        if (!conditionResult.execute) {
          // Skip this task due to condition
          updateNodeExecutionStatus(taskId, 'skipped');
          setExecutionState((prev) => ({
            ...prev,
            taskResults: new Map(prev.taskResults).set(taskId, {
              taskId,
              taskName: node.data.taskName,
              status: 'skipped',
            }),
            logs: [
              ...prev.logs,
              createLogEntry(
                'warn',
                `Skipping task: ${node.data.taskName} - ${conditionResult.reason}`,
                taskId,
                node.data.taskName
              ),
            ],
          }));
          continue;
        }

        // Update status to running
        updateNodeExecutionStatus(taskId, 'running');
        setExecutionState((prev) => ({
          ...prev,
          currentTaskId: taskId,
          taskResults: new Map(prev.taskResults).set(taskId, {
            taskId,
            taskName: node.data.taskName,
            status: 'running',
            startTime: Date.now(),
          }),
          logs: [...prev.logs, createLogEntry('info', `Running task: ${node.data.taskName}`, taskId, node.data.taskName)],
        }));

        // Simulate task execution
        const startTime = Date.now();
        const result = await simulateTaskExecution(node, (output) => {
          setExecutionState((prev) => ({
            ...prev,
            logs: [...prev.logs, createLogEntry('info', output, taskId, node.data.taskName)],
          }));
        });

        const endTime = Date.now();
        const duration = endTime - startTime;
        const status: TaskExecutionStatus = result.success ? 'success' : 'failed';

        // Update node and execution state
        updateNodeExecutionStatus(taskId, status);
        setExecutionState((prev) => ({
          ...prev,
          taskResults: new Map(prev.taskResults).set(taskId, {
            taskId,
            taskName: node.data.taskName,
            status,
            startTime,
            endTime,
            duration,
            output: result.output,
            error: result.error,
          }),
          logs: [
            ...prev.logs,
            createLogEntry(
              result.success ? 'success' : 'error',
              result.success ? `Task ${node.data.taskName} completed` : `Task ${node.data.taskName} failed: ${result.error}`,
              taskId,
              node.data.taskName
            ),
          ],
        }));

        // Stop on failure
        if (!result.success) {
          // Mark remaining tasks as skipped
          const currentIndex = order.indexOf(taskId);
          for (let i = currentIndex + 1; i < order.length; i++) {
            const skipId = order[i];
            const skipNode = allGradleNodes.find((n) => n.id === skipId);
            if (skipNode) {
              updateNodeExecutionStatus(skipId, 'skipped');
              setExecutionState((prev) => ({
                ...prev,
                taskResults: new Map(prev.taskResults).set(skipId, {
                  taskId: skipId,
                  taskName: skipNode.data.taskName,
                  status: 'skipped',
                }),
              }));
            }
          }
          break;
        }
      }

      // Mark execution as complete
      setExecutionState((prev) => ({
        ...prev,
        isRunning: false,
        isPaused: false,
        endTime: Date.now(),
        currentTaskId: undefined,
        logs: [...prev.logs, createLogEntry('info', 'Execution finished')],
      }));

      abortControllerRef.current = null;
    },
    [allGradleNodes, edges, updateNodeExecutionStatus, variables]
  );

  /**
   * Stop execution
   */
  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setExecutionState((prev) => ({
      ...prev,
      isRunning: false,
      isPaused: false,
      logs: [...prev.logs, createLogEntry('warn', 'Execution stopped by user')],
    }));
  }, []);

  /**
   * Pause execution
   */
  const handlePause = useCallback(() => {
    setExecutionState((prev) => ({
      ...prev,
      isPaused: true,
      logs: [...prev.logs, createLogEntry('info', 'Execution paused')],
    }));
  }, []);

  /**
   * Resume execution
   */
  const handleResume = useCallback(() => {
    setExecutionState((prev) => ({
      ...prev,
      isPaused: false,
      logs: [...prev.logs, createLogEntry('info', 'Execution resumed')],
    }));
  }, []);

  /**
   * Reset execution state
   */
  const handleReset = useCallback(() => {
    clearNodeExecutionStatuses();
    setExecutionState(createInitialExecutionState());
  }, [clearNodeExecutionStatuses]);

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
      {/* Left sidebar with palette, variables, and execution */}
      <div className="left-sidebar">
        <NodePalette onDragStart={handlePaletteDragStart} />
        <VariablesPanel
          variables={variables}
          onVariablesChange={setVariables}
          isExpanded={variablesPanelExpanded}
          onToggleExpanded={() => setVariablesPanelExpanded((prev) => !prev)}
        />
        <ExecutionPanel
          executionState={executionState}
          nodes={allGradleNodes}
          selectedTaskIds={selectedNodeIds}
          onRun={handleRun}
          onStop={handleStop}
          onPause={handlePause}
          onResume={handleResume}
          onReset={handleReset}
          isExpanded={executionPanelExpanded}
          onToggleExpanded={() => setExecutionPanelExpanded((prev) => !prev)}
        />
      </div>

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
          variables={variables}
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
