
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

interface TextNodeData {
  label?: string;
  content?: string;
}

const TextNode = memo(({ data, selected }: NodeProps<TextNodeData>) => {
  return (
    <div className={`p-4 min-w-[200px] max-w-[300px] flowsmith-node animate-fade-in ${selected ? 'selected' : ''}`}>
      <div className="font-medium text-sm text-gray-700 mb-2 truncate">{data?.label || 'Untitled Node'}</div>
      <div className="text-xs text-gray-500 truncate max-h-[60px] overflow-hidden">
        {data?.content || 'No content'}
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

export default TextNode;
