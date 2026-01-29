import { memo } from "react";
import type { NodeProps } from "@xyflow/react";

import {
  BaseNode,
  BaseNodeContent,
  BaseNodeHeader,
  BaseNodeHeaderTitle,
} from "../base-node";
import { NodeDragHandle } from "../NodeDragHandle";
import type { EnergyNode } from "../../types";

export const ContainerNode = memo(function ContainerNode({
  data,
  id,
}: NodeProps<EnergyNode>) {
  return (
    <BaseNode className="w-[168px] h-full flex flex-col container-node">
      <BaseNodeHeader className="container-node__header">
        <BaseNodeHeaderTitle>{data.label}</BaseNodeHeaderTitle>
        <NodeDragHandle />
      </BaseNodeHeader>
      <BaseNodeContent
        className="min-h-16 flex-1 items-center justify-center text-center container-node__body"
        data-container-body="true"
        data-node-id={id}
      >
        {!(data.storeCount ?? 0) && (
          <button
            type="button"
            className="container-node__empty-action nodrag nopan"
            onClick={(event) => {
              event.stopPropagation();
              data.onAddStore?.(id);
            }}
          >
            Add a store
          </button>
        )}
      </BaseNodeContent>
    </BaseNode>
  );
});
