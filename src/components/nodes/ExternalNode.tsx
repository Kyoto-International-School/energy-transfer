import { memo, useEffect, useRef, useState, type SyntheticEvent } from "react";
import type { NodeProps } from "@xyflow/react";

import { BaseNode } from "../base-node";
import { EasyConnectHandles } from "../EasyConnectHandles";
import { NodeDragHandle } from "../NodeDragHandle";
import type { EnergyNode } from "../../types";

export const ExternalNode = memo(function ExternalNode({
  id,
  data,
}: NodeProps<EnergyNode>) {
  const lastTapRef = useRef(0);
  const [isEditing, setIsEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const roleLabel = data.label || "Unlabeled";

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
    <BaseNode className="relative w-8 h-8 rounded-full border border-black bg-black text-white">
      <div className="external-node__label">
        <span className="external-node__label-text">
          {isEditing ? (
            <input
              ref={inputRef}
              className="external-node__label-input nodrag nopan"
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
              aria-label="Edit external label"
              size={Math.max(draftLabel.length, 1)}
            />
          ) : (
            <span
              className="external-node__label-label"
              onDoubleClick={handleDoubleClick}
              onPointerUp={handlePointerUp}
            >
              {roleLabel}
            </span>
          )}
          <NodeDragHandle className="node-drag-handle--external-inline" />
        </span>
      </div>
      <EasyConnectHandles nodeId={id} />
    </BaseNode>
  );
});
