import { memo } from "react";
import { NodeToolbar, Position, type NodeProps } from "@xyflow/react";

import { BaseNode } from "../base-node";
import { EasyConnectHandles } from "../EasyConnectHandles";
import {
  BLANK_STORE_OPTION,
  STORE_TYPE_OPTIONS,
  type EnergyNode,
  type StoreType,
} from "../../types";

export const StoreNode = memo(function StoreNode({
  id,
  data,
}: NodeProps<EnergyNode>) {
  const storeLabel = data.storeType || data.label || "Select store";
  const storeType = data.storeType ?? "";
  const isPassthrough = data.storeType === "(Passthrough)";
  const isBlankStore = data.storeType === BLANK_STORE_OPTION;
  const menuOptions: Array<{ label: string; value: StoreType | "" }> = [
    { label: "Select store", value: "" },
    ...STORE_TYPE_OPTIONS.map((option) => ({ label: option, value: option })),
  ];

  return (
    <BaseNode
      className={`store-node w-36 min-h-[56px] flex items-center justify-center px-2 text-center${
        isPassthrough ? " store-node--passthrough" : ""
      }${isBlankStore ? " store-node--blank" : ""}`}
    >
      <p className="store-node__label">{storeLabel}</p>
      <EasyConnectHandles nodeId={id} />
      <NodeToolbar
        nodeId={id}
        isVisible={!!data.isStoreMenuOpen}
        position={Position.Bottom}
        offset={8}
        align="center"
      >
        <div
          className="store-node__menu nodrag nopan"
          role="listbox"
          aria-label="Select store type"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {menuOptions.map((option) => (
            <button
              key={option.value || "select"}
              type="button"
              className={`store-node__menu-option${
                option.value === BLANK_STORE_OPTION
                  ? " store-node__menu-option--blank"
                  : ""
              }`}
              aria-pressed={storeType === option.value}
              data-active={storeType === option.value}
              onClick={(event) => {
                event.stopPropagation();
                data.onStoreTypeSelect?.(id, option.value);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </NodeToolbar>
    </BaseNode>
  );
});
