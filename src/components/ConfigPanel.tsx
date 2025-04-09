
import React, { useState, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Maximize } from 'lucide-react';

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
  const [autoSaveTimeout, setAutoSaveTimeout] = useState<NodeJS.Timeout | null>(null);
  const [fullscreenEditor, setFullscreenEditor] = useState(false);

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
    
    // Clear previous timeout if it exists
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    // Set a new timeout for auto-save
    const timeout = setTimeout(() => {
      if (selectedNode) {
        onUpdateNode(selectedNode.id, { ...nodeData, [key]: value });
      }
    }, 800); // 800ms debounce time for typing
    
    setAutoSaveTimeout(timeout);
  };
  
  const handleSave = () => {
    if (selectedNode) {
      onUpdateNode(selectedNode.id, nodeData);
    }
  };
  
  const renderTextNodeConfig = () => (
    <>
      <div className="space-y-4 mb-4">
        <div className="space-y-2">
          <Label htmlFor="nodeTitle">Node Title</Label>
          <Input id="nodeTitle" value={nodeData.label || ''} onChange={e => handleChange('label', e.target.value)} placeholder="Enter node title" />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label htmlFor="nodeContent">Content</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFullscreenEditor(true)}
              className="h-8 w-8 p-0"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
          <Textarea 
            id="nodeContent" 
            value={nodeData.content || ''} 
            onChange={e => handleChange('content', e.target.value)} 
            placeholder="Enter node content" 
            className="min-h-[200px] resize-y" 
          />
        </div>
      </div>
      
      <div className="flex justify-between">
        <Button variant="outline" onClick={() => selectedNode && onDeleteNode(selectedNode.id)}>
          Delete Node
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
      </div>

      {/* Fullscreen Editor Dialog */}
      <Dialog open={fullscreenEditor} onOpenChange={setFullscreenEditor}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{nodeData.label || 'Edit Content'}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[70vh] flex flex-col">
            <Textarea 
              value={nodeData.content || ''} 
              onChange={e => handleChange('content', e.target.value)} 
              placeholder="Enter node content" 
              className="flex-1 min-h-[60vh] resize-none text-base p-4"
            />
            <div className="flex justify-end mt-4 space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setFullscreenEditor(false)}
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  handleSave();
                  setFullscreenEditor(false);
                }}
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
  
  const renderProcessorConfig = () => (
    <>
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
          <div className="flex justify-between items-center">
            <Label htmlFor="promptTemplate">Prompt Template</Label>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setFullscreenEditor(true)}
              className="h-8 w-8 p-0"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
          <Textarea id="promptTemplate" value={nodeData.prompt !== undefined ? nodeData.prompt : 'Process this text:\n\n{{input}}'} onChange={e => handleChange('prompt', e.target.value)} placeholder="Enter prompt here" className="min-h-[150px] resize-y font-mono text-sm" />
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

      {/* Fullscreen Editor Dialog */}
      <Dialog open={fullscreenEditor} onOpenChange={setFullscreenEditor}>
        <DialogContent className="max-w-[90vw] w-[90vw] max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Edit Prompt Template</DialogTitle>
          </DialogHeader>
          <div className="flex-1 min-h-[70vh] flex flex-col">
            <Textarea 
              value={nodeData.prompt || 'Process this text:\n\n{{input}}'} 
              onChange={e => handleChange('prompt', e.target.value)} 
              placeholder="Enter prompt template" 
              className="flex-1 min-h-[60vh] resize-none font-mono text-base p-4"
            />
            <div className="flex justify-end mt-4 space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setFullscreenEditor(false)}
              >
                Close
              </Button>
              <Button 
                onClick={() => {
                  handleSave();
                  setFullscreenEditor(false);
                }}
              >
                Save & Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
  
  const renderEdgeConfig = () => (
    <div className="flex justify-center">
      <Button variant="outline" onClick={() => selectedEdge && onDeleteEdge(selectedEdge.id)}>
        Delete Connection
      </Button>
    </div>
  );
  
  // 如果没有选中节点或边，不显示面板
  if (!selectedNode && !selectedEdge) {
    return null;
  }
  
  return (
    <div className={`glass-panel p-6 rounded-lg shadow-lg ${isMobile ? 'w-full' : 'w-[320px]'} animate-slide-in-right`}>
      <h3 className="font-medium text-sm mb-4 text-gray-700">
        {selectedNode ? selectedNode.type === 'processor' ? 'Processor Configuration' : 'Text Node Configuration' : selectedEdge ? 'Connection Configuration' : 'Configuration'}
      </h3>
      
      {selectedNode && selectedNode.type === 'text' && renderTextNodeConfig()}
      {selectedNode && selectedNode.type === 'processor' && renderProcessorConfig()}
      {selectedEdge && renderEdgeConfig()}
    </div>
  );
};

export default ConfigPanel;
