import type { Edge, Node } from "@xyflow/react";

export type EnergyNodeKind = "container" | "store" | "external";

export type EnergyNodeType = "container" | "store" | "external";

export const BLANK_STORE_OPTION = "________________" as const;
export const BLANK_LABEL_MIN_HEIGHT = 48;

export const STORE_TYPE_OPTIONS = [
  "Thermal",
  "Kinetic",
  "Chemical",
  "Nuclear",
  "Elastic potential",
  "Gravitational potential",
  "Electrostatic potential",
  "Magnetic potential",
  "(Passthrough)",
  BLANK_STORE_OPTION,
] as const;

export type StoreType = (typeof STORE_TYPE_OPTIONS)[number];

export const EDGE_LABEL_OPTIONS = [
  "(none)",
  "Mechanical",
  "Light/ Radiation",
  "Electrical",
  "Sound",
  "Thermal conduction",
  BLANK_STORE_OPTION,
] as const;

export type EdgeLabel = (typeof EDGE_LABEL_OPTIONS)[number];

export type EnergyNodeData = {
  label: string;
  kind: EnergyNodeKind;
  storeType?: StoreType | "";
  storeCount?: number;
  onAddStore?: (containerId: string) => void;
  onStoreTypeSelect?: (nodeId: string, storeType: StoreType | "") => void;
  isStoreMenuOpen?: boolean;
  onLabelChange?: (nodeId: string, label: string) => void;
};

export type EnergyNode = Node<EnergyNodeData, EnergyNodeType>;

export type EnergyEdgeData = {
  label?: EdgeLabel | "";
  lift?: boolean;
  onEdgeLabelSelect?: (edgeId: string, label: EdgeLabel | "") => void;
  onEdgeMenuToggle?: (edgeId: string) => void;
  isEdgeMenuOpen?: boolean;
};

export type EnergyEdge = Edge<EnergyEdgeData>;
