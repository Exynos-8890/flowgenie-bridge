
import React from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

interface NodeTypeProps {
  type: string;
  label: string;
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

const NodeType: React.FC<NodeTypeProps> = ({ type, label, onDragStart }) => {
  return (
    <div
      className="p-4 my-2 glass-panel rounded-lg cursor-grab hover:bg-opacity-90 active:cursor-grabbing animate-fade-in"
      draggable
      onDragStart={(event) => onDragStart(event, type)}
    >
      <div className="font-medium text-sm mb-1">{label}</div>
      <div className="text-xs text-gray-500">拖拽到画布使用</div>
    </div>
  );
};

interface NodePanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`glass-panel p-4 rounded-lg shadow-lg ${isMobile ? 'w-full' : 'w-[240px]'} animate-slide-in-left`}>
      <h3 className="font-medium text-sm mb-4 text-gray-700">可用节点</h3>
      
      <NodeType
        type="text"
        label="文本节点"
        onDragStart={onDragStart}
      />
      
      <NodeType
        type="processor"
        label="处理器"
        onDragStart={onDragStart}
      />
    </div>
  );
};

export default NodePanel;
