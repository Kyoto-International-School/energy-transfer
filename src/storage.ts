import type { Edge, Node, Viewport } from "@xyflow/react";
import type { EnergyNodeData } from "./types";

type PersistedDiagram = {
  nodes: Array<Node<EnergyNodeData>>;
  edges: Edge[];
  viewport: Viewport;
};

const STORAGE_KEY = "energy-transfer-diagram:v1";

export const loadDiagram = (): PersistedDiagram | null => {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedDiagram;
    if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

export const saveDiagram = (diagram: PersistedDiagram) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(diagram));
  } catch {
    // Ignore persistence errors (storage quota, privacy mode, etc.)
  }
};
