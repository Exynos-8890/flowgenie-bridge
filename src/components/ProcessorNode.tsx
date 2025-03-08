
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// Define the data shape only, not the full node
interface ProcessorNodeData {
  type?: string;
  prompt?: string;
}

// Use the NodeProps generic properly
const ProcessorNode = memo(({ data, selected }: NodeProps<ProcessorNodeData>) => {
  return (
    <div className={`p-3 min-w-[150px] flowsmith-processor animate-fade-in ${selected ? 'selected' : ''}`}>
      <div className="flex items-center justify-center">
        <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          {data?.type || 'Processor'}
        </div>
      </div>
      
      <Handle
        type="target"
        position={Position.Left}
        className="flowsmith-handle !left-[-7px]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="flowsmith-handle !right-[-7px]"
      />
    </div>
  );
});

export default ProcessorNode;
