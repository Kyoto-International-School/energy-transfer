import { memo, useMemo, useState, type CSSProperties } from "react";
import {
  Position,
  useConnection,
  useStore,
  type NodeProps,
} from "@xyflow/react";

import { BaseNode } from "../base-node";
import { BaseHandle } from "../base-handle";
import type { EnergyNode } from "../../types";

export const ExternalNode = memo(function ExternalNode({
  id,
  data,
  selected,
}: NodeProps<EnergyNode>) {
  const roleLabel = data.label || "Unlabeled External";
  const [isHovered, setIsHovered] = useState(false);
  const nodeSnapshot = useStore((state) => {
    const nodes = Array.from(state.nodeLookup.values());
    const byId = new Map(nodes.map((node) => [node.id, node]));

    const resolveX = (node: (typeof nodes)[number]) => {
      if (node.parentId) {
        const parent = byId.get(node.parentId);
        const parentX = parent?.position.x ?? 0;
        return parentX + (node.position.x ?? 0);
      }
      return node.position.x ?? 0;
    };

    return nodes.map((node) => ({
      id: node.id,
      kind: node.data?.kind as string | undefined,
      parentId: node.parentId,
      x: resolveX(node),
      width: node.measured?.width ?? node.width ?? 0,
    }));
  });
  const edges = useStore((state) => state.edges);
  const connection = useConnection((state) => ({
    inProgress: state.inProgress,
    fromNode: state.fromNode,
    toNode: state.toNode,
  }));
  const usedHandleIds = useMemo(() => {
    const used = new Set<string>();
    for (const edge of edges) {
      if (edge.source === id && edge.sourceHandle) {
        used.add(edge.sourceHandle);
      }
      if (edge.target === id && edge.targetHandle) {
        used.add(edge.targetHandle);
      }
    }
    return used;
  }, [edges, id]);
  const currentNode = useMemo(
    () => nodeSnapshot.find((node) => node.id === id),
    [id, nodeSnapshot],
  );
  const fallbackWidth =
    currentNode?.kind === "container"
      ? 224
      : currentNode?.kind === "store"
        ? 176
        : 32;
  const currentWidth = currentNode?.width || fallbackWidth;
  const currentCenterX = (currentNode?.x ?? 0) + currentWidth / 2;
  const hasNodeRight = useMemo(() => {
    if (!currentNode) return false;
    for (const node of nodeSnapshot) {
      if (node.id === id) continue;
      const nodeWidth =
        node.width ||
        (node.kind === "container"
          ? 224
          : node.kind === "store"
            ? 176
            : 32);
      const nodeCenterX = node.x + nodeWidth / 2;
      if (nodeCenterX > currentCenterX + 1) {
        return true;
      }
    }
    return false;
  }, [currentCenterX, currentNode, id, nodeSnapshot]);
  const hasNodeLeft = useMemo(() => {
    if (!currentNode) return false;
    for (const node of nodeSnapshot) {
      if (node.id === id) continue;
      const nodeWidth =
        node.width ||
        (node.kind === "container"
          ? 224
          : node.kind === "store"
            ? 176
            : 32);
      const nodeCenterX = node.x + nodeWidth / 2;
      if (nodeCenterX < currentCenterX - 1) {
        return true;
      }
    }
    return false;
  }, [currentCenterX, currentNode, id, nodeSnapshot]);
  const isDraggingToNode =
    connection.inProgress && connection.toNode?.id === id;
  const isDraggingFromNode =
    connection.inProgress && connection.fromNode?.id === id;
  const showAllHandles =
    !!selected ||
    isHovered ||
    connection.inProgress ||
    isDraggingToNode ||
    isDraggingFromNode;
  const allowLeftHandle = hasNodeLeft;
  const allowRightHandle = hasNodeRight;
  const getHandleStyle = (
    isVisible: boolean,
    style?: CSSProperties,
  ): CSSProperties | undefined => {
    if (isVisible) {
      return style;
    }
    return { ...style, opacity: 0, pointerEvents: "none" };
  };

  return (
    <BaseNode
      className="relative w-8 h-8 rounded-full border border-black bg-black text-white"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-slate-200 bg-white/90 px-2 py-0.5 text-[0.7rem] font-semibold text-slate-900 shadow-sm">
        {roleLabel}
      </span>

      <BaseHandle
        id="left"
        type="source"
        position={Position.Left}
        style={getHandleStyle(
          allowLeftHandle && (showAllHandles || usedHandleIds.has("left")),
        )}
      />
      <BaseHandle
        id="right"
        type="source"
        position={Position.Right}
        style={getHandleStyle(
          allowRightHandle &&
            (showAllHandles || usedHandleIds.has("right")),
        )}
      />
    </BaseNode>
  );
});
