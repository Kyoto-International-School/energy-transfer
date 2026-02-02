import { memo, useLayoutEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  Position,
  useStore,
  type EdgeProps,
} from "@xyflow/react";

import { getEdgeParams, getNodeRect } from "@/lib/edge-utils";

import {
  BLANK_STORE_OPTION,
  EDGE_LABEL_OPTIONS,
  type EdgeLabel,
  type EnergyEdge,
} from "../../types";

const DEFAULT_CURVATURE = 0.25;
const LABEL_MARGIN = 6;
const MARKER_RADIUS = 10;
const MIN_LABEL_OFFSET = 16;
const NEIGHBOR_RADIUS = 140;
const PARALLEL_EDGE_SPACING = 24;
const PARALLEL_EDGE_PADDING = 10;
const EDGE_INTERACTION_WIDTH = 24;

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
  source,
  target,
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
  const curvature = pathOptions?.curvature ?? DEFAULT_CURVATURE;
  const sourceNode = nodeLookup.get(source);
  const targetNode = nodeLookup.get(target);
  const edgeParams =
    sourceNode && targetNode ? getEdgeParams(sourceNode, targetNode) : null;
  let resolvedSourceX = edgeParams?.sx ?? sourceX;
  const resolvedSourceY = edgeParams?.sy ?? sourceY;
  let resolvedTargetX = edgeParams?.tx ?? targetX;
  const resolvedTargetY = edgeParams?.ty ?? targetY;
  const resolvedSourcePosition = edgeParams?.sourcePos ?? sourcePosition;
  const resolvedTargetPosition = edgeParams?.targetPos ?? targetPosition;
  const isIntraContainer =
    !!sourceNode?.parentId && sourceNode.parentId === targetNode?.parentId;

  const getNodeKind = (
    node: (typeof sourceNode | typeof targetNode) | undefined,
  ) => (node?.data as { kind?: unknown } | undefined)?.kind;
  const isStoreToStore =
    getNodeKind(sourceNode) === "store" &&
    getNodeKind(targetNode) === "store";

  if (isIntraContainer && isStoreToStore && sourceNode && targetNode && edgeParams) {
    const pairKey = [source, target].sort().join("::");
    const parallelEdges = edges.filter((edge) => {
      if (!edge.source || !edge.target) return false;
      const edgeKey = [edge.source, edge.target].sort().join("::");
      if (edgeKey !== pairKey) return false;
      const edgeSourceNode = nodeLookup.get(edge.source);
      const edgeTargetNode = nodeLookup.get(edge.target);
      if (!edgeSourceNode || !edgeTargetNode) return false;
      if (!edgeSourceNode.parentId) return false;
      if (edgeSourceNode.parentId !== edgeTargetNode.parentId) return false;
      const sourceKind = getNodeKind(edgeSourceNode);
      const targetKind = getNodeKind(edgeTargetNode);
      return sourceKind === "store" && targetKind === "store";
    });

    if (parallelEdges.length > 1) {
      parallelEdges.sort((a, b) => a.id.localeCompare(b.id));
      const index = parallelEdges.findIndex((edge) => edge.id === id);
      if (index >= 0) {
        const centerIndex = (parallelEdges.length - 1) / 2;
        const offset = (index - centerIndex) * PARALLEL_EDGE_SPACING;
        const sourceRect = getNodeRect(sourceNode);
        const targetRect = getNodeRect(targetNode);
        const clamp = (value: number, min: number, max: number) =>
          Math.min(Math.max(value, min), max);
        resolvedSourceX = clamp(
          edgeParams.sx + offset,
          sourceRect.x + PARALLEL_EDGE_PADDING,
          sourceRect.x + sourceRect.width - PARALLEL_EDGE_PADDING,
        );
        resolvedTargetX = clamp(
          edgeParams.tx + offset,
          targetRect.x + PARALLEL_EDGE_PADDING,
          targetRect.x + targetRect.width - PARALLEL_EDGE_PADDING,
        );
      }
    }
  }
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX: resolvedSourceX,
    sourceY: resolvedSourceY,
    sourcePosition: resolvedSourcePosition,
    targetX: resolvedTargetX,
    targetY: resolvedTargetY,
    targetPosition: resolvedTargetPosition,
    curvature,
  });
  const labelText = data?.label || label || "Select transfer";
  const activeLabel = data?.label ?? "";
  const isBlankLabel = labelText === BLANK_STORE_OPTION;
  const menuOptions: Array<{ label: string; value: EdgeLabel | "" }> = [
    { label: "Select transfer", value: "" },
    ...EDGE_LABEL_OPTIONS.map((option) => ({ label: option, value: option })),
  ];

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
    resolvedSourcePosition,
    resolvedSourceX,
    resolvedSourceY,
    resolvedTargetX,
    resolvedTargetY,
    curvature,
  );
  const [targetControlX, targetControlY] = getControlWithCurvature(
    resolvedTargetPosition,
    resolvedTargetX,
    resolvedTargetY,
    resolvedSourceX,
    resolvedSourceY,
    curvature,
  );
  const t = 0.5;
  const oneMinusT = 1 - t;
  const tangentX =
    3 * oneMinusT * oneMinusT * (sourceControlX - resolvedSourceX) +
    6 * oneMinusT * t * (targetControlX - sourceControlX) +
    3 * t * t * (resolvedTargetX - targetControlX);
  const tangentY =
    3 * oneMinusT * oneMinusT * (sourceControlY - resolvedSourceY) +
    6 * oneMinusT * t * (targetControlY - sourceControlY) +
    3 * t * t * (resolvedTargetY - targetControlY);
  const fallbackDX = resolvedTargetX - resolvedSourceX;
  const fallbackDY = resolvedTargetY - resolvedSourceY;
  const isHorizontal = Math.abs(fallbackDX) >= Math.abs(fallbackDY);
  const safeTangentX = Math.abs(tangentX) > 0.0001 ? tangentX : fallbackDX;
  const safeTangentY = Math.abs(tangentY) > 0.0001 ? tangentY : fallbackDY;
  const safeTangentLength = Math.hypot(safeTangentX, safeTangentY) || 1;
  const baseNormalX = -safeTangentY / safeTangentLength;
  const baseNormalY = safeTangentX / safeTangentLength;
  let labelPosX = labelX;
  let labelPosY = labelY;
  let normalX = 0;
  let normalY = -1;

  if (!isIntraContainer) {
    normalX = baseNormalX;
    normalY = baseNormalY;

    if (normalY > 0) {
      normalX = -normalX;
      normalY = -normalY;
    }

    const labelOffset = isHorizontal ? 24 : 16;
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
      const edgeSourceNode = nodeLookup.get(edge.source);
      const edgeTargetNode = nodeLookup.get(edge.target);
      if (!edgeSourceNode || !edgeTargetNode) continue;
      const edgePosition = getEdgeParams(edgeSourceNode, edgeTargetNode);
      const edgeCurvature =
        (edge as { pathOptions?: { curvature?: number } }).pathOptions
          ?.curvature ?? DEFAULT_CURVATURE;
      const [, centerX, centerY] = getBezierPath({
        sourceX: edgePosition.sx,
        sourceY: edgePosition.sy,
        sourcePosition: edgePosition.sourcePos,
        targetX: edgePosition.tx,
        targetY: edgePosition.ty,
        targetPosition: edgePosition.targetPos,
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
    normalX = useCandidateB ? candidateB.dirX : candidateA.dirX;
    normalY = useCandidateB ? candidateB.dirY : candidateA.dirY;

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
  if (isBlankLabel && labelSize.height > 0) {
    const blankExtraOffset = Math.max(0, (labelSize.height - 20) / 2);
    if (blankExtraOffset > 0) {
      labelPosX += normalX * blankExtraOffset;
      labelPosY += normalY * blankExtraOffset;
    }
  }
  const markerLength = 16;
  const markerDirX = resolvedTargetX - labelX;
  const markerDirY = resolvedTargetY - labelY;
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
        interactionWidth={interactionWidth ?? EDGE_INTERACTION_WIDTH}
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
          className={`edge-label-wrapper nodrag nopan${data?.lift ? " edge-drag-hold" : ""}`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelPosX}px, ${labelPosY}px)`,
          }}
          onClick={(event) => {
            event.stopPropagation();
            data?.onEdgeMenuToggle?.(id);
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <span className="edge-label-hit" aria-hidden="true" />
          <div
            ref={labelRef}
            className={`edge-label-text${isBlankLabel ? " edge-label-text--blank" : ""}`}
          >
            {labelText}
          </div>
          {data?.isEdgeMenuOpen && (
            <div
              className="edge-label-menu nodrag nopan"
              role="listbox"
              aria-label="Select transfer type"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {menuOptions.map((option) => (
                <button
                  key={option.value || "select"}
                  type="button"
                  className={`edge-label-menu__option${
                    option.value === BLANK_STORE_OPTION
                      ? " edge-label-menu__option--blank"
                      : ""
                  }`}
                  aria-pressed={activeLabel === option.value}
                  data-active={activeLabel === option.value}
                  onClick={(event) => {
                    event.stopPropagation();
                    data?.onEdgeLabelSelect?.(id, option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
