import type { Edge, Viewport } from "@xyflow/react";
import type { EnergyEdgeData, EnergyNode } from "./types";

type PersistedDiagram = {
  nodes: EnergyNode[];
  edges: Array<Edge<EnergyEdgeData>>;
  viewport: Viewport;
};

export type LocalStorageExport = {
  version: 1;
  exportedAt: string;
  items: Record<string, string>;
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

const createLocalStorageExport = (): LocalStorageExport | null => {
  if (typeof window === "undefined") return null;

  const items: Record<string, string> = {};
  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key) continue;
    const value = window.localStorage.getItem(key);
    if (value === null) continue;
    items[key] = value;
  }

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    items,
  };
};

export const parseLocalStorageExport = (
  raw: string,
): LocalStorageExport | null => {
  try {
    const parsed = JSON.parse(raw) as Partial<LocalStorageExport>;
    if (!parsed || parsed.version !== 1) return null;
    if (typeof parsed.exportedAt !== "string") return null;
    if (
      !parsed.items ||
      typeof parsed.items !== "object" ||
      Array.isArray(parsed.items)
    ) {
      return null;
    }

    const entries = Object.entries(parsed.items);
    const items: Record<string, string> = {};
    for (const [key, value] of entries) {
      if (typeof value !== "string") return null;
      items[key] = value;
    }

    return {
      version: 1,
      exportedAt: parsed.exportedAt,
      items,
    };
  } catch {
    return null;
  }
};

export const applyLocalStorageImport = (payload: LocalStorageExport): boolean => {
  if (typeof window === "undefined") return false;

  try {
    window.localStorage.clear();
    Object.entries(payload.items).forEach(([key, value]) => {
      window.localStorage.setItem(key, value);
    });
    return true;
  } catch {
    return false;
  }
};

export const downloadLocalStorageExport = (fileName: string) => {
  if (typeof window === "undefined") return;

  const payload = createLocalStorageExport();
  if (!payload) return;

  try {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = window.document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = "noopener";
    anchor.click();
    window.URL.revokeObjectURL(url);
  } catch {
    // Ignore download errors (browser restrictions, etc.)
  }
};
