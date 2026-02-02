import { memo, useLayoutEffect, useRef, useState } from "react";
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
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuOffset = 8;
  const menuZIndex = 2000;
  const [menuPosition, setMenuPosition] = useState<Position>(Position.Bottom);
  const [menuAlign, setMenuAlign] = useState<"start" | "center" | "end">(
    "center",
  );
  const menuOptions: Array<{ label: string; value: StoreType | "" }> = [
    { label: "Select store", value: "" },
    ...STORE_TYPE_OPTIONS.map((option) => ({ label: option, value: option })),
  ];

  useLayoutEffect(() => {
    if (!data.isStoreMenuOpen) return;
    const menuElement = menuRef.current;
    const flowWrapper = document.querySelector<HTMLElement>(".flow-wrapper");
    const nodeElement = document.querySelector<HTMLElement>(
      `.react-flow__node[data-id="${id}"]`,
    );
    if (!menuElement || !flowWrapper || !nodeElement) return;

    const menuRect = menuElement.getBoundingClientRect();
    const flowRect = flowWrapper.getBoundingClientRect();
    const nodeRect = nodeElement.getBoundingClientRect();
    const offset = menuOffset;

    const spaceBottom = flowRect.bottom - (nodeRect.bottom + offset);
    const spaceTop = nodeRect.top - flowRect.top - offset;
    const spaceRight = flowRect.right - (nodeRect.right + offset);
    const spaceLeft = nodeRect.left - flowRect.left - offset;

    const fitsBottom = spaceBottom >= menuRect.height;
    const fitsTop = spaceTop >= menuRect.height;
    const fitsRight = spaceRight >= menuRect.width;
    const fitsLeft = spaceLeft >= menuRect.width;

    let nextPosition = Position.Bottom;
    if (!fitsBottom && (fitsRight || fitsLeft)) {
      nextPosition =
        fitsRight && (!fitsLeft || spaceRight >= spaceLeft)
          ? Position.Right
          : Position.Left;
    } else if (!fitsBottom && fitsTop) {
      nextPosition = Position.Top;
    }

    let nextAlign: "start" | "center" | "end" = "center";
    if (nextPosition === Position.Bottom || nextPosition === Position.Top) {
      if (nodeRect.left + menuRect.width > flowRect.right) {
        nextAlign = "end";
      } else if (nodeRect.right - menuRect.width < flowRect.left) {
        nextAlign = "start";
      }
    } else {
      if (nodeRect.top + menuRect.height > flowRect.bottom) {
        nextAlign = "end";
      } else if (nodeRect.bottom - menuRect.height < flowRect.top) {
        nextAlign = "start";
      }
    }

    setMenuPosition(nextPosition);
    setMenuAlign(nextAlign);
  }, [data.isStoreMenuOpen, id, menuOffset]);

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
        position={menuPosition}
        offset={menuOffset}
        align={menuAlign}
        style={{ zIndex: menuZIndex }}
      >
        <div
          ref={menuRef}
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
