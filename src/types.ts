export type EnergyNodeKind = "container" | "store";

export type EnergyNodeData = {
  label: string;
  kind: EnergyNodeKind;
};
