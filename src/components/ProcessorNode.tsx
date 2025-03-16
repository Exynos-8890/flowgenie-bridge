
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plug, Cable } from 'lucide-react';

interface ProcessorNodeData {
  type?: string;
  prompt?: string;
}

const ProcessorNode = memo(({ data, selected }: NodeProps<ProcessorNodeData>) => {
  return (
    <div className={`p-3 min-w-[180px] flowsmith-processor animate-fade-in ${selected ? 'selected bg-blue-50' : ''}`}>
      <div className="flex items-center justify-center mb-2">
        <div className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
          {data?.type || 'Processor'}
        </div>
      </div>
      
      {data?.prompt && (
        <div className="text-xs text-gray-500 truncate max-w-[200px] mb-1" title={data.prompt}>
          {data.prompt.length > 30 ? data.prompt.substring(0, 30) + '...' : data.prompt}
        </div>
      )}
      
      <Handle
        type="target"
        position={Position.Left}
        className="flowsmith-handle !left-[-7px] !border-blue-500 !bg-white"
      >
        <div className="absolute left-[-24px] top-[-8px]">
          <Plug size={16} className="text-blue-500" />
        </div>
      </Handle>
      
      <Handle
        type="source"
        position={Position.Right}
        className="flowsmith-handle !right-[-7px] !border-green-500 !bg-white"
      >
        <div className="absolute right-[-24px] top-[-8px]">
          <Cable size={16} className="text-green-500" />
        </div>
      </Handle>
    </div>
  );
});

ProcessorNode.displayName = 'ProcessorNode';

export default ProcessorNode;
