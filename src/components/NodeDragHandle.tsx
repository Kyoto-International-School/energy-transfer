import { RiDragMove2Fill } from "react-icons/ri";

import { cn } from "@/lib/utils";

type NodeDragHandleProps = {
  className?: string;
  title?: string;
};

export function NodeDragHandle({
  className,
  title = "Drag to move",
}: NodeDragHandleProps) {
  return (
    <div className={cn("node-drag-handle", className)} title={title}>
      <RiDragMove2Fill className="node-drag-handle__icon" aria-hidden="true" />
    </div>
  );
}
