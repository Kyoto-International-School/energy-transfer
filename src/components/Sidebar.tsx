import { useCallback, useEffect, useState } from "react";
import { type XYPosition } from "@xyflow/react";

import {
  useDnD,
  useDnDPosition,
  type DropTarget,
  type OnDropAction,
} from "../dnd/useDnD";
import type { EnergyNodeKind } from "../types";
import { FaCubes } from "react-icons/fa";
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
  {
    kind: "external",
    label: "External",
    description: "Represents an input or output.",
  },
];

export function Sidebar({ onCreateNode }: SidebarProps) {
  const { isDragging, onDragStart } = useDnD();
  const [activeKind, setActiveKind] = useState<EnergyNodeKind | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!isDragging) {
      setActiveKind(null);
    }
  }, [isDragging]);

  useEffect(() => {
    const body = document.body;
    const shouldShowNotAllowed = isDragging && activeKind === "store";
    body.classList.toggle("dragging-store", shouldShowNotAllowed);
    return () => body.classList.remove("dragging-store");
  }, [activeKind, isDragging]);

  useEffect(() => {
    const body = document.body;
    body.classList.toggle("sidebar-collapsed", isCollapsed);
    return () => body.classList.remove("sidebar-collapsed");
  }, [isCollapsed]);

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
      <aside
        className={`panel panel--sidebar${isCollapsed ? " panel--collapsed" : ""}`}
      >
        <div className="panel__header">
          <button
            type="button"
            className="panel__eyebrow panel__eyebrow--icon panel__eyebrow--button"
            aria-expanded={!isCollapsed}
            aria-controls="components-panel-list"
            onClick={() => setIsCollapsed((current) => !current)}
          >
            <FaCubes aria-hidden="true" />
            <span className="panel__eyebrow-text">Components</span>
          </button>
        </div>
        <div
          id="components-panel-list"
          className="library-list"
          hidden={isCollapsed}
        >
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
  const { position, dropTarget } = useDnDPosition();

  if (!position || !kind) return null;

  const isStore = kind === "store";
  const isValidDrop = !isStore || dropTarget?.type === "container-body";
  const statusClass = isStore
    ? isValidDrop
      ? "ghostnode--valid"
      : "ghostnode--invalid"
    : "";

  return (
    <div
      className={`ghostnode ghostnode--${kind} ${statusClass}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`,
      }}
    >
      <p className="ghostnode__label">
        {kind.charAt(0).toUpperCase() + kind.slice(1)}
      </p>
      {isStore && !isValidDrop && (
        <p className="ghostnode__hint">Drop into a container</p>
      )}
    </div>
  );
}
