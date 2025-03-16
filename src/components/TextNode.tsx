
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Plug, Cable } from 'lucide-react';

interface TextNodeData {
  label?: string;
  content?: string;
}

const TextNode = memo(({ data, selected }: NodeProps<TextNodeData>) => {
  return (
    <div className={`p-4 min-w-[200px] max-w-[300px] flowsmith-node animate-fade-in ${selected ? 'selected bg-gray-50' : ''}`}>
      <div className="font-medium text-sm text-gray-700 mb-2">
        {data?.label || 'Untitled Node'}
      </div>
      
      {data?.content && (
        <div className="text-xs text-gray-500 truncate" title={data.content}>
          {data.content.length > 50 ? data.content.substring(0, 50) + '...' : data.content}
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

TextNode.displayName = 'TextNode';

export default TextNode;
