import { useRef } from "react";
import {
  getBezierPath,
  Position,
  type ConnectionLineComponentProps,
  type XYPosition,
} from "@xyflow/react";

import {
  getNodeRect,
  getOppositePosition,
  getSourcePointForPointer,
} from "@/lib/edge-utils";
import type { EnergyNode } from "@/types";

type ExitPoint = {
  x: number;
  y: number;
  position: Position;
};

const getExitPoint = (
  fromPoint: XYPosition,
  toPoint: XYPosition,
  rect: { x: number; y: number; width: number; height: number },
): ExitPoint | null => {
  const left = rect.x;
  const right = rect.x + rect.width;
  const top = rect.y;
  const bottom = rect.y + rect.height;
  const dx = toPoint.x - fromPoint.x;
  const dy = toPoint.y - fromPoint.y;
  const candidates: Array<ExitPoint & { t: number }> = [];

  if (dx !== 0) {
    const tLeft = (left - fromPoint.x) / dx;
    if (tLeft >= 0 && tLeft <= 1) {
      const y = fromPoint.y + tLeft * dy;
      if (y >= top && y <= bottom) {
        candidates.push({ t: tLeft, x: left, y, position: Position.Left });
      }
    }
    const tRight = (right - fromPoint.x) / dx;
    if (tRight >= 0 && tRight <= 1) {
      const y = fromPoint.y + tRight * dy;
      if (y >= top && y <= bottom) {
        candidates.push({ t: tRight, x: right, y, position: Position.Right });
      }
    }
  }

  if (dy !== 0) {
    const tTop = (top - fromPoint.y) / dy;
    if (tTop >= 0 && tTop <= 1) {
      const x = fromPoint.x + tTop * dx;
      if (x >= left && x <= right) {
        candidates.push({ t: tTop, x, y: top, position: Position.Top });
      }
    }
    const tBottom = (bottom - fromPoint.y) / dy;
    if (tBottom >= 0 && tBottom <= 1) {
      const x = fromPoint.x + tBottom * dx;
      if (x >= left && x <= right) {
        candidates.push({ t: tBottom, x, y: bottom, position: Position.Bottom });
      }
    }
  }

  if (!candidates.length) return null;
  candidates.sort((a, b) => a.t - b.t);
  const { x, y, position } = candidates[0];
  return { x, y, position };
};

export function EasyConnectionLine({
  fromNode,
  toNode,
  toX,
  toY,
  pointer,
  connectionLineStyle,
  connectionStatus,
}: ConnectionLineComponentProps<EnergyNode>) {
  const lastInsidePointerRef = useRef<XYPosition | null>(null);
  const exitPointRef = useRef<ExitPoint | null>(null);
  const fromNodeIdRef = useRef<string | null>(null);
  const lastOutsideTargetPointerRef = useRef<XYPosition | null>(null);
  const targetEntryRef = useRef<ExitPoint | null>(null);
  const targetNodeIdRef = useRef<string | null>(null);
  if (!fromNode) return null;

  const resolvedPointer =
    Number.isFinite(toX) && Number.isFinite(toY)
      ? { x: toX, y: toY }
      : pointer ?? null;
  if (!resolvedPointer) return null;

  if (fromNodeIdRef.current !== fromNode.id) {
    fromNodeIdRef.current = fromNode.id;
    lastInsidePointerRef.current = null;
    exitPointRef.current = null;
    lastOutsideTargetPointerRef.current = null;
    targetEntryRef.current = null;
    targetNodeIdRef.current = null;
  }

  const rect = getNodeRect(fromNode);
  const isInside =
    resolvedPointer.x >= rect.x &&
    resolvedPointer.x <= rect.x + rect.width &&
    resolvedPointer.y >= rect.y &&
    resolvedPointer.y <= rect.y + rect.height;

  if (isInside) {
    lastInsidePointerRef.current = resolvedPointer;
    exitPointRef.current = null;
    lastOutsideTargetPointerRef.current = null;
    targetEntryRef.current = null;
    targetNodeIdRef.current = null;
    return null;
  }

  if (!exitPointRef.current) {
    const insidePoint =
      lastInsidePointerRef.current ?? {
        x: rect.x + rect.width / 2,
        y: rect.y + rect.height / 2,
      };
    const exitPoint = getExitPoint(insidePoint, resolvedPointer, rect);
    if (exitPoint) {
      exitPointRef.current = exitPoint;
    }
  }

  const sourcePoint =
    exitPointRef.current ?? getSourcePointForPointer(fromNode, resolvedPointer);

  const isValidTarget =
    connectionStatus === "valid" && toNode && toNode.id !== fromNode.id;
  let targetPoint: ExitPoint | null = null;

  if (isValidTarget && toNode) {
    if (targetNodeIdRef.current !== toNode.id) {
      targetNodeIdRef.current = toNode.id;
      targetEntryRef.current = null;
    }

    const targetRect = getNodeRect(toNode);
    const isInsideTarget =
      resolvedPointer.x >= targetRect.x &&
      resolvedPointer.x <= targetRect.x + targetRect.width &&
      resolvedPointer.y >= targetRect.y &&
      resolvedPointer.y <= targetRect.y + targetRect.height;

    if (isInsideTarget) {
      if (!targetEntryRef.current) {
        const outsidePoint =
          lastOutsideTargetPointerRef.current ?? resolvedPointer;
        const entryPoint = getExitPoint(outsidePoint, resolvedPointer, targetRect);
        if (entryPoint) {
          targetEntryRef.current = entryPoint;
        }
      }
      targetPoint = targetEntryRef.current;
    } else {
      lastOutsideTargetPointerRef.current = resolvedPointer;
      targetEntryRef.current = null;
    }
  } else {
    targetNodeIdRef.current = null;
    targetEntryRef.current = null;
    lastOutsideTargetPointerRef.current = resolvedPointer;
  }

  const [edgePath] = getBezierPath({
    sourceX: sourcePoint.x,
    sourceY: sourcePoint.y,
    sourcePosition: sourcePoint.position,
    targetX: targetPoint?.x ?? resolvedPointer.x,
    targetY: targetPoint?.y ?? resolvedPointer.y,
    targetPosition:
      targetPoint?.position ?? getOppositePosition(sourcePoint.position),
  });

  return (
    <g>
      <path
        className="react-flow__connection-path"
        style={connectionLineStyle}
        fill="none"
        d={edgePath}
      />
    </g>
  );
}
