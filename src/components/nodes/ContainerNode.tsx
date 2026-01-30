import { memo, useEffect, useRef, useState, type SyntheticEvent } from "react";
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
  const lastTapRef = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEditing) return;
    setDraftLabel(data.label);
  }, [data.label, isEditing]);

  useEffect(() => {
    if (!isEditing) return;
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
  }, [isEditing]);

  const beginEdit = (event: SyntheticEvent) => {
    event.stopPropagation();
    setIsEditing(true);
    setDraftLabel(data.label);
  };

  const commitEdit = () => {
    setIsEditing(false);
    data.onLabelChange?.(id, draftLabel);
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setDraftLabel(data.label);
  };

  const handleDoubleClick = (event: React.MouseEvent) => {
    beginEdit(event);
  };

  const handlePointerUp = (event: React.PointerEvent) => {
    if (event.pointerType !== "touch") return;
    const now = performance.now();
    if (now - lastTapRef.current < 280) {
      beginEdit(event);
      lastTapRef.current = 0;
      return;
    }
    lastTapRef.current = now;
  };

  return (
    <BaseNode className="w-[168px] h-full flex flex-col container-node">
      <BaseNodeHeader className="container-node__header">
        <BaseNodeHeaderTitle
          onDoubleClick={handleDoubleClick}
          onPointerUp={handlePointerUp}
        >
          {isEditing ? (
            <input
              ref={inputRef}
              className="container-node__label-input nodrag nopan"
              value={draftLabel}
              onChange={(event) => setDraftLabel(event.target.value)}
              onBlur={commitEdit}
              onPointerDown={(event) => event.stopPropagation()}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  commitEdit();
                }
                if (event.key === "Escape") {
                  event.preventDefault();
                  cancelEdit();
                }
              }}
              aria-label="Edit container label"
            />
          ) : (
            data.label
          )}
        </BaseNodeHeaderTitle>
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
