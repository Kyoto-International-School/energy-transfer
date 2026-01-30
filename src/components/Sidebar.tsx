import { useCallback, useEffect, useState } from "react";
import { type XYPosition } from "@xyflow/react";

import {
  useDnD,
  useDnDPosition,
  type DropTarget,
  type OnDropAction,
} from "../dnd/useDnD";
import type { EnergyNodeKind } from "../types";
import { FaCamera, FaCog, FaCubes, FaTools, FaTrash } from "react-icons/fa";
import { ComponentTypeIcon } from "./component-icons";
import { Inspector, type InspectorProps } from "./Inspector";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getExportFilename } from "@/utils/filename";

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
  onExportImage: (nameOverride?: string) => void;
  isExporting: boolean;
  onClearCanvas: () => void;
  userName: string;
  onUserNameChange: (name: string) => void;
  onClearSettings: () => void;
  inspectorProps: InspectorProps;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
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
    description: "An energy reserve.",
  },
  {
    kind: "external",
    label: "External",
    description: "Outside input/output.",
  },
];

export function Sidebar({
  onCreateNode,
  onExportImage,
  isExporting,
  onClearCanvas,
  userName,
  onUserNameChange,
  onClearSettings,
  inspectorProps,
  isCollapsed,
  onToggleCollapse,
}: SidebarProps) {
  const { isDragging, onDragStart } = useDnD();
  const [activeKind, setActiveKind] = useState<EnergyNodeKind | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [draftName, setDraftName] = useState(userName);
  const [pendingExport, setPendingExport] = useState(false);
  const [isClearSettingsConfirm, setIsClearSettingsConfirm] = useState(false);

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

  useEffect(() => {
    if (isSettingsOpen) {
      setDraftName(userName);
    }
  }, [isSettingsOpen, userName]);

  useEffect(() => {
    if (!isSettingsOpen) {
      setPendingExport(false);
      setIsClearSettingsConfirm(false);
    }
  }, [isSettingsOpen]);

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
      <aside className="sidebar">
        <section
          className={`panel panel--sidebar${isCollapsed ? " panel--collapsed" : ""}`}
        >
          <div className="panel__header">
            <button
              type="button"
              className="panel__eyebrow panel__eyebrow--icon panel__eyebrow--button"
              aria-expanded={!isCollapsed}
              aria-controls="components-panel-list"
              onClick={onToggleCollapse}
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
                  <div className="library-item__header">
                    <span className="library-item__icon" aria-hidden="true">
                      <ComponentTypeIcon
                        kind={item.kind}
                        className="library-item__icon-svg"
                      />
                    </span>
                    <p className="library-item__label">{item.label}</p>
                  </div>
                  <p className="library-item__description">
                    {item.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </section>
        <Inspector
          {...inspectorProps}
          variant="panel"
          className="panel--inspector"
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
        <section
          className={`panel panel--tools${isCollapsed ? " panel--collapsed" : ""}`}
        >
          <div className="panel__header">
            <button
              type="button"
              className="panel__eyebrow panel__eyebrow--icon panel__eyebrow--button"
              aria-expanded={!isCollapsed}
              aria-controls="tools-panel-content"
              onClick={onToggleCollapse}
            >
              <FaTools aria-hidden="true" />
              <span className="panel__eyebrow-text">Tools</span>
            </button>
          </div>
          <div className="tools-panel__content" id="tools-panel-content">
            <button
              type="button"
              className="tools-panel__button"
              onClick={() => {
                if (!getExportFilename(userName)) {
                  setPendingExport(true);
                  setIsSettingsOpen(true);
                  return;
                }
                onExportImage();
              }}
              disabled={isExporting}
              aria-label="Download image"
              title="Download image"
            >
              <FaCamera aria-hidden="true" />
            </button>
            <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="tools-panel__button"
                  aria-label="Settings"
                  title="Settings"
                >
                  <FaCog aria-hidden="true" />
                </button>
              </DialogTrigger>
              <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Settings</DialogTitle>
                  <DialogDescription>
                    Customize your workspace details.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-2">
                  <label className="inspector__label" htmlFor="settings-name">
                    Your name
                  </label>
                  <input
                    id="settings-name"
                    className="inspector__input"
                    type="text"
                    value={draftName}
                    onChange={(event) => setDraftName(event.target.value)}
                    placeholder="Add your name"
                  />
                </div>
                <DialogFooter>
                  <div className="relative mr-auto">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setIsClearSettingsConfirm(true)}
                    >
                      Clear all settings
                    </Button>
                    {isClearSettingsConfirm && (
                      <Button
                        type="button"
                        variant="destructive"
                        className="absolute inset-0"
                        onClick={() => {
                          onClearSettings();
                          setDraftName("");
                          setIsClearSettingsConfirm(false);
                        }}
                      >
                        Really?
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    type="button"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    disabled={!draftName.trim()}
                    onClick={() => {
                      const trimmedName = draftName.trim();
                      if (!trimmedName) return;
                      onUserNameChange(trimmedName);
                      if (pendingExport) {
                        onExportImage(trimmedName);
                        setPendingExport(false);
                      }
                      setIsSettingsOpen(false);
                    }}
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button
                  type="button"
                  className="tools-panel__button"
                  aria-label="Clear canvas"
                  title="Clear canvas"
                >
                  <FaTrash aria-hidden="true" />
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear canvas?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all components and transfers. This can't be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={onClearCanvas}
                  >
                    Clear
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>
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
  const item = items.find((entry) => entry.kind === kind);
  const label = item?.label ?? kind.charAt(0).toUpperCase() + kind.slice(1);
  const description = item?.description ?? "";

  return (
    <div
      className={`ghostnode ghostnode--${kind} ${statusClass}`}
      style={{
        transform: `translate(${position.x}px, ${position.y}px) translate(-50%, -50%)`,
      }}
    >
      <div className="library-item ghostnode__card">
        <div className="library-item__content">
          <div className="library-item__header">
            <span className="library-item__icon" aria-hidden="true">
              <ComponentTypeIcon
                kind={kind}
                className="library-item__icon-svg"
              />
            </span>
            <p className="library-item__label">{label}</p>
          </div>
          {description && (
            <p className="library-item__description">{description}</p>
          )}
        </div>
      </div>
      {isStore && !isValidDrop && (
        <p className="ghostnode__hint">Drop into a container</p>
      )}
    </div>
  );
}
