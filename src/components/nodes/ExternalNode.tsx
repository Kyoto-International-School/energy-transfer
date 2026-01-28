import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { BaseNode } from "../base-node";
import { EasyConnectHandles } from "../EasyConnectHandles";
import { NodeDragHandle } from "../NodeDragHandle";
import type { EnergyNode } from "../../types";

export const ExternalNode = memo(function ExternalNode({
  id,
  data,
}: NodeProps<EnergyNode>) {
  const roleLabel = data.label || "Unlabeled";

  return (
    <BaseNode className="relative w-8 h-8 rounded-full border border-black bg-black text-white">
      <div className="external-node__label">
        <span className="external-node__label-text">
          <span className="external-node__label-label">{roleLabel}</span>
          <NodeDragHandle className="node-drag-handle--external-inline" />
        </span>
      </div>
      <EasyConnectHandles nodeId={id} />
    </BaseNode>
  );
});
