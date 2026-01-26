import { useCallback, useEffect, useState } from "react";
import { type XYPosition } from "@xyflow/react";

import {
  useDnD,
  useDnDPosition,
  type DropTarget,
  type OnDropAction,
} from "../dnd/useDnD";
import type { EnergyNodeKind } from "../types";
import { ComponentTypeIcon } from "./component-icons";

type SidebarItem = {
  kind: EnergyNodeKind;
  label: string;
  description: string;
};

type SidebarProps = {
  onCreateNode: (
    kind: EnergyNodeKind,
    position: XYPosition,
    dropTarget: DropTarget,
  ) => void;
};

const items: SidebarItem[] = [
  {
    kind: "container",
    label: "Container",
    description: "Holds stores of energy.",
  },
  {
    kind: "store",
    label: "Store",
    description: "Represents stored energy.",
  },
];

export function Sidebar({ onCreateNode }: SidebarProps) {
  const { isDragging, onDragStart } = useDnD();
  const [activeKind, setActiveKind] = useState<EnergyNodeKind | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setActiveKind(null);
    }
  }, [isDragging]);

  const createDropAction = useCallback(
    (kind: EnergyNodeKind): OnDropAction => {
      return ({ position, dropTarget }) => {
        onCreateNode(kind, position, dropTarget);
        setActiveKind(null);
      };
    },
    [onCreateNode],
  );

  return (
    <>
      {isDragging && <DragGhost kind={activeKind} />}
      <aside className="panel panel--sidebar">
        <div className="panel__header">
          <p className="panel__eyebrow">Component Library</p>
        </div>
        <div className="library-list">
          {items.map((item) => (
            <button
              key={item.kind}
              type="button"
              className="library-item"
              data-node-kind={item.kind}
              onPointerDown={(event) => {
                setActiveKind(item.kind);
                onDragStart(event, createDropAction(item.kind));
              }}
            >
              <div className="library-item__content">
                <span className="library-item__icon" aria-hidden="true">
                  <ComponentTypeIcon
                    kind={item.kind}
                    className="library-item__icon-svg"
                  />
                </span>
                <div>
                  <p className="library-item__label">{item.label}</p>
                  <p className="library-item__description">
                    {item.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}

type DragGhostProps = {
  kind: EnergyNodeKind | null;
};

function DragGhost({ kind }: DragGhostProps) {
  const { position } = useDnDPosition();

  if (!position || !kind) return null;

  return (
    <div
      className={`ghostnode ghostnode--${kind}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`,
      }}
    >
      {kind.charAt(0).toUpperCase() + kind.slice(1)}
    </div>
  );
}
