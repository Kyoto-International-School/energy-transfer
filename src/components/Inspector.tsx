import { useState } from "react";
import { useReactFlow, type Edge, type Node } from "@xyflow/react";
import { FaArrowAltCircleRight, FaSearch, FaTrash } from "react-icons/fa";
import {
  EDGE_LABEL_OPTIONS,
  BLANK_STORE_OPTION,
  STORE_TYPE_OPTIONS,
  type EdgeLabel,
  type EnergyEdgeData,
  type EnergyNodeData,
  type StoreType,
} from "../types";
import { ComponentTypeIcon } from "./component-icons";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type InspectorProps = {
  selectedNode: Node<EnergyNodeData> | null;
  selectedEdge: Edge<EnergyEdgeData> | null;
  onLabelChange: (label: string) => void;
  onStoreTypeChange: (storeType: StoreType | "") => void;
  onEdgeLabelChange: (label: EdgeLabel | "") => void;
  onDropdownOpen: () => void;
  skipDeleteConfirm: boolean;
  onSkipDeleteConfirmChange: (skip: boolean) => void;
  variant?: "panel" | "section";
  className?: string;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function Inspector({
  selectedNode,
  selectedEdge,
  onLabelChange,
  onStoreTypeChange,
  onEdgeLabelChange,
  onDropdownOpen,
  skipDeleteConfirm,
  onSkipDeleteConfirmChange,
  variant = "panel",
  className,
  isCollapsed = false,
  onToggleCollapse,
}: InspectorProps) {
  const { deleteElements, getNodes } = useReactFlow();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [skipNextConfirm, setSkipNextConfirm] = useState(false);

  const handleDeleteNode = () => {
    if (!selectedNode) return;

    if (selectedNode.data.kind === "container") {
      const nodesToRemove = getNodes().filter(
        (node) =>
          node.id === selectedNode.id || node.parentId === selectedNode.id,
      );
      deleteElements({ nodes: nodesToRemove });
      return;
    }

    deleteElements({ nodes: [selectedNode] });
  };

  const handleDeleteEdge = () => {
    if (!selectedEdge) return;
    deleteElements({ edges: [selectedEdge] });
  };

  const renderNodeDetails = () => {
    if (!selectedNode) return null;

    return (
      <div className="inspector-grid">
        <div>
          <p className="inspector__label">Component type</p>
          <p className="inspector__value inspector__value--icon">
            <ComponentTypeIcon
              kind={selectedNode.data.kind}
              className="inspector__value-icon"
            />
            {selectedNode.data.kind.charAt(0).toUpperCase() +
              selectedNode.data.kind.slice(1)}
          </p>
        </div>
        <div>
          {selectedNode.data.kind === "store" ? (
            <>
              <label className="inspector__label" htmlFor="store-type">
                Store type
              </label>
              <select
                id="store-type"
                className="inspector__input"
                value={selectedNode.data.storeType ?? ""}
                onPointerDown={onDropdownOpen}
                onFocus={onDropdownOpen}
                onChange={(event) =>
                  onStoreTypeChange(event.target.value as StoreType | "")
                }
              >
                <option value="">Select store type</option>
                {STORE_TYPE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <>
              <label className="inspector__label" htmlFor="node-label">
                Label
              </label>
              <input
                id="node-label"
                className="inspector__input"
                type="text"
                value={selectedNode.data.label}
                onChange={(event) => onLabelChange(event.target.value)}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  const renderEdgeDetails = () => {
    if (!selectedEdge || selectedNode) return null;

    return (
      <div className="inspector-grid">
        <div>
          <p className="inspector__label">Component type</p>
          <p className="inspector__value inspector__value--icon">
            <FaArrowAltCircleRight
              className="inspector__value-icon"
              aria-hidden="true"
            />
            Transfer
          </p>
        </div>
        <div>
          <label className="inspector__label" htmlFor="edge-label">
            Transfer type
          </label>
          <select
            id="edge-label"
            className="inspector__input"
            value={selectedEdge.data?.label ?? ""}
            onPointerDown={onDropdownOpen}
            onFocus={onDropdownOpen}
            onChange={(event) =>
              onEdgeLabelChange(event.target.value as EdgeLabel | "")
            }
          >
            <option value="">Select transfer</option>
                {EDGE_LABEL_OPTIONS.map((option) => (
                  <option
                    key={option}
                    value={option}
                    className={
                      option === BLANK_STORE_OPTION
                        ? "inspector__option--blank"
                        : undefined
                    }
                  >
                    {option}
                  </option>
                ))}
          </select>
        </div>
      </div>
    );
  };

  const deleteAction = selectedNode
    ? {
        label: `Delete ${selectedNode.data.kind}`,
        onClick: handleDeleteNode,
      }
    : selectedEdge
      ? {
          label: "Delete transfer",
          onClick: handleDeleteEdge,
        }
      : null;

  const confirmTitle = selectedNode
    ? `Delete ${selectedNode.data.kind}?`
    : "Delete transfer?";
  const confirmDescription =
    selectedNode?.data.kind === "container"
      ? "This will remove the container and everything inside it."
      : "This action cannot be undone.";

  const handleDeleteRequest = () => {
    if (!deleteAction) return;
    if (skipDeleteConfirm) {
      deleteAction.onClick();
      return;
    }
    setSkipNextConfirm(false);
    setIsConfirmOpen(true);
  };

  const Wrapper = variant === "panel" ? "aside" : "section";
  const wrapperClass =
    variant === "panel"
      ? cn(
          "panel panel--inspector",
          isCollapsed && "panel--collapsed",
          className,
        )
      : cn("panel__section panel__section--inspector", className);

  return (
    <Wrapper className={wrapperClass}>
      <div className="panel__header">
        {variant === "panel" ? (
          <button
            type="button"
            className="panel__eyebrow panel__eyebrow--icon panel__eyebrow--button"
            aria-expanded={!isCollapsed}
            aria-controls="inspector-panel-content"
            onClick={onToggleCollapse}
          >
            <FaSearch aria-hidden="true" />
            <span className="panel__eyebrow-text">Inspector</span>
          </button>
        ) : (
          <p className="panel__eyebrow panel__eyebrow--icon">
            <FaSearch aria-hidden="true" />
            <span className="panel__eyebrow-text">Inspector</span>
          </p>
        )}
      </div>
      <div className="inspector__content" id="inspector-panel-content">
        {selectedNode ? (
          renderNodeDetails()
        ) : selectedEdge ? (
          renderEdgeDetails()
        ) : (
          <p className="panel__note">Select a component to see its details.</p>
        )}
      </div>
      {deleteAction && (
        <div className="inspector__footer">
          <button
            type="button"
            className="inspector__button inspector__button--icon"
            onClick={handleDeleteRequest}
            aria-label={deleteAction.label}
            title={deleteAction.label}
          >
            <FaTrash aria-hidden="true" />
          </button>
          <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                <AlertDialogDescription>
                  {confirmDescription}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <label className="inspector__confirm">
                <input
                  className="inspector__confirm-input"
                  type="checkbox"
                  checked={skipNextConfirm}
                  onChange={(event) => setSkipNextConfirm(event.target.checked)}
                />
                <span>Don't ask me again</span>
              </label>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    deleteAction.onClick();
                    if (skipNextConfirm) {
                      onSkipDeleteConfirmChange(true);
                    }
                    setIsConfirmOpen(false);
                  }}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </Wrapper>
  );
}
