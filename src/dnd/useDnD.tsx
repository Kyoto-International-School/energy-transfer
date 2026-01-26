import { useReactFlow, type XYPosition } from "@xyflow/react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Dispatch,
  type SetStateAction,
} from "react";

export type DropTarget =
  | {
      type: "flow";
    }
  | {
      type: "container-body";
      nodeId: string;
    };

export type OnDropAction = ({
  position,
  dropTarget,
}: {
  position: XYPosition;
  dropTarget: DropTarget;
}) => void;

type DnDContextType = {
  isDragging: boolean;
  setIsDragging: Dispatch<SetStateAction<boolean>>;
  dropAction: OnDropAction | null;
  setDropAction: Dispatch<SetStateAction<OnDropAction | null>>;
};

const DnDContext = createContext<DnDContextType | null>(null);

export function DnDProvider({ children }: { children: React.ReactNode }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dropAction, setDropAction] = useState<OnDropAction | null>(null);

  return (
    <DnDContext.Provider
      value={{
        isDragging,
        setIsDragging,
        dropAction,
        setDropAction: (action) => setDropAction(() => action),
      }}
    >
      {children}
    </DnDContext.Provider>
  );
}

export const useDnD = () => {
  const context = useContext(DnDContext);

  if (!context) {
    throw new Error("useDnD must be used within a DnDProvider");
  }

  const { screenToFlowPosition } = useReactFlow();
  const { isDragging, setIsDragging, setDropAction, dropAction } = context;

  const onDragStart = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>, onDrop: OnDropAction) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setDropAction(onDrop);
    },
    [setIsDragging, setDropAction],
  );

  const onDragEnd = useCallback(
    (event: PointerEvent) => {
      if (!isDragging) {
        setIsDragging(false);
        return;
      }

      (event.target as HTMLElement).releasePointerCapture(event.pointerId);

      const elementUnderPointer = document.elementFromPoint(
        event.clientX,
        event.clientY,
      );
      const isDroppingOnFlow = elementUnderPointer?.closest(".react-flow");
      const containerBody = elementUnderPointer?.closest<HTMLElement>(
        "[data-container-body='true']",
      );
      const containerId = containerBody?.dataset.nodeId;
      const nodeElement = elementUnderPointer?.closest<HTMLElement>(
        ".react-flow__node",
      );
      const parentIdFromNode = nodeElement?.dataset.parentId;
      const containerIdFromNode = nodeElement?.dataset.containerId;
      const resolvedContainerId =
        containerId ?? parentIdFromNode ?? containerIdFromNode;
      const dropTarget: DropTarget = resolvedContainerId
        ? { type: "container-body", nodeId: resolvedContainerId }
        : { type: "flow" };

      if (isDroppingOnFlow) {
        const containerBodyElement = resolvedContainerId
          ? document.querySelector<HTMLElement>(
              `[data-container-body='true'][data-node-id='${resolvedContainerId}']`,
            )
          : containerBody;
        const rect = containerBodyElement?.getBoundingClientRect();
        const dropPoint = rect
          ? {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
            }
          : { x: event.clientX, y: event.clientY };
        const flowPosition = screenToFlowPosition(dropPoint);
        dropAction?.({ position: flowPosition, dropTarget });
      }

      setIsDragging(false);
    },
    [dropAction, isDragging, screenToFlowPosition, setIsDragging],
  );

  useEffect(() => {
    if (!isDragging) return;

    document.addEventListener("pointerup", onDragEnd);
    document.addEventListener("pointercancel", onDragEnd);

    return () => {
      document.removeEventListener("pointerup", onDragEnd);
      document.removeEventListener("pointercancel", onDragEnd);
    };
  }, [onDragEnd, isDragging]);

  return {
    isDragging,
    onDragStart,
  };
};

export const useDnDPosition = () => {
  const context = useContext(DnDContext);
  const [position, setPosition] = useState<XYPosition | null>(null);

  useEffect(() => {
    if (!context?.isDragging) {
      setPosition(null);
      return;
    }

    const onDrag = (event: PointerEvent) => {
      event.preventDefault();
      setPosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("pointermove", onDrag);
    return () => {
      document.removeEventListener("pointermove", onDrag);
    };
  }, [context?.isDragging]);

  return { position };
};
