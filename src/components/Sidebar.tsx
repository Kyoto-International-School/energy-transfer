import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { type XYPosition } from "@xyflow/react";

import {
  useDnD,
  useDnDPosition,
  type DropTarget,
  type OnDropAction,
} from "../dnd/useDnD";
import type { EnergyNodeKind } from "../types";
import { FaCamera, FaCog, FaCubes, FaTools, FaTrash } from "react-icons/fa";
import { TbArrowsTransferUpDown, TbDownload, TbUpload } from "react-icons/tb";
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
import {
  applyLocalStorageImport,
  downloadLocalStorageExport,
  parseLocalStorageExport,
  type LocalStorageExport,
} from "@/storage";
import { getExportFilename, getStorageExportFilename } from "@/utils/filename";

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
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [draftName, setDraftName] = useState(userName);
  const [pendingExport, setPendingExport] = useState(false);
  const [isClearSettingsConfirm, setIsClearSettingsConfirm] = useState(false);
  const [uploadPayload, setUploadPayload] = useState<LocalStorageExport | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadConfirm, setIsUploadConfirm] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);

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

  const resetTransferState = useCallback(() => {
    setUploadPayload(null);
    setUploadError(null);
    setIsUploadConfirm(false);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  }, []);

  useEffect(() => {
    if (!isTransferOpen) {
      resetTransferState();
    }
  }, [isTransferOpen, resetTransferState]);

  const createDropAction = useCallback(
    (kind: EnergyNodeKind): OnDropAction => {
      return ({ position, dropTarget }) => {
        onCreateNode(kind, position, dropTarget);
        setActiveKind(null);
      };
    },
    [onCreateNode],
  );

  const handleDownloadStorage = useCallback(() => {
    const filename = getStorageExportFilename(userName);
    downloadLocalStorageExport(filename);
  }, [userName]);

  const handleUploadFileChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] ?? null;
      setUploadError(null);
      setUploadPayload(null);
      setIsUploadConfirm(false);

      if (!file) return;

      try {
        const text = await file.text();
        const parsed = parseLocalStorageExport(text);
        if (!parsed) {
          setUploadError("That file isn't a valid storage export.");
          return;
        }
        setUploadPayload(parsed);
      } catch {
        setUploadError("Unable to read that file.");
      }
    },
    [],
  );

  const handleUploadConfirm = useCallback(() => {
    if (!uploadPayload) return;

    const didApply = applyLocalStorageImport(uploadPayload);
    if (!didApply) {
      setUploadError("Unable to restore data from that export.");
      setIsUploadConfirm(false);
      return;
    }

    setIsTransferOpen(false);
    if (typeof window !== "undefined") {
      window.location.reload();
    }
  }, [uploadPayload]);

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
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
              <DialogTrigger asChild>
                <button
                  type="button"
                  className="tools-panel__button"
                  aria-label="Data transfer"
                  title="Data transfer"
                >
                  <TbArrowsTransferUpDown aria-hidden="true" />
                </button>
              </DialogTrigger>
              <DialogContent onOpenAutoFocus={(event) => event.preventDefault()}>
                <DialogHeader>
                  <DialogTitle>Data transfer</DialogTitle>
                  <DialogDescription>
                    Download a backup or restore your saved data.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-5">
                  <div className="rounded-lg border p-4">
                    <div className="space-y-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Download backup</p>
                          <p className="text-xs text-muted-foreground">
                            Save your current data as JSON.
                          </p>
                        </div>
                        <Button type="button" onClick={handleDownloadStorage}>
                          <TbDownload aria-hidden="true" />
                          Download
                        </Button>
                      </div>
                      <div className="h-px w-full bg-border" aria-hidden="true" />
                      <div className="space-y-2">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Restore backup</p>
                          <p className="text-xs text-muted-foreground">
                            Load a previously saved JSON file.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            <strong className="font-semibold">
                              This will overwrite your existing diagram(s).
                            </strong>
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="grid gap-2">
                            <input
                              ref={uploadInputRef}
                              type="file"
                              accept="application/json"
                              className="inspector__input w-full file:opacity-0 file:w-0 file:min-w-0 file:p-0 file:mr-0 file:border-0 file:bg-transparent"
                              aria-label="Choose a JSON backup file"
                              onChange={handleUploadFileChange}
                            />
                            {uploadError && (
                              <p className="text-xs text-destructive">
                                {uploadError}
                              </p>
                            )}
                          </div>
                          <div className="relative">
                            <Button
                              type="button"
                              disabled={!uploadPayload}
                              onClick={() => setIsUploadConfirm(true)}
                            >
                              <TbUpload aria-hidden="true" />
                              Restore
                            </Button>
                            {isUploadConfirm && (
                              <Button
                                type="button"
                                variant="destructive"
                                className="absolute inset-0"
                                onClick={() => {
                                  setIsUploadConfirm(false);
                                  handleUploadConfirm();
                                }}
                              >
                                Really?
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter showCloseButton />
              </DialogContent>
            </Dialog>
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
