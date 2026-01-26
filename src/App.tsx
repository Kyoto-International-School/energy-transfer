import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  ConnectionMode,
  MiniMap,
  MarkerType,
  ReactFlow,
  ReactFlowProvider,
  addEdge,
  applyNodeChanges,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeTypes,
  type NodeTypes,
  type OnSelectionChangeParams,
  type Viewport,
  type XYPosition,
} from "@xyflow/react";
import "./App.css";

import { Inspector } from "./components/Inspector";
import { Sidebar } from "./components/Sidebar";
import { ContainerNode } from "./components/nodes/ContainerNode";
import { StoreNode } from "./components/nodes/StoreNode";
import { LabeledArrowEdge } from "./components/edges/LabeledArrowEdge";
import { DnDProvider, type DropTarget } from "./dnd/useDnD";
import { loadDiagram, saveDiagram } from "./storage";
import type {
  EnergyNode,
  EnergyEdgeData,
  EdgeLabel,
  EnergyNodeKind,
  StoreType,
} from "./types";

const CONTAINER_BASE_HEIGHT = 160;
const CONTAINER_HEADER_HEIGHT = 48;
const CONTAINER_WIDTH_FALLBACK = 224;
const STORE_STACK_SPACING = 80;
const STORE_ESTIMATED_HEIGHT = 60;
const STORE_VERTICAL_PADDING = 24;
const EDGE_MARKER = { type: MarkerType.ArrowClosed, color: "#0f1a1c" };

function updateContainerSizing(nodes: EnergyNode[]): EnergyNode[] {
  const storeCounts = new Map<string, number>();
  const storesByParent = new Map<string, EnergyNode[]>();
  const containerMetrics = new Map<
    string,
    { width: number; height: number; storeCount: number }
  >();

  nodes.forEach((node) => {
    if (node.data.kind === "container") {
      return;
    }
    if (node.data.kind === "store" && node.parentId) {
      storeCounts.set(node.parentId, (storeCounts.get(node.parentId) ?? 0) + 1);
      const list = storesByParent.get(node.parentId) ?? [];
      list.push(node);
      storesByParent.set(node.parentId, list);
    }
  });

  nodes.forEach((node) => {
    if (node.data.kind !== "container") return;
    const storeCount = storeCounts.get(node.id) ?? 0;
    const height =
      CONTAINER_BASE_HEIGHT +
      Math.max(0, storeCount - 1) * STORE_STACK_SPACING +
      (storeCount > 0 ? STORE_ESTIMATED_HEIGHT : 0);
    const width =
      node.measured?.width ?? node.width ?? CONTAINER_WIDTH_FALLBACK;

    containerMetrics.set(node.id, { width, height, storeCount });
  });

  return nodes.map((node) => {
    if (node.data.kind === "store" && node.parentId) {
      const metrics = containerMetrics.get(node.parentId);
      const siblings = storesByParent.get(node.parentId) ?? [];
      const index = siblings.findIndex((store) => store.id === node.id);
      const count = metrics?.storeCount ?? siblings.length;
      const height = metrics?.height ?? CONTAINER_BASE_HEIGHT;
      const width = metrics?.width ?? CONTAINER_WIDTH_FALLBACK;
      const bodyHeight = Math.max(
        height - CONTAINER_HEADER_HEIGHT,
        STORE_ESTIMATED_HEIGHT,
      );
      const padding = STORE_ESTIMATED_HEIGHT / 2 + STORE_VERTICAL_PADDING;
      const span = Math.max(bodyHeight - 2 * padding, 0);
      const step = count > 1 ? span / (count - 1) : 0;
      const y = CONTAINER_HEADER_HEIGHT + padding + step * Math.max(index, 0);
      const x = width / 2;
      const extent: EnergyNode["extent"] = "parent";
      const origin: EnergyNode["origin"] = [0.5, 0.5];

      return {
        ...node,
        position: { x, y },
        draggable: false,
        extent,
        origin,
        domAttributes: {
          ...node.domAttributes,
          "data-parent-id": node.parentId,
        } as EnergyNode["domAttributes"],
      };
    }
    if (node.data.kind !== "container") return node;
    const metrics = containerMetrics.get(node.id);
    const height = metrics?.height ?? CONTAINER_BASE_HEIGHT;

    return {
      ...node,
      style: {
        ...node.style,
        height,
        minHeight: height,
      },
      domAttributes: {
        ...node.domAttributes,
        "data-container-id": node.id,
      } as EnergyNode["domAttributes"],
      data: {
        ...node.data,
        storeCount: metrics?.storeCount ?? 0,
      },
    };
  });
}

const initialNodes: EnergyNode[] = updateContainerSizing([
  {
    id: "node-1",
    type: "container",
    position: { x: 120, y: 140 },
    data: { label: "Unlabeled container", kind: "container" },
    domAttributes: {
      "data-container-id": "node-1",
    } as EnergyNode["domAttributes"],
  },
  {
    id: "node-2",
    type: "store",
    position: { x: 380, y: 260 },
    data: { label: "Select store type", kind: "store", storeType: "" },
  },
]);

type EnergyEdge = Edge<EnergyEdgeData>;

const initialEdges: EnergyEdge[] = [
  {
    id: "edge-1",
    source: "node-1",
    target: "node-2",
    type: "labeledArrow",
    data: { label: "" },
    label: "Select edge type",
    markerEnd: EDGE_MARKER,
  },
];

const normalizeEdges = (edges: EnergyEdge[]): EnergyEdge[] =>
  edges.map((edge) => ({
    ...edge,
    data: { label: edge.data?.label ?? "" },
    label: edge.label ?? "Select edge type",
    type: edge.type ?? "labeledArrow",
    markerEnd: edge.markerEnd ?? EDGE_MARKER,
    markerStart: undefined,
  }));

const nodeTypes: NodeTypes = {
  container: ContainerNode as NodeTypes[string],
  store: StoreNode as NodeTypes[string],
};

const edgeTypes: EdgeTypes = {
  labeledArrow: LabeledArrowEdge as EdgeTypes[string],
};

const getNextNodeId = (nodes: EnergyNode[]) => {
  return (
    nodes.reduce((maxId, node) => {
      const match = node.id.match(/^node-(\d+)$/);
      if (!match) return maxId;
      return Math.max(maxId, Number.parseInt(match[1], 10));
    }, 0) + 1
  );
};

function Editor() {
  const [nodes, setNodes] = useNodesState<EnergyNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<EnergyEdge>(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [viewport, setViewportState] = useState<Viewport | null>(null);
  const nodeIdRef = useRef(getNextNodeId(initialNodes));
  const { setViewport, getViewport } = useReactFlow();

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  useEffect(() => {
    const saved = loadDiagram();
    if (saved) {
      setNodes(updateContainerSizing(saved.nodes));
      setEdges(normalizeEdges(saved.edges as EnergyEdge[]));
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
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "labeledArrow",
            data: { label: "" },
            label: "Select edge type",
            markerEnd: EDGE_MARKER,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const onNodesChange = useCallback(
    (changes: Parameters<typeof applyNodeChanges>[0]) => {
      setNodes((current) => {
        const next = applyNodeChanges(changes, current) as EnergyNode[];
        return updateContainerSizing(next);
      });
    },
    [setNodes],
  );

  const onSelectionChange = useCallback(
    (selection: OnSelectionChangeParams<EnergyNode, EnergyEdge>) => {
      setSelectedNodeId(selection.nodes[0]?.id ?? null);
      setSelectedEdgeId(selection.edges[0]?.id ?? null);
    },
    [],
  );

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const onCreateNode = useCallback(
    (kind: EnergyNodeKind, position: XYPosition, dropTarget: DropTarget) => {
      const nextId = nodeIdRef.current;
      nodeIdRef.current += 1;

      const parentId =
        kind === "store" && dropTarget.type === "container-body"
          ? dropTarget.nodeId
          : undefined;
      const parentNode = parentId
        ? nodes.find((node) => node.id === parentId)
        : null;
      const relativePosition =
        parentNode && parentId
          ? {
              x: position.x - parentNode.position.x,
              y: position.y - parentNode.position.y,
            }
          : position;

      const newNode: EnergyNode = {
        id: `node-${nextId}`,
        type: kind === "container" ? "container" : "store",
        position: relativePosition,
        parentId,
        extent: parentId ? ("parent" as const) : undefined,
        origin: parentId ? ([0.5, 0.5] as const) : undefined,
        draggable: parentId ? false : undefined,
        data: {
          label:
            kind === "container" ? "Unlabeled container" : "Select store type",
          kind,
          storeType: kind === "store" ? "" : undefined,
        },
      };

      setNodes((current) => updateContainerSizing(current.concat(newNode)));
      setSelectedNodeId(newNode.id);
    },
    [nodes, setNodes],
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

  const onStoreTypeChange = useCallback(
    (storeType: StoreType | "") => {
      if (!selectedNodeId) return;

      const label = storeType || "Select store type";

      setNodes((current) =>
        current.map((node) =>
          node.id === selectedNodeId
            ? { ...node, data: { ...node.data, storeType, label } }
            : node,
        ),
      );
    },
    [selectedNodeId, setNodes],
  );

  const onEdgeLabelChange = useCallback(
    (label: EdgeLabel | "") => {
      if (!selectedEdgeId) return;

      setEdges((current) =>
        current.map((edge) =>
          edge.id === selectedEdgeId
            ? {
                ...edge,
                data: { ...edge.data, label },
                label: label || "Select edge type",
              }
            : edge,
        ),
      );
    },
    [selectedEdgeId, setEdges],
  );

  const onMoveEnd = useCallback((_: unknown, nextViewport: Viewport) => {
    setViewportState(nextViewport);
  }, []);

  return (
    <div className="app-shell">
      <Sidebar onCreateNode={onCreateNode} />
      <main className="canvas">
        <div className="flow-wrapper">
          <ReactFlow<EnergyNode, EnergyEdge>
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onSelectionChange={onSelectionChange}
            onPaneClick={clearSelection}
            onMoveEnd={onMoveEnd}
            connectionMode={ConnectionMode.Loose}
            defaultViewport={{ x: 0, y: 0, zoom: 10 }}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <MiniMap />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </main>
      <Inspector
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onLabelChange={onLabelChange}
        onStoreTypeChange={onStoreTypeChange}
        onEdgeLabelChange={onEdgeLabelChange}
      />
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
