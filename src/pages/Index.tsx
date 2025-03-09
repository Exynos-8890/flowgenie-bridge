
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  Node,
  Edge,
  Connection,
  useNodesState,
  useEdgesState,
  addEdge,
  ConnectionLineType,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import { supabase } from '@/integrations/supabase/client';

import NodePanel from '@/components/NodePanel';
import ConfigPanel from '@/components/ConfigPanel';
import FlowSelector from '@/components/FlowSelector';
import TextNode from '@/components/TextNode';
import ProcessorNode from '@/components/ProcessorNode';
import CustomEdge from '@/components/CustomEdge';
import { createTextNode, createProcessorNode, executeProcessor } from '@/lib/nodes';
import { useIsMobile } from '@/hooks/use-mobile';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Define node types with proper TypeScript typing
const nodeTypes = {
  text: TextNode,
  processor: ProcessorNode,
};

const edgeTypes = {
  default: CustomEdge,
};

const initialNodes: Node[] = [
  {
    id: 'welcome-node',
    type: 'text',
    position: { x: 250, y: 150 },
    data: { 
      label: 'Welcome to Flowsmith', 
      content: 'Drag nodes from the left panel to create your workflow. Connect nodes to build processing pipelines.' 
    },
  },
];

const initialEdges: Edge[] = [];

const Flowsmith = () => {
  const isMobile = useIsMobile();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [showFlowSelector, setShowFlowSelector] = useState(false);

  // Create a new flow
  const handleNewFlow = async () => {
    try {
      // Reset the canvas
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      // Create a new flow in the database
      const { data, error } = await supabase
        .from('flows')
        .insert([{ nodes: initialNodes, edges: initialEdges }])
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentFlowId(data[0].id);
        toast({
          title: "New Flow Created",
          description: "You're now working on a new flow",
        });
      }
    } catch (error) {
      console.error('Error creating new flow:', error);
      toast({
        title: "Error Creating Flow",
        description: error instanceof Error ? error.message : "Failed to create a new flow",
        variant: "destructive",
      });
    }
  };

  // Load a flow from the database
  const handleSelectFlow = async (flowId: string) => {
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCurrentFlowId(data.id);
        setNodes(data.nodes);
        setEdges(data.edges);
        
        toast({
          title: "Flow Loaded",
          description: `"${data.name}" has been loaded`,
        });
        
        // Close the flow selector after loading
        setShowFlowSelector(false);
      }
    } catch (error) {
      console.error('Error loading flow:', error);
      toast({
        title: "Error Loading Flow",
        description: error instanceof Error ? error.message : "Failed to load the selected flow",
        variant: "destructive",
      });
    }
  };

  // Save the current flow to the database
  const handleSaveFlow = async () => {
    if (!currentFlowId) {
      toast({
        title: "No Flow Selected",
        description: "Please create a new flow or select an existing one",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('flows')
        .update({ 
          nodes: nodes,
          edges: edges,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentFlowId);
      
      if (error) throw error;
      
      toast({
        title: "Flow Saved",
        description: "Your flow has been saved successfully",
      });
    } catch (error) {
      console.error('Error saving flow:', error);
      toast({
        title: "Error Saving Flow",
        description: error instanceof Error ? error.message : "Failed to save the flow",
        variant: "destructive",
      });
    }
  };

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode;
      if (type === 'text') {
        newNode = createTextNode(position);
      } else if (type === 'processor') {
        newNode = createProcessorNode(position);
      }

      if (newNode) {
        setNodes((nds) => nds.concat(newNode));
      }
    },
    [reactFlowInstance, setNodes]
  );

  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  const onConnect = useCallback(
    (params: Connection) => {
      const sourceNode = nodes.find(node => node.id === params.source);
      const targetNode = nodes.find(node => node.id === params.target);
      
      if (!sourceNode || !targetNode) return;
      
      const isValidConnection = 
        (sourceNode.type === 'text' && targetNode.type === 'processor') ||
        (sourceNode.type === 'processor' && targetNode.type === 'text');
      
      if (!isValidConnection) {
        toast({
          title: "Invalid Connection",
          description: "Text nodes can only connect to processors, and processors can only connect to text nodes.",
          variant: "destructive",
        });
        return;
      }
      
      setEdges((eds) => addEdge({...params, type: 'default'}, eds));
    },
    [nodes, setEdges]
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, data: any) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return { ...node, data: { ...node.data, ...data } };
          }
          return node;
        })
      );
      
      toast({
        title: "Changes Saved",
        description: "Your node changes have been applied.",
      });
    },
    [setNodes]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));
      setSelectedNode(null);
      
      toast({
        title: "Node Deleted",
        description: "The node and its connections have been removed.",
      });
    },
    [setNodes, setEdges]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      setSelectedEdge(null);
      
      toast({
        title: "Connection Deleted",
        description: "The connection has been removed.",
      });
    },
    [setEdges]
  );

  const handleExecuteProcessor = useCallback(
    async (processorId: string) => {
      try {
        toast({
          title: "Processor Running",
          description: "Processing your data...",
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const updatedNodes = await executeProcessor(nodes, edges, processorId);
        
        setNodes(updatedNodes);
        
        toast({
          title: "Processing Complete",
          description: "Your data has been successfully processed.",
        });
      } catch (error) {
        console.error('Error executing processor:', error);
        
        toast({
          title: "Processing Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      }
    },
    [nodes, edges, setNodes]
  );

  // Check for a flow ID in the URL when the component mounts
  useEffect(() => {
    const checkForFlowInUrl = async () => {
      const url = new URL(window.location.href);
      const flowId = url.searchParams.get('flowId');
      
      if (flowId) {
        handleSelectFlow(flowId);
      }
    };
    
    checkForFlowInUrl();
  }, []);

  // Add flow ID to URL when a flow is selected
  useEffect(() => {
    if (currentFlowId) {
      const url = new URL(window.location.href);
      url.searchParams.set('flowId', currentFlowId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentFlowId]);

  // Toggle flow selector panel
  const toggleFlowSelector = () => {
    setShowFlowSelector(prev => !prev);
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <header className="h-14 p-4 flex items-center justify-between border-b glass-panel">
        <h1 className="text-xl font-medium text-gray-800">Flowsmith</h1>
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleFlowSelector}
          >
            {showFlowSelector ? 'Hide Flows' : 'My Flows'}
          </Button>
        </div>
      </header>
      
      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        <div className="w-full h-full" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineType={ConnectionLineType.Bezier}
            defaultEdgeOptions={{ animated: true }}
            fitView
            className="bg-gray-50"
          >
            <Background variant="dots" gap={12} size={1} color="#cbd5e1" />
            <Controls className="m-2" />
            <MiniMap
              className="m-2"
              nodeColor={(node) => {
                switch (node.type) {
                  case 'text':
                    return '#bfdbfe';
                  case 'processor':
                    return '#ddd6fe';
                  default:
                    return '#e2e8f0';
                }
              }}
            />
            
            <Panel position="top-left" className="m-4">
              <NodePanel onDragStart={onDragStart} />
            </Panel>
            
            {showFlowSelector && (
              <Panel position="top-center" className="m-4">
                <FlowSelector
                  currentFlowId={currentFlowId}
                  onNewFlow={handleNewFlow}
                  onSelectFlow={handleSelectFlow}
                  onSaveFlow={handleSaveFlow}
                />
              </Panel>
            )}
            
            <Panel position="top-right" className="m-4">
              <ConfigPanel
                selectedNode={selectedNode}
                selectedEdge={selectedEdge}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
                onDeleteEdge={handleDeleteEdge}
                onExecuteProcessor={handleExecuteProcessor}
              />
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

const IndexPage = () => (
  <ReactFlowProvider>
    <Flowsmith />
  </ReactFlowProvider>
);

export default IndexPage;
