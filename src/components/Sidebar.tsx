import { useCallback, useEffect, useState } from "react";
import { type XYPosition } from "@xyflow/react";

import { useDnD, useDnDPosition, type OnDropAction } from "../dnd/useDnD";
import type { EnergyNodeKind } from "../types";

type SidebarItem = {
  kind: EnergyNodeKind;
  label: string;
  description: string;
};

type SidebarProps = {
  onCreateNode: (kind: EnergyNodeKind, position: XYPosition) => void;
};

const items: SidebarItem[] = [
  {
    kind: "container",
    label: "Container",
    description: "Groups or holds elements.",
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
      return ({ position }) => {
        onCreateNode(kind, position);
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
          <h2 className="panel__title">Drag to the canvas</h2>
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
              <div>
                <p className="library-item__label">{item.label}</p>
                <p className="library-item__description">{item.description}</p>
              </div>
              <span className="library-item__badge">{item.kind}</span>
            </button>
          ))}
        </div>
        <p className="panel__note">
          Touch, pen, or mouse supported. Drop onto the canvas.
        </p>
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
