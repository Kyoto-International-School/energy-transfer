import { memo, useLayoutEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  useStore,
  type EdgeProps,
} from "@xyflow/react";
import { getEdgePosition } from "@xyflow/system";

import type { EnergyEdge } from "../../types";

const DEFAULT_CURVATURE = 0.25;
const LABEL_MARGIN = 6;
const MARKER_RADIUS = 10;
const MIN_LABEL_OFFSET = 16;
const NEIGHBOR_RADIUS = 140;

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
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [labelSize, setLabelSize] = useState({ width: 0, height: 0 });
  const edges = useStore((state) => state.edges);
  const nodeLookup = useStore((state) => state.nodeLookup);
  const connectionMode = useStore((state) => state.connectionMode);
  const onError = useStore((state) => state.onError);
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
  const labelText = data?.label || label || "Select store type";

  useLayoutEffect(() => {
    const element = labelRef.current;
    if (!element) return;

    const updateSize = () => {
      setLabelSize({ width: element.offsetWidth, height: element.offsetHeight });
    };

    updateSize();

    if (typeof ResizeObserver === "undefined") {
      return;
    }

    const observer = new ResizeObserver(updateSize);
    observer.observe(element);

    return () => observer.disconnect();
  }, [labelText]);
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
  const baseNormalX = -safeTangentY / safeTangentLength;
  const baseNormalY = safeTangentX / safeTangentLength;
  const currentEdge = edges.find((edge) => edge.id === id);
  const sourceNode = currentEdge ? nodeLookup.get(currentEdge.source) : null;
  const targetNode = currentEdge ? nodeLookup.get(currentEdge.target) : null;
  const isIntraContainer =
    !!sourceNode?.parentId && sourceNode.parentId === targetNode?.parentId;
  let labelPosX = labelX;
  let labelPosY = labelY;

  if (!isIntraContainer) {
    let normalX = baseNormalX;
    let normalY = baseNormalY;

    if (normalY > 0) {
      normalX = -normalX;
      normalY = -normalY;
    }

    const labelOffset = 16;
    labelPosX = labelX + normalX * labelOffset;
    labelPosY = labelY + normalY * labelOffset;
  } else {
    const labelHalfWidth = Math.max(labelSize.width / 2, 0);
    const labelHalfHeight = Math.max(labelSize.height / 2, 0);
    const markerClearance = MARKER_RADIUS + LABEL_MARGIN;
    const normalAbsX = Math.max(Math.abs(baseNormalX), 0.001);
    const normalAbsY = Math.max(Math.abs(baseNormalY), 0.001);
    const offsetForX = (labelHalfWidth + markerClearance) / normalAbsX;
    const offsetForY = (labelHalfHeight + markerClearance) / normalAbsY;
    const requiredOffset = Number.isFinite(offsetForX)
      ? Math.min(offsetForX, offsetForY)
      : offsetForY;
    const baseOffset = Math.max(MIN_LABEL_OFFSET, requiredOffset);
    const neighborAvoidRadius =
      Math.max(labelHalfWidth, labelHalfHeight, 10) + markerClearance;
    const neighborRadius = Math.max(NEIGHBOR_RADIUS, neighborAvoidRadius * 2);

    const markerPositions = [] as Array<{ id: string; x: number; y: number }>;

    for (const edge of edges) {
      if (!edge.source || !edge.target) continue;
      const sourceNode = nodeLookup.get(edge.source);
      const targetNode = nodeLookup.get(edge.target);
      if (!sourceNode || !targetNode) continue;
      const edgePosition = getEdgePosition({
        id: edge.id,
        sourceNode,
        targetNode,
        sourceHandle: edge.sourceHandle ?? null,
        targetHandle: edge.targetHandle ?? null,
        connectionMode,
        onError,
      });
      if (!edgePosition) continue;
      const edgeCurvature =
        (edge as { pathOptions?: { curvature?: number } }).pathOptions
          ?.curvature ?? DEFAULT_CURVATURE;
      const [, centerX, centerY] = getBezierPath({
        ...edgePosition,
        curvature: edgeCurvature,
      });
      markerPositions.push({ id: edge.id, x: centerX, y: centerY });
    }

    const nearbyMarkers = markerPositions.filter((marker) => {
      const dx = marker.x - labelX;
      const dy = marker.y - labelY;
      return Math.hypot(dx, dy) <= neighborRadius;
    });

    const evaluateCandidate = (dirX: number, dirY: number) => {
      const candidateX = labelX + dirX * baseOffset;
      const candidateY = labelY + dirY * baseOffset;
      let score = 0;
      let collisions = 0;

      for (const marker of nearbyMarkers) {
        const dx = candidateX - marker.x;
        const dy = candidateY - marker.y;
        const dist = Math.hypot(dx, dy);
        if (dist < neighborAvoidRadius) {
          collisions += 1;
          score += neighborAvoidRadius - dist;
        }
      }

      return { dirX, dirY, score, collisions };
    };

    const candidateA = evaluateCandidate(baseNormalX, baseNormalY);
    const candidateB = evaluateCandidate(-baseNormalX, -baseNormalY);
    const useCandidateB =
      candidateB.score < candidateA.score ||
      (candidateB.score === candidateA.score &&
        (candidateB.collisions < candidateA.collisions ||
          (candidateB.collisions === candidateA.collisions &&
            candidateB.dirY < candidateA.dirY)));
    const normalX = useCandidateB ? candidateB.dirX : candidateA.dirX;
    const normalY = useCandidateB ? candidateB.dirY : candidateA.dirY;

    const basePosX = labelX + normalX * baseOffset;
    const basePosY = labelY + normalY * baseOffset;
    let extraOffset = 0;

    for (const marker of nearbyMarkers) {
      const dx = basePosX - marker.x;
      const dy = basePosY - marker.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= neighborAvoidRadius) continue;
      const proj = dx * normalX + dy * normalY;
      if (proj <= 0) continue;
      const perpSq = Math.max(0, dist * dist - proj * proj);
      const targetSq = Math.max(
        0,
        neighborAvoidRadius * neighborAvoidRadius - perpSq,
      );
      const needed = -proj + Math.sqrt(targetSq);
      if (needed > extraOffset) {
        extraOffset = needed;
      }
    }

    const finalOffset = baseOffset + extraOffset;
    labelPosX = labelX + normalX * finalOffset;
    labelPosY = labelY + normalY * finalOffset;
  }
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
          <div ref={labelRef} className="edge-label-text">
            {labelText}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
