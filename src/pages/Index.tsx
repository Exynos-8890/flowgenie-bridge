
import React, { useState, useCallback, useRef } from 'react';
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

import NodePanel from '@/components/NodePanel';
import ConfigPanel from '@/components/ConfigPanel';
import TextNode from '@/components/TextNode';
import ProcessorNode from '@/components/ProcessorNode';
import CustomEdge from '@/components/CustomEdge';
import { createTextNode, createProcessorNode, executeProcessor } from '@/lib/nodes';
import { useIsMobile } from '@/hooks/use-mobile';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

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

  // Handle node selection
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null);
  }, []);

  // Handle edge selection
  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge);
    setSelectedNode(null);
  }, []);

  // Handle click on empty canvas
  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  // Handle drag over for node creation
  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for node creation
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      // Get the position where the node was dropped
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

  // Handle node dragging start
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Handle connection creation
  const onConnect = useCallback(
    (params: Connection) => {
      // Only allow connections:
      // 1. From text nodes to processor nodes
      // 2. From processor nodes to text nodes
      const sourceNode = nodes.find(node => node.id === params.source);
      const targetNode = nodes.find(node => node.id === params.target);
      
      if (!sourceNode || !targetNode) return;
      
      // Check valid connections
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

  // Update node data
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

  // Delete node
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

  // Delete edge
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

  // Execute processor
  const handleExecuteProcessor = useCallback(
    async (processorId: string) => {
      try {
        // Show processing toast
        toast({
          title: "Processor Running",
          description: "Processing your data...",
        });
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Execute the processor
        const updatedNodes = await executeProcessor(nodes, edges, processorId);
        
        // Update nodes
        setNodes(updatedNodes);
        
        // Show success toast
        toast({
          title: "Processing Complete",
          description: "Your data has been successfully processed.",
        });
      } catch (error) {
        console.error('Error executing processor:', error);
        
        // Show error toast
        toast({
          title: "Processing Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
      }
    },
    [nodes, edges, setNodes]
  );

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      {/* Top header */}
      <header className="h-14 p-4 flex items-center justify-center border-b glass-panel">
        <h1 className="text-xl font-medium text-gray-800">Flowsmith</h1>
      </header>
      
      {/* Main content */}
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
            <Background color="#cbd5e1" size={1.5} />
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
            
            {/* Left panel for node types */}
            <Panel position="top-left" className="m-4">
              <NodePanel onDragStart={onDragStart} />
            </Panel>
            
            {/* Right panel for node configuration */}
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
