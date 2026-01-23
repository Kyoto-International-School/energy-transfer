import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import "./App.css";

import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { DnDProvider } from "./dnd/useDnD";
import { loadDiagram, saveDiagram } from "./storage";
import type { EnergyNodeData, EnergyNodeKind } from "./types";

const initialNodes: Node<EnergyNodeData>[] = [
  {
    id: "node-1",
    position: { x: 120, y: 140 },
    data: { label: "Container 1", kind: "container" },
  },
  {
    id: "node-2",
    position: { x: 380, y: 260 },
    data: { label: "Store 1", kind: "store" },
  },
];

const initialEdges: Edge[] = [
  { id: "edge-1", source: "node-1", target: "node-2" },
];

type SelectionChange = {
  nodes: Array<Node<EnergyNodeData>>;
  edges: Edge[];
};

const getNextNodeId = (nodes: Array<Node<EnergyNodeData>>) => {
  return (
    nodes.reduce((maxId, node) => {
      const match = node.id.match(/^node-(\d+)$/);
      if (!match) return maxId;
      return Math.max(maxId, Number.parseInt(match[1], 10));
    }, 0) + 1
  );
};

function Editor() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<EnergyNodeData>(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [viewport, setViewportState] = useState<Viewport | null>(null);
  const nodeIdRef = useRef(getNextNodeId(initialNodes));
  const { setViewport, getViewport } = useReactFlow();

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  useEffect(() => {
    const saved = loadDiagram();
    if (saved) {
      setNodes(saved.nodes);
      setEdges(saved.edges);
      if (saved.viewport) {
        setViewport(saved.viewport);
        setViewportState(saved.viewport);
      }
    } else {
      setViewportState(getViewport());
    }
  }, [getViewport, setEdges, setNodes, setViewport]);

  useEffect(() => {
    if (!viewport) return;
    saveDiagram({ nodes, edges, viewport });
  }, [nodes, edges, viewport]);

  useEffect(() => {
    nodeIdRef.current = getNextNodeId(nodes);
  }, [nodes]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  const onSelectionChange = useCallback((selection: SelectionChange) => {
    setSelectedNodeId(selection.nodes[0]?.id ?? null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const onCreateNode = useCallback(
    (kind: EnergyNodeKind, position: XYPosition) => {
      const nextId = nodeIdRef.current;
      nodeIdRef.current += 1;

      const labelBase = kind === "container" ? "Container" : "Store";
      const newNode: Node<EnergyNodeData> = {
        id: `node-${nextId}`,
        position,
        data: {
          label: `${labelBase} ${nextId}`,
          kind,
        },
      };

      setNodes((current) => current.concat(newNode));
      setSelectedNodeId(newNode.id);
    },
    [setNodes],
  );

  const onLabelChange = useCallback(
    (label: string) => {
      if (!selectedNodeId) return;

      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, label } }
            : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  const onMoveEnd = useCallback(
    (_: unknown, nextViewport: Viewport) => {
      setViewportState(nextViewport);
    },
    [],
  );

  return (
    <div className="app-shell">
      <Sidebar onCreateNode={onCreateNode} />
      <main className="canvas">
        <div className="flow-wrapper">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onPaneClick={clearSelection}
            onMoveEnd={onMoveEnd}
            fitView
          >
            <Controls />
            <MiniMap />
            <Background variant="dots" gap={16} size={1} />
          </ReactFlow>
        </div>
      </main>
      <Inspector selectedNode={selectedNode} onLabelChange={onLabelChange} />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <DnDProvider>
        <Editor />
      </DnDProvider>
    </ReactFlowProvider>
  );
}
