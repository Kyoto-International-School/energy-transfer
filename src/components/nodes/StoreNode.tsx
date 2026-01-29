import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import { BaseNode } from "../base-node";
import { EasyConnectHandles } from "../EasyConnectHandles";
import type { EnergyNode } from "../../types";

export const StoreNode = memo(function StoreNode({
  id,
  data,
}: NodeProps<EnergyNode>) {
  const storeLabel = data.storeType || data.label || "Select store";

  return (
    <BaseNode className="w-36 min-h-[56px] flex items-center justify-center px-2 text-center">
      <p className="store-node__label">{storeLabel}</p>
      <EasyConnectHandles nodeId={id} />
    </BaseNode>
  );
});
