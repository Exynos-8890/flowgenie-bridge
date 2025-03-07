
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
      className="p-2 my-1 glass-panel rounded-lg cursor-grab hover:bg-opacity-90 active:cursor-grabbing animate-fade-in"
      draggable
      onDragStart={(event) => onDragStart(event, type)}
    >
      <div className="font-medium text-sm">{label}</div>
    </div>
  );
};

interface NodePanelProps {
  onDragStart: (event: React.DragEvent<HTMLDivElement>, nodeType: string) => void;
}

const NodePanel: React.FC<NodePanelProps> = ({ onDragStart }) => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`glass-panel p-2 rounded-lg shadow-lg ${isMobile ? 'w-full' : 'w-[160px]'} animate-slide-in-left`}>
      <div className="text-xs text-gray-500 mb-2">drag nodes to the map to create it</div>
      
      <NodeType
        type="text"
        label="text node"
        onDragStart={onDragStart}
      />
      
      <NodeType
        type="processor"
        label="processor"
        onDragStart={onDragStart}
      />
    </div>
  );
};

export default NodePanel;
