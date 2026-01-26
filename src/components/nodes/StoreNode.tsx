import { memo } from "react";
import { Position, type NodeProps } from "@xyflow/react";

import { BaseNode } from "../base-node";
import { BaseHandle } from "../base-handle";
import type { EnergyNode } from "../../types";

const TOP_HANDLE_OFFSETS = ["20%", "50%", "80%"];
const BOTTOM_HANDLE_OFFSETS = ["20%", "50%", "80%"];

export const StoreNode = memo(function StoreNode({ data }: NodeProps<EnergyNode>) {
  const storeLabel = data.storeType || data.label || "Select store type";

  return (
    <BaseNode className="w-44 min-h-[60px] flex items-center justify-center px-3 text-center">
      <p className="text-sm font-semibold text-slate-900">{storeLabel}</p>

      <BaseHandle id="left" type="source" position={Position.Left} />
      <BaseHandle id="right" type="source" position={Position.Right} />

      {TOP_HANDLE_OFFSETS.map((offset, index) => (
        <BaseHandle
          key={`top-${offset}`}
          id={`top-${index + 1}`}
          type="source"
          position={Position.Top}
          style={{ left: offset }}
        />
      ))}
      {BOTTOM_HANDLE_OFFSETS.map((offset, index) => (
        <BaseHandle
          key={`bottom-${offset}`}
          id={`bottom-${index + 1}`}
          type="source"
          position={Position.Bottom}
          style={{ left: offset }}
        />
      ))}
    </BaseNode>
  );
});
