import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

import type { EnergyEdge } from "../../types";

const DEFAULT_CURVATURE = 0.25;

const calculateControlOffset = (distance: number, curvature: number) => {
  if (distance >= 0) {
    return 0.5 * distance;
  }
  return curvature * 25 * Math.sqrt(-distance);
};

const getControlWithCurvature = (
  pos: Position,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  curvature: number,
): [number, number] => {
  switch (pos) {
    case Position.Left:
      return [x1 - calculateControlOffset(x1 - x2, curvature), y1];
    case Position.Right:
      return [x1 + calculateControlOffset(x2 - x1, curvature), y1];
    case Position.Top:
      return [x1, y1 - calculateControlOffset(y1 - y2, curvature)];
    case Position.Bottom:
      return [x1, y1 + calculateControlOffset(y2 - y1, curvature)];
  }

  return [x1, y1];
};

export const LabeledArrowEdge = memo(function LabeledArrowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  label,
  data,
  pathOptions,
  markerEnd,
  interactionWidth,
}: EdgeProps<EnergyEdge>) {
  const curvature = pathOptions?.curvature ?? DEFAULT_CURVATURE;
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });
  const labelText = data?.label || label || "Select edge type";
  const [sourceControlX, sourceControlY] = getControlWithCurvature(
    sourcePosition,
    sourceX,
    sourceY,
    targetX,
    targetY,
    curvature,
  );
  const [targetControlX, targetControlY] = getControlWithCurvature(
    targetPosition,
    targetX,
    targetY,
    sourceX,
    sourceY,
    curvature,
  );
  const t = 0.5;
  const oneMinusT = 1 - t;
  const tangentX =
    3 * oneMinusT * oneMinusT * (sourceControlX - sourceX) +
    6 * oneMinusT * t * (targetControlX - sourceControlX) +
    3 * t * t * (targetX - targetControlX);
  const tangentY =
    3 * oneMinusT * oneMinusT * (sourceControlY - sourceY) +
    6 * oneMinusT * t * (targetControlY - sourceControlY) +
    3 * t * t * (targetY - targetControlY);
  const fallbackDX = targetX - sourceX;
  const fallbackDY = targetY - sourceY;
  const safeTangentX = Math.abs(tangentX) > 0.0001 ? tangentX : fallbackDX;
  const safeTangentY = Math.abs(tangentY) > 0.0001 ? tangentY : fallbackDY;
  const safeTangentLength = Math.hypot(safeTangentX, safeTangentY) || 1;
  const angle =
    (Math.atan2(safeTangentY, safeTangentX) * 180) / Math.PI;
  const labelOffset = 16;
  let normalX = -safeTangentY / safeTangentLength;
  let normalY = safeTangentX / safeTangentLength;

  if (normalY > 0) {
    normalX = -normalX;
    normalY = -normalY;
  }

  const labelPosX = labelX + normalX * labelOffset;
  const labelPosY = labelY + normalY * labelOffset;
  const markerLength = 16;
  const markerDirX = targetX - labelX;
  const markerDirY = targetY - labelY;
  const markerDirLength = Math.hypot(markerDirX, markerDirY);
  const markerUnitX =
    markerDirLength > 0.0001
      ? markerDirX / markerDirLength
      : safeTangentX / safeTangentLength;
  const markerUnitY =
    markerDirLength > 0.0001
      ? markerDirY / markerDirLength
      : safeTangentY / safeTangentLength;
  const markerStartX = labelX - markerUnitX * markerLength;
  const markerStartY = labelY - markerUnitY * markerLength;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        interactionWidth={interactionWidth}
      />
      {markerEnd && (
        <path
          className="edge-center-marker"
          d={`M${markerStartX},${markerStartY} L${labelX},${labelY}`}
          markerEnd={markerEnd}
        />
      )}
      <EdgeLabelRenderer>
        <div
          className="edge-label-wrapper nodrag nopan"
          style={{
            transform: `translate(-50%, -50%) translate(${labelPosX}px, ${labelPosY}px)`,
          }}
        >
          <div className="edge-label-text">{labelText}</div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
