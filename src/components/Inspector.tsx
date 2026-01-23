import type { Node } from "@xyflow/react";
import type { EnergyNodeData } from "../types";

type InspectorProps = {
  selectedNode: Node<EnergyNodeData> | null;
  onLabelChange: (label: string) => void;
};

export function Inspector({ selectedNode, onLabelChange }: InspectorProps) {
  return (
    <aside className="panel panel--inspector">
      <div className="panel__header">
        <p className="panel__eyebrow">Inspector</p>
        <h2 className="panel__title">Selection</h2>
      </div>
      {selectedNode ? (
        <div className="inspector-grid">
          <div>
            <p className="inspector__label">Id</p>
            <p className="inspector__value">{selectedNode.id}</p>
          </div>
          <div>
            <p className="inspector__label">Type</p>
            <p className="inspector__value">
              {selectedNode.data.kind.toUpperCase()}
            </p>
          </div>
          <div>
            <label className="inspector__label" htmlFor="node-label">
              Label
            </label>
            <input
              id="node-label"
              className="inspector__input"
              type="text"
              value={selectedNode.data.label}
              onChange={(event) => onLabelChange(event.target.value)}
            />
          </div>
        </div>
      ) : (
        <p className="panel__note">Select a node to see its details.</p>
      )}
    </aside>
  );
}
