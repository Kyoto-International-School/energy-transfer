import { memo, useCallback, useMemo, useState, type CSSProperties } from "react";
import { Position, useConnection, useStore, type NodeProps } from "@xyflow/react";
import type { IsValidConnection } from "@xyflow/system";

import { BaseNode } from "../base-node";
import { BaseHandle } from "../base-handle";
import type { EnergyNode } from "../../types";

const TOP_HANDLE_OFFSETS = ["20%", "50%", "80%"];
const BOTTOM_HANDLE_OFFSETS = ["20%", "50%", "80%"];

export const StoreNode = memo(function StoreNode({
  id,
  data,
  selected,
}: NodeProps<EnergyNode>) {
  const storeLabel = data.storeType || data.label || "Select store type";
  const [isHovered, setIsHovered] = useState(false);
  const nodes = useStore((state) => state.nodes);
  const edges = useStore((state) => state.edges);
  const connection = useConnection((state) => ({
    inProgress: state.inProgress,
    fromNode: state.fromNode,
    toNode: state.toNode,
    fromHandle: state.fromHandle,
    fromPosition: state.fromPosition,
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
    () => nodes.find((node) => node.id === id),
    [id, nodes],
  );
  const currentParentId = currentNode?.parentId ?? null;
  const currentY = currentNode?.position.y ?? 0;
  const hasStoreAbove = useMemo(() => {
    if (!currentNode) return false;
    return nodes.some((node) => {
      if (node.id === id) return false;
      if (node.data?.kind !== "store") return false;
      if (node.parentId !== currentParentId) return false;
      const nodeY = node.position.y ?? 0;
      return nodeY < currentY - 1;
    });
  }, [currentNode, currentParentId, currentY, id, nodes]);
  const hasStoreBelow = useMemo(() => {
    if (!currentNode) return false;
    return nodes.some((node) => {
      if (node.id === id) return false;
      if (node.data?.kind !== "store") return false;
      if (node.parentId !== currentParentId) return false;
      const nodeY = node.position.y ?? 0;
      return nodeY > currentY + 1;
    });
  }, [currentNode, currentParentId, currentY, id, nodes]);
  const isDraggingToStore =
    connection.inProgress && connection.toNode?.id === id;
  const isDraggingFromStore =
    connection.inProgress && connection.fromNode?.id === id;
  const fromNodeKind = connection.fromNode?.data?.kind;
  const fromNodeParentId = connection.fromNode?.parentId;
  const fromHandleId = connection.fromHandle?.id;
  const isConnectionFromStore = connection.inProgress && fromNodeKind === "store";
  const isConnectionFromVerticalHandle =
    connection.inProgress &&
    (fromHandleId?.startsWith("top") ||
      fromHandleId?.startsWith("bottom") ||
      connection.fromPosition === Position.Top ||
      connection.fromPosition === Position.Bottom);
  const showAllHandles =
    !!selected ||
    isHovered ||
    connection.inProgress ||
    isDraggingToStore ||
    isDraggingFromStore;
  const allowVerticalHandlesForConnection =
    !connection.inProgress ||
    (isConnectionFromStore &&
      fromNodeParentId === currentParentId &&
      isConnectionFromVerticalHandle);
  const isConnectionFromSameContainerStore =
    isConnectionFromStore && fromNodeParentId === currentParentId;
  const isConnectionFromLeftRightHandle =
    connection.inProgress &&
    connection.fromNode?.id === id &&
    (fromHandleId === "left" || fromHandleId === "right");
  const allowLeftRightHandlesForConnection =
    !connection.inProgress ||
    !isConnectionFromSameContainerStore ||
    isConnectionFromLeftRightHandle;
  const allowTopHandles = hasStoreAbove && allowVerticalHandlesForConnection;
  const allowBottomHandles = hasStoreBelow && allowVerticalHandlesForConnection;
  const isValidVerticalConnection: IsValidConnection = useCallback(
    (connection) => {
      if (!connection.target) return true;
      if (connection.target === id) return false;
      const targetNode = nodes.find((node) => node.id === connection.target);
      if (!targetNode || targetNode.data?.kind !== "store") return false;
      return targetNode.parentId === currentParentId;
    },
    [currentParentId, id, nodes],
  );
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
      className="w-44 min-h-[60px] flex items-center justify-center px-3 text-center"
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
    >
      <p className="text-sm font-semibold text-slate-900">{storeLabel}</p>

      {allowLeftRightHandlesForConnection && (
        <BaseHandle
          id="left"
          type="source"
          position={Position.Left}
          style={getHandleStyle(showAllHandles || usedHandleIds.has("left"))}
        />
      )}
      {allowLeftRightHandlesForConnection && (
        <BaseHandle
          id="right"
          type="source"
          position={Position.Right}
          style={getHandleStyle(showAllHandles || usedHandleIds.has("right"))}
        />
      )}

      {allowTopHandles &&
        TOP_HANDLE_OFFSETS.map((offset, index) => (
          <BaseHandle
            key={`top-${offset}`}
            id={`top-${index + 1}`}
            type="source"
            position={Position.Top}
            isValidConnection={isValidVerticalConnection}
            style={getHandleStyle(
              showAllHandles || usedHandleIds.has(`top-${index + 1}`),
              { left: offset },
            )}
          />
        ))}
      {allowBottomHandles &&
        BOTTOM_HANDLE_OFFSETS.map((offset, index) => (
          <BaseHandle
            key={`bottom-${offset}`}
            id={`bottom-${index + 1}`}
            type="source"
            position={Position.Bottom}
            isValidConnection={isValidVerticalConnection}
            style={getHandleStyle(
              showAllHandles || usedHandleIds.has(`bottom-${index + 1}`),
              { left: offset },
            )}
          />
        ))}
    </BaseNode>
  );
});
