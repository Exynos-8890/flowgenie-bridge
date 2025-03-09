
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';

// 定义文本节点的数据类型
interface TextNodeData {
  label?: string;
  content?: string;
}

// 使用NodeProps泛型正确地定义组件
const TextNode = memo(({ data, selected }: NodeProps<{
  label?: string;
  content?: string;
}>) => {
  return (
    <div className={`p-4 min-w-[200px] max-w-[300px] flowsmith-node animate-fade-in ${selected ? 'selected' : ''}`}>
      <div className="font-medium text-sm text-gray-700">
        {data?.label || 'Untitled Node'}
      </div>
      
      {data?.content && (
        <div className="mt-2 text-xs text-gray-600 max-h-[150px] overflow-y-auto">
          {data.content}
        </div>
      )}
      
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
