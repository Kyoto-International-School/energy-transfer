import { Handle, Position, useConnection } from "@xyflow/react";

type EasyConnectHandlesProps = {
  nodeId: string;
};

export function EasyConnectHandles({ nodeId }: EasyConnectHandlesProps) {
  const connection = useConnection();
  const fromNodeId = connection.fromNode?.id;
  const isConnecting = connection.inProgress;
  const isTarget = isConnecting && fromNodeId && fromNodeId !== nodeId;

  return (
    <>
      <Handle
        className="node-connect-handle"
        type="source"
        position={Position.Right}
        isConnectable={!isConnecting}
        style={{ pointerEvents: isConnecting ? "none" : "auto" }}
      />
      <Handle
        className="node-connect-handle"
        type="target"
        position={Position.Left}
        isConnectable={!!isTarget}
        isConnectableStart={false}
        isConnectableEnd={!!isTarget}
        style={{ pointerEvents: isTarget ? "auto" : "none" }}
      />
    </>
  );
}
