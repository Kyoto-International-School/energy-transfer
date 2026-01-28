import { Position, type InternalNode, type Node, type XYPosition } from "@xyflow/react";

import type { EnergyNodeKind } from "@/types";

type NodeRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type EdgeParams = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
};

const FALLBACK_SIZES: Record<EnergyNodeKind, { width: number; height: number }> = {
  container: { width: 168, height: 160 },
  store: { width: 144, height: 56 },
  external: { width: 32, height: 32 },
};

const DEFAULT_SIZE = { width: 120, height: 60 };

const isEnergyKind = (value: unknown): value is EnergyNodeKind =>
  value === "container" || value === "store" || value === "external";

const getNodeKind = (node: InternalNode<Node>): EnergyNodeKind => {
  const kind = (node.data as { kind?: unknown } | undefined)?.kind;
  return isEnergyKind(kind) ? kind : "store";
};

export const getNodeRect = (node: InternalNode<Node>): NodeRect => {
  const kind = getNodeKind(node);
  const fallback = FALLBACK_SIZES[kind] ?? DEFAULT_SIZE;
  const width = node.measured?.width ?? node.width ?? fallback.width;
  const height = node.measured?.height ?? node.height ?? fallback.height;
  const x = node.internals.positionAbsolute.x;
  const y = node.internals.positionAbsolute.y;

  return { x, y, width, height };
};

const getNodeCenter = (rect: NodeRect) => ({
  x: rect.x + rect.width / 2,
  y: rect.y + rect.height / 2,
});

const getPointForPosition = (rect: NodeRect, position: Position) => {
  switch (position) {
    case Position.Left:
      return { x: rect.x, y: rect.y + rect.height / 2 };
    case Position.Right:
      return { x: rect.x + rect.width, y: rect.y + rect.height / 2 };
    case Position.Top:
      return { x: rect.x + rect.width / 2, y: rect.y };
    case Position.Bottom:
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height };
  }
};

export const getOppositePosition = (position: Position) => {
  switch (position) {
    case Position.Left:
      return Position.Right;
    case Position.Right:
      return Position.Left;
    case Position.Top:
      return Position.Bottom;
    case Position.Bottom:
      return Position.Top;
  }
};

const isInSameContainer = (
  sourceNode: InternalNode<Node>,
  targetNode: InternalNode<Node>,
) =>
  !!sourceNode.parentId && sourceNode.parentId === targetNode.parentId;

export const getEdgeParams = (
  sourceNode: InternalNode<Node>,
  targetNode: InternalNode<Node>,
): EdgeParams => {
  const sourceRect = getNodeRect(sourceNode);
  const targetRect = getNodeRect(targetNode);
  const sourceCenter = getNodeCenter(sourceRect);
  const targetCenter = getNodeCenter(targetRect);
  const vertical = isInSameContainer(sourceNode, targetNode);

  let sourcePos: Position;
  let targetPos: Position;

  if (vertical) {
    if (targetCenter.y >= sourceCenter.y) {
      sourcePos = Position.Bottom;
      targetPos = Position.Top;
    } else {
      sourcePos = Position.Top;
      targetPos = Position.Bottom;
    }
  } else {
    if (targetCenter.x >= sourceCenter.x) {
      sourcePos = Position.Right;
      targetPos = Position.Left;
    } else {
      sourcePos = Position.Left;
      targetPos = Position.Right;
    }
  }

  const sourcePoint = getPointForPosition(sourceRect, sourcePos);
  const targetPoint = getPointForPosition(targetRect, targetPos);

  return {
    sx: sourcePoint.x,
    sy: sourcePoint.y,
    tx: targetPoint.x,
    ty: targetPoint.y,
    sourcePos,
    targetPos,
  };
};

export const getSourcePointForPointer = (
  sourceNode: InternalNode<Node>,
  pointer: XYPosition,
) => {
  const sourceRect = getNodeRect(sourceNode);
  const sourceCenter = getNodeCenter(sourceRect);
  const dx = pointer.x - sourceCenter.x;
  const dy = pointer.y - sourceCenter.y;
  const halfWidth = sourceRect.width / 2 || 1;
  const halfHeight = sourceRect.height / 2 || 1;

  if (dx === 0 && dy === 0) {
    const point = getPointForPosition(sourceRect, Position.Right);
    return { ...point, position: Position.Right };
  }

  const scale = Math.max(Math.abs(dx) / halfWidth, Math.abs(dy) / halfHeight) || 1;
  const intersection = {
    x: sourceCenter.x + dx / scale,
    y: sourceCenter.y + dy / scale,
  };

  const left = sourceRect.x;
  const right = sourceRect.x + sourceRect.width;
  const top = sourceRect.y;
  const bottom = sourceRect.y + sourceRect.height;

  const distances = [
    { position: Position.Left, value: Math.abs(intersection.x - left) },
    { position: Position.Right, value: Math.abs(intersection.x - right) },
    { position: Position.Top, value: Math.abs(intersection.y - top) },
    { position: Position.Bottom, value: Math.abs(intersection.y - bottom) },
  ];

  distances.sort((a, b) => a.value - b.value);
  const position = distances[0]?.position ?? Position.Right;

  const clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);

  let point: { x: number; y: number };
  switch (position) {
    case Position.Left:
      point = { x: left, y: clamp(intersection.y, top, bottom) };
      break;
    case Position.Right:
      point = { x: right, y: clamp(intersection.y, top, bottom) };
      break;
    case Position.Top:
      point = { x: clamp(intersection.x, left, right), y: top };
      break;
    case Position.Bottom:
    default:
      point = { x: clamp(intersection.x, left, right), y: bottom };
      break;
  }

  return { ...point, position };
};
