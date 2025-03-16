import React, { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
interface ConfigPanelProps {
  selectedNode: Node | null;
  selectedEdge: Edge | null;
  onUpdateNode: (nodeId: string, data: any) => void;
  onDeleteNode: (nodeId: string) => void;
  onDeleteEdge: (edgeId: string) => void;
  onExecuteProcessor: (processorId: string) => void;
}
const ConfigPanel: React.FC<ConfigPanelProps> = ({
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onDeleteNode,
  onDeleteEdge,
  onExecuteProcessor
}) => {
  const isMobile = useIsMobile();
  const [nodeData, setNodeData] = useState<any>({});

  // Update local state when the selected node changes
  useEffect(() => {
    if (selectedNode) {
      setNodeData({
        ...selectedNode.data
      });
    } else {
      setNodeData({});
    }
  }, [selectedNode]);
  const handleChange = (key: string, value: string) => {
    setNodeData(prev => ({
      ...prev,
      [key]: value
    }));
  };
  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, nodeData);
    }
  };
  const renderTextNodeConfig = () => <>
      <div className="space-y-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="nodeTitle">Node Title</Label>
          <Input id="nodeTitle" value={nodeData.label || ''} onChange={e => handleChange('label', e.target.value)} placeholder="Enter node title" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="nodeContent">Content</Label>
          <Textarea id="nodeContent" value={nodeData.content || ''} onChange={e => handleChange('content', e.target.value)} placeholder="Enter node content" className="min-h-[200px] resize-y" />
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => selectedNode && onDeleteNode(selectedNode.id)}>
          Delete Node
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>
    </>;
  const renderProcessorConfig = () => <>
      <div className="space-y-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="processorType">Processor Type</Label>
          <Select value={nodeData.type || 'summary'} onValueChange={value => handleChange('type', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select processor type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="summary">Summary</SelectItem>
              <SelectItem value="translate">Translate</SelectItem>
              <SelectItem value="refine">Refine</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="promptTemplate">
            Prompt Template 
            <span className="text-xs text-gray-500 ml-2">(Use {"{{"}{"{{"} input }}"}}to reference input text)</span>
          </Label>
          <Textarea id="promptTemplate" value={nodeData.prompt || 'Process this text:\n\n{{input}}'} onChange={e => handleChange('prompt', e.target.value)} placeholder="Enter prompt template" className="min-h-[150px] resize-y font-mono text-sm" />
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => selectedNode && onDeleteNode(selectedNode.id)} className="rounded-none mx-0">Delete</Button>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleSave} className="mx-[11px]">Save</Button>
          <Button onClick={() => selectedNode && onExecuteProcessor(selectedNode.id)}>
            Execute
          </Button>
        </div>
      </div>
    </>;
  const renderEdgeConfig = () => <div className="flex justify-center">
      <Button variant="outline" onClick={() => selectedEdge && onDeleteEdge(selectedEdge.id)}>
        Delete Connection
      </Button>
    </div>;
  if (!selectedNode && !selectedEdge) {
    return <div className={`glass-panel p-6 rounded-lg shadow-lg ${isMobile ? 'w-full' : 'w-[320px]'} animate-slide-in-right flex items-center justify-center`}>
        <div className="text-center text-gray-500">
          <p className="text-sm">Select a node or connection to configure</p>
        </div>
      </div>;
  }
  return <div className={`glass-panel p-6 rounded-lg shadow-lg ${isMobile ? 'w-full' : 'w-[320px]'} animate-slide-in-right`}>
      <h3 className="font-medium text-sm mb-4 text-gray-700">
        {selectedNode ? selectedNode.type === 'processor' ? 'Processor Configuration' : 'Text Node Configuration' : selectedEdge ? 'Connection Configuration' : 'Configuration'}
      </h3>
      
      {selectedNode && selectedNode.type === 'text' && renderTextNodeConfig()}
      {selectedNode && selectedNode.type === 'processor' && renderProcessorConfig()}
      {selectedEdge && renderEdgeConfig()}
    </div>;
};
export default ConfigPanel;