import type { Edge, Node } from "@xyflow/react";

export type EnergyNodeKind = "container" | "store" | "external";

export type EnergyNodeType = "container" | "store" | "external";

export const STORE_TYPE_OPTIONS = [
  "Thermal",
  "Kinetic",
  "Chemical",
  "Nuclear",
  "Elastic potential",
  "Gravitational potential",
  "Electrostatic potential",
  "Magnetic potential",
] as const;

export type StoreType = (typeof STORE_TYPE_OPTIONS)[number];

export const EDGE_LABEL_OPTIONS = [
  "(none)",
  "Mechanical",
  "Light/ Radiation",
  "Electrical",
  "Sound",
  "Thermal conduction",
] as const;

export type EdgeLabel = (typeof EDGE_LABEL_OPTIONS)[number];

export type EnergyNodeData = {
  label: string;
  kind: EnergyNodeKind;
  storeType?: StoreType | "";
  storeCount?: number;
  onAddStore?: (containerId: string) => void;
};

export type EnergyNode = Node<EnergyNodeData, EnergyNodeType>;

export type EnergyEdgeData = {
  label?: EdgeLabel | "";
  lift?: boolean;
};

export type EnergyEdge = Edge<EnergyEdgeData>;
