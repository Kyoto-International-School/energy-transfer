import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
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
import type { IsValidConnection } from "@xyflow/system";
import "./App.css";

import { Sidebar } from "./components/Sidebar";
import { ContainerNode } from "./components/nodes/ContainerNode";
import { StoreNode } from "./components/nodes/StoreNode";
import { ExternalNode } from "./components/nodes/ExternalNode";
import { LabeledArrowEdge } from "./components/edges/LabeledArrowEdge";
import { EasyConnectionLine } from "./components/edges/EasyConnectionLine";
import { DnDProvider, type DropTarget } from "./dnd/useDnD";
import { loadDiagram, saveDiagram } from "./storage";
import type {
  EnergyNode,
  EnergyEdgeData,
  EdgeLabel,
  EnergyNodeKind,
  StoreType,
} from "./types";

const CONTAINER_LAYOUT = {
  headerHeight: 36,
  contentPaddingTop: 2,
  contentPaddingBottom: 4,
  storeHeight: 56,
  storeGap: 64,
  widthFallback: 168,
};
const EDGE_MARKER = {
  type: MarkerType.ArrowClosed,
  color: "#0f1a1c",
  width: 20,
  height: 20,
};
const DRAG_HANDLE_SELECTOR = ".node-drag-handle";
const DRAG_HOLD_DELAY = 220;
const DRAG_HOLD_CANCEL_DISTANCE = 6;
const DRAG_HOLD_THRESHOLD = Number.POSITIVE_INFINITY;
const SNAP_GRID: [number, number] = [8, 8];
const MINIMAP_SIZE_SMALL = { width: 80, height: 60 };
const MINIMAP_SIZE_LARGE = { width: 200, height: 150 };

function updateContainerSizing(nodes: EnergyNode[]): EnergyNode[] {
  const {
    headerHeight,
    contentPaddingTop,
    contentPaddingBottom,
    storeHeight,
    storeGap,
    widthFallback,
  } = CONTAINER_LAYOUT;
  const emptyHeight =
    headerHeight + contentPaddingTop + contentPaddingBottom + storeHeight;
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
      storeCount > 0
        ? headerHeight +
          contentPaddingTop +
          contentPaddingBottom +
          storeCount * storeHeight +
          Math.max(0, storeCount - 1) * storeGap
        : emptyHeight;
    const width = node.measured?.width ?? node.width ?? widthFallback;

    containerMetrics.set(node.id, { width, height, storeCount });
  });

  return nodes.map((node) => {
    const baseNode: EnergyNode = {
      ...node,
      dragHandle:
        node.data.kind === "store"
          ? undefined
          : (node.dragHandle ?? DRAG_HANDLE_SELECTOR),
    };
    if (node.data.kind === "store" && node.parentId) {
      const metrics = containerMetrics.get(node.parentId);
      const siblings = storesByParent.get(node.parentId) ?? [];
      const index = siblings.findIndex((store) => store.id === node.id);
      const width = metrics?.width ?? widthFallback;
      const y =
        headerHeight +
        contentPaddingTop +
        storeHeight / 2 +
        Math.max(index, 0) * (storeHeight + storeGap);
      const x = width / 2;
      const extent: EnergyNode["extent"] = "parent";
      const origin: EnergyNode["origin"] = [0.5, 0.5];

      return {
        ...baseNode,
        position: { x, y },
        draggable: false,
        extent,
        origin,
        domAttributes: {
          ...baseNode.domAttributes,
          "data-parent-id": node.parentId,
        } as EnergyNode["domAttributes"],
      };
    }
    if (node.data.kind !== "container") return baseNode;
    const metrics = containerMetrics.get(node.id);
    const height = metrics?.height ?? emptyHeight;

    return {
      ...baseNode,
      style: {
        ...baseNode.style,
        height,
        minHeight: height,
        "--container-header-height": `${headerHeight}px`,
        "--container-content-pt": `${contentPaddingTop}px`,
        "--container-content-pb": `${contentPaddingBottom}px`,
      },
      domAttributes: {
        ...baseNode.domAttributes,
        "data-container-id": node.id,
      } as EnergyNode["domAttributes"],
      data: {
        ...baseNode.data,
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
    data: { label: "Unlabeled", kind: "container" },
    domAttributes: {
      "data-container-id": "node-1",
    } as EnergyNode["domAttributes"],
  },
  {
    id: "node-2",
    type: "store",
    position: { x: 380, y: 260 },
    data: { label: "Select store", kind: "store", storeType: "" },
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
    label: "Select transfer",
    markerEnd: EDGE_MARKER,
  },
];

const normalizeEdges = (edges: EnergyEdge[]): EnergyEdge[] =>
  edges.map((edge) => ({
    ...edge,
    data: { label: edge.data?.label ?? "" },
    label: edge.label ?? "Select transfer",
    type: edge.type ?? "labeledArrow",
    markerEnd: edge.markerEnd ?? EDGE_MARKER,
    markerStart: undefined,
  }));

const nodeTypes: NodeTypes = {
  container: ContainerNode as NodeTypes[string],
  store: StoreNode as NodeTypes[string],
  external: ExternalNode as NodeTypes[string],
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
  const [dragHoldNodeId, setDragHoldNodeId] = useState<string | null>(null);
  const [dragHoldActive, setDragHoldActive] = useState(false);
  const [isMiniMapLarge, setIsMiniMapLarge] = useState(true);
  const selectionTimestampRef = useRef(0);
  const pointerDownOnElementRef = useRef<"node" | "edge" | "handle" | null>(
    null,
  );
  const dragHoldTimerRef = useRef<number | null>(null);
  const dragHoldPointerIdRef = useRef<number | null>(null);
  const dragHoldStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragHoldStateRef = useRef<{ active: boolean; nodeId: string | null }>({
    active: false,
    nodeId: null,
  });
  const debugTouch = useMemo(() => {
    if (typeof window === "undefined") return false;
    if ((window as { DEBUG_TOUCH?: boolean }).DEBUG_TOUCH) return true;
    const params = new URLSearchParams(window.location.search);
    if (params.get("debugTouch") === "1") return true;
    return window.localStorage.getItem("debug-touch") === "1";
  }, []);
  const nodeIdRef = useRef(getNextNodeId(initialNodes));
  const { setViewport, getViewport } = useReactFlow();

  const logTouch = useCallback(
    (label: string, detail?: Record<string, unknown>) => {
      if (!debugTouch) return;
      if (detail) {
        console.log(`[touch-debug] ${label}`, detail);
      } else {
        console.log(`[touch-debug] ${label}`);
      }
    },
    [debugTouch],
  );

  const clearDragHold = useCallback(
    (reason?: string) => {
      if (dragHoldTimerRef.current) {
        window.clearTimeout(dragHoldTimerRef.current);
        dragHoldTimerRef.current = null;
      }
      dragHoldPointerIdRef.current = null;
      dragHoldStartRef.current = null;
      if (dragHoldStateRef.current.active || dragHoldStateRef.current.nodeId) {
        logTouch("drag-hold cleared", { reason });
      }
      dragHoldStateRef.current = { active: false, nodeId: null };
      setDragHoldActive(false);
      setDragHoldNodeId(null);
    },
    [logTouch],
  );

  const selectNodeById = useCallback(
    (nodeId: string | null, meta?: Record<string, unknown>) => {
      if (!nodeId) {
        return;
      }
      setNodes((current) =>
        current.map((node) => {
          const shouldSelect = node.id === nodeId;
          if (node.selected === shouldSelect) return node;
          return { ...node, selected: shouldSelect };
        }),
      );
      setEdges((current) =>
        current.map((edge) => {
          if (!edge.selected) return edge;
          return { ...edge, selected: false };
        }),
      );
      setSelectedNodeId(nodeId);
      setSelectedEdgeId(null);
      selectionTimestampRef.current = performance.now();
      logTouch("select-node", { nodeId, ...meta });
    },
    [logTouch, setEdges, setNodes],
  );

  const selectEdgeById = useCallback(
    (edgeId: string | null, meta?: Record<string, unknown>) => {
      if (!edgeId) {
        return;
      }
      setEdges((current) =>
        current.map((edge) => {
          const shouldSelect = edge.id === edgeId;
          if (edge.selected === shouldSelect) return edge;
          return { ...edge, selected: shouldSelect };
        }),
      );
      setNodes((current) =>
        current.map((node) => {
          if (!node.selected) return node;
          return { ...node, selected: false };
        }),
      );
      setSelectedEdgeId(edgeId);
      setSelectedNodeId(null);
      selectionTimestampRef.current = performance.now();
      logTouch("select-edge", { edgeId, ...meta });
    },
    [logTouch, setEdges, setNodes],
  );

  const clearSelection = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    setNodes((current) =>
      current.map((node) => {
        if (!node.selected) return node;
        return { ...node, selected: false };
      }),
    );
    setEdges((current) =>
      current.map((edge) => {
        if (!edge.selected) return edge;
        return { ...edge, selected: false };
      }),
    );
    logTouch("clear-selection");
  }, [logTouch, setEdges, setNodes]);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );
  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );
  const renderedNodes = useMemo(() => {
    if (!dragHoldNodeId) return nodes;
    return nodes.map((node) => {
      if (node.id !== dragHoldNodeId) return node;
      const existing = node.className ?? "";
      if (existing.split(" ").includes("node-drag-hold")) {
        return node;
      }
      const className = existing
        ? `${existing} node-drag-hold`
        : "node-drag-hold";
      return { ...node, className };
    });
  }, [dragHoldNodeId, nodes]);

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

  useEffect(() => {
    dragHoldStateRef.current = {
      active: dragHoldActive,
      nodeId: dragHoldNodeId,
    };
  }, [dragHoldActive, dragHoldNodeId]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      const targetNode = target?.closest(".react-flow__node");
      const targetEdge = target?.closest(".react-flow__edge");
      const targetHandle = target?.closest(".react-flow__handle");
      const dragHandle = target?.closest(".node-drag-handle");
      if (!target) {
        pointerDownOnElementRef.current = null;
        logTouch("pointer-down (no target)", {
          pointerType: event.pointerType,
        });
        return;
      }

      if (dragHandle && event.isPrimary && event.button === 0) {
        const nodeId = dragHandle
          .closest(".react-flow__node")
          ?.getAttribute("data-id");
        if (nodeId) {
          clearDragHold("restart");
          dragHoldPointerIdRef.current = event.pointerId;
          dragHoldStartRef.current = { x: event.clientX, y: event.clientY };
          dragHoldTimerRef.current = window.setTimeout(() => {
            if (dragHoldPointerIdRef.current !== event.pointerId) return;
            dragHoldTimerRef.current = null;
            setDragHoldActive(true);
            setDragHoldNodeId(nodeId);
            dragHoldStateRef.current = { active: true, nodeId };
            logTouch("drag-hold active", { nodeId });
          }, DRAG_HOLD_DELAY);
        }
      }

      if (targetHandle) {
        pointerDownOnElementRef.current = "handle";
        logTouch("pointer-down on handle", {
          pointerType: event.pointerType,
          handleId: targetHandle.getAttribute("data-handleid"),
          nodeId: targetHandle.getAttribute("data-nodeid"),
        });
        return;
      }

      if (targetNode) {
        pointerDownOnElementRef.current = "node";
        logTouch("pointer-down on node", {
          pointerType: event.pointerType,
          nodeId: targetNode.getAttribute("data-id"),
        });
        return;
      }
      if (targetEdge) {
        pointerDownOnElementRef.current = "edge";
        logTouch("pointer-down on edge", {
          pointerType: event.pointerType,
          edgeId: targetEdge.getAttribute("data-id"),
        });
        return;
      }

      pointerDownOnElementRef.current = null;
      logTouch("pointer-down on pane", {
        pointerType: event.pointerType,
        targetTag: target.tagName,
      });
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!dragHoldTimerRef.current) return;
      if (dragHoldPointerIdRef.current !== event.pointerId) return;
      const start = dragHoldStartRef.current;
      if (!start) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.hypot(dx, dy) > DRAG_HOLD_CANCEL_DISTANCE) {
        clearDragHold("move-threshold");
      }
    };

    const handlePointerUp = () => {
      clearDragHold("pointer-up");
      setTimeout(() => {
        pointerDownOnElementRef.current = null;
      }, 450);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointermove", handlePointerMove, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("pointercancel", handlePointerUp, true);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointermove", handlePointerMove, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("pointercancel", handlePointerUp, true);
    };
  }, [clearDragHold, logTouch]);

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            type: "labeledArrow",
            data: { label: "" },
            label: "Select transfer",
            markerEnd: EDGE_MARKER,
          },
          eds,
        ),
      ),
    [setEdges],
  );

  const isValidConnection: IsValidConnection = useCallback(
    (connection): boolean => {
      if (!connection.source || !connection.target) return true;
      if (connection.source === connection.target) return false;
      const sourceNode = nodes.find((node) => node.id === connection.source);
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!sourceNode || !targetNode) return true;

      const sourceKind = sourceNode.data.kind;
      const targetKind = targetNode.data.kind;

      if (sourceKind === "container" || targetKind === "container") {
        return false;
      }

      const isExternalToStore =
        sourceKind === "external" && targetKind === "store";
      const isStoreToExternal =
        sourceKind === "store" && targetKind === "external";
      const isStoreToStore = sourceKind === "store" && targetKind === "store";

      if (isStoreToStore) {
        const inSameContainer =
          !!sourceNode.parentId && sourceNode.parentId === targetNode.parentId;

        if (inSameContainer) {
          const siblings = nodes
            .filter(
              (node) =>
                node.data.kind === "store" &&
                node.parentId === sourceNode.parentId,
            )
            .sort((a, b) => {
              if (a.position.y !== b.position.y) {
                return a.position.y - b.position.y;
              }
              if (a.position.x !== b.position.x) {
                return a.position.x - b.position.x;
              }
              return a.id.localeCompare(b.id);
            });
          const sourceIndex = siblings.findIndex(
            (node) => node.id === sourceNode.id,
          );
          const targetIndex = siblings.findIndex(
            (node) => node.id === targetNode.id,
          );
          if (sourceIndex === -1 || targetIndex === -1) {
            return false;
          }

          return Math.abs(sourceIndex - targetIndex) === 1;
        }
      }

      return isExternalToStore || isStoreToExternal || isStoreToStore;
    },
    [nodes],
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
      const now = performance.now();
      if (!selection.nodes.length && !selection.edges.length) {
        if (now - selectionTimestampRef.current < 350) {
          logTouch("selection-change ignored (recent selection)", {
            elapsed: now - selectionTimestampRef.current,
          });
          return;
        }
      }
      const selectedNodeIds = new Set(selection.nodes.map((node) => node.id));
      const selectedEdgeIds = new Set(selection.edges.map((edge) => edge.id));
      setNodes((current) =>
        current.map((node) => {
          const shouldSelect = selectedNodeIds.has(node.id);
          if (node.selected === shouldSelect) return node;
          return { ...node, selected: shouldSelect };
        }),
      );
      setEdges((current) =>
        current.map((edge) => {
          const shouldSelect = selectedEdgeIds.has(edge.id);
          if (edge.selected === shouldSelect) return edge;
          return { ...edge, selected: shouldSelect };
        }),
      );
      setSelectedNodeId(selection.nodes[0]?.id ?? null);
      setSelectedEdgeId(selection.edges[0]?.id ?? null);
      if (selection.nodes.length || selection.edges.length) {
        selectionTimestampRef.current = now;
      }
      logTouch("selection-change", {
        nodes: selection.nodes.map((node) => node.id),
        edges: selection.edges.map((edge) => edge.id),
      });
    },
    [logTouch, setEdges, setNodes],
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: EnergyNode) => {
      event.stopPropagation();
      selectNodeById(node.id, {
        source: "click",
        pointerType: (event.nativeEvent as PointerEvent).pointerType,
      });
    },
    [selectNodeById],
  );

  const handleEdgeClick = useCallback(
    (event: React.MouseEvent, edge: EnergyEdge) => {
      event.stopPropagation();
      selectEdgeById(edge.id, {
        source: "click",
        pointerType: (event.nativeEvent as PointerEvent).pointerType,
      });
    },
    [selectEdgeById],
  );

  const handlePaneClick = useCallback(
    (event: React.MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) {
        clearSelection();
        return;
      }

      if (pointerDownOnElementRef.current) {
        logTouch("pane-click ignored (pointer down on element)", {
          pointerDown: pointerDownOnElementRef.current,
        });
        return;
      }

      const pointerType = (event.nativeEvent as PointerEvent).pointerType;
      if (pointerType === "touch") {
        const elapsed = performance.now() - selectionTimestampRef.current;
        if (elapsed < 350) {
          logTouch("pane-click ignored (recent selection)", { elapsed });
          return;
        }
      }

      if (
        target.closest(".react-flow__node") ||
        target.closest(".react-flow__edge") ||
        target.closest(".react-flow__handle") ||
        target.closest(".edge-label-wrapper")
      ) {
        logTouch("pane-click ignored (hit node/edge/handle/label)");
        return;
      }

      logTouch("pane-click cleared selection");
      clearSelection();
    },
    [clearSelection, logTouch],
  );

  const onCreateNode = useCallback(
    (kind: EnergyNodeKind, position: XYPosition, dropTarget: DropTarget) => {
      if (kind === "store" && dropTarget.type !== "container-body") {
        return;
      }
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
        type:
          kind === "container"
            ? "container"
            : kind === "store"
              ? "store"
              : "external",
        position: relativePosition,
        parentId,
        extent: parentId ? ("parent" as const) : undefined,
        origin: parentId ? ([0.5, 0.5] as const) : undefined,
        draggable: parentId ? false : undefined,
        data: {
          label:
            kind === "container"
              ? "Unlabeled"
              : kind === "store"
                ? "Select store"
                : "Unlabeled",
          kind,
          storeType: kind === "store" ? "" : undefined,
        },
      };

      setNodes((current) => {
        const next = updateContainerSizing(current.concat(newNode));
        return next.map((node) => ({
          ...node,
          selected: node.id === newNode.id,
        }));
      });
      setEdges((current) =>
        current.map((edge) => {
          if (!edge.selected) return edge;
          return { ...edge, selected: false };
        }),
      );
      setSelectedNodeId(newNode.id);
      setSelectedEdgeId(null);
      selectionTimestampRef.current = performance.now();
      logTouch("select-node", { nodeId: newNode.id, source: "create-node" });
    },
    [logTouch, nodes, setEdges, setNodes],
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

      const label = storeType || "Select store";

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
                label: label || "Select transfer",
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

  const handleMiniMapClick = useCallback(
    (event: MouseEvent, _position: XYPosition) => {
      event.preventDefault();
      event.stopPropagation();
      setIsMiniMapLarge((current) => !current);
    },
    [],
  );

  const miniMapStyle = isMiniMapLarge
    ? MINIMAP_SIZE_LARGE
    : MINIMAP_SIZE_SMALL;

  return (
    <div className="app-shell">
      <Sidebar
        onCreateNode={onCreateNode}
        inspectorProps={{
          selectedNode,
          selectedEdge,
          onLabelChange,
          onStoreTypeChange,
          onEdgeLabelChange,
        }}
      />
      <main className="canvas">
        <div className="flow-wrapper">
          <ReactFlow<EnergyNode, EnergyEdge>
            nodes={renderedNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onNodeClick={handleNodeClick}
            onEdgeClick={handleEdgeClick}
            onSelectionChange={onSelectionChange}
            onPaneClick={handlePaneClick}
            onMoveEnd={onMoveEnd}
            connectionMode={ConnectionMode.Loose}
            nodeClickDistance={12}
            nodeDragThreshold={dragHoldActive ? 0 : DRAG_HOLD_THRESHOLD}
            selectNodesOnDrag={false}
            snapToGrid={true}
            snapGrid={SNAP_GRID}
            panOnDrag={selectedNode?.data.kind === "store" ? [1, 2] : true}
            connectionRadius={28}
            connectionLineComponent={EasyConnectionLine}
            zoomOnDoubleClick={false}
            defaultViewport={{ x: 0, y: 0, zoom: 10 }}
            proOptions={{ hideAttribution: true }}
          >
            <Controls />
            <MiniMap
              className={`minimap-toggle${isMiniMapLarge ? " minimap-toggle--large" : ""}`}
              onClick={handleMiniMapClick}
              style={miniMapStyle}
              ariaLabel={
                isMiniMapLarge
                  ? "Mini map, tap to shrink"
                  : "Mini map, tap to enlarge"
              }
            />
            <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
          </ReactFlow>
        </div>
      </main>
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
