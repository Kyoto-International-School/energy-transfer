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
  const isDraggingToNode =
    connection.inProgress && connection.toNode?.id === id;
  const isDraggingFromNode =
    connection.inProgress && connection.fromNode?.id === id;
  const showAllHandles =
    !!selected || isHovered || isDraggingToNode || isDraggingFromNode;
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
        style={getHandleStyle(showAllHandles || usedHandleIds.has("left"))}
      />
      <BaseHandle
        id="right"
        type="source"
        position={Position.Right}
        style={getHandleStyle(showAllHandles || usedHandleIds.has("right"))}
      />
    </BaseNode>
  );
});
