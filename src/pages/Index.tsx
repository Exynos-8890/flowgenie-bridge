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
  BackgroundVariant,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import NodePanel from '@/components/NodePanel';
import ConfigPanel from '@/components/ConfigPanel';
import TextNode from '@/components/TextNode';
import ProcessorNode from '@/components/ProcessorNode';
import CustomEdge from '@/components/CustomEdge';
import FlowSelector from '@/components/FlowSelector';
import { createTextNode, createProcessorNode, executeProcessor, saveFlow, loadFlow } from '@/lib/nodes';
import { useIsMobile } from '@/hooks/use-mobile';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';

// Define node types with proper typing
const nodeTypes: NodeTypes = {
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
  const [showFlowSelector, setShowFlowSelector] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const handleLoadFlow = useCallback(async (flowId: string) => {
    try {
      const flowData = await loadFlow(flowId);
      setNodes(flowData.nodes);
      setEdges(flowData.edges);
      setCurrentFlowId(flowId);
      setShowFlowSelector(false);
      
      toast({
        title: '加载成功',
        description: '流程已加载',
      });
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载流程，请稍后再试',
        variant: 'destructive',
      });
    }
  }, [setNodes, setEdges]);

  const handleSaveFlow = useCallback(async () => {
    if (!currentFlowId) {
      toast({
        title: '无法保存',
        description: '请先选择或创建一个流程',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsSaving(true);
      await saveFlow(currentFlowId, nodes, edges);
      
      toast({
        title: '保存成功',
        description: '流程已保存',
      });
    } catch (error) {
      toast({
        title: '保存失败',
        description: '无法保存流程，请稍后再试',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  }, [currentFlowId, nodes, edges]);

  const handleNewFlow = useCallback(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    setShowFlowSelector(false);
  }, [setNodes, setEdges]);

  const handleBackToFlows = useCallback(() => {
    setShowFlowSelector(true);
  }, []);

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
          title: "无效连接",
          description: "文本节点只能连接到处理器，处理器只能连接到文本节点。",
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
        title: "已保存",
        description: "节点已更新",
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
        title: "已删除",
        description: "节点及其连接已移除",
      });
    },
    [setNodes, setEdges]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      setSelectedEdge(null);
      
      toast({
        title: "已删除",
        description: "连接已移除",
      });
    },
    [setEdges]
  );

  const handleExecuteProcessor = useCallback(
    async (processorId: string) => {
      try {
        toast({
          title: "处理中",
          description: "正在处理数据...",
        });
        
        const updatedNodes = await executeProcessor(nodes, edges, processorId);
        
        setNodes(updatedNodes);
        
        toast({
          title: "处理完成",
          description: "数据已成功处理",
        });
      } catch (error) {
        console.error('执行处理器失败:', error);
        
        toast({
          title: "处理失败",
          description: error instanceof Error ? error.message : "发生未知错误",
          variant: "destructive",
        });
      }
    },
    [nodes, edges, setNodes]
  );

  useEffect(() => {
    if (currentFlowId && nodes.length > 0) {
      const timer = setTimeout(() => {
        handleSaveFlow();
      }, 30000); // 30秒自动保存
      
      return () => clearTimeout(timer);
    }
  }, [currentFlowId, nodes, edges, handleSaveFlow]);

  if (showFlowSelector) {
    return (
      <div className="w-full h-screen flex flex-col overflow-hidden">
        <header className="h-14 p-4 flex items-center justify-center border-b glass-panel">
          <h1 className="text-xl font-medium text-gray-800">Flowsmith</h1>
        </header>
        
        <div className="flex-1 p-8 overflow-auto">
          <FlowSelector 
            onSelect={handleLoadFlow}
            onNewFlow={handleNewFlow}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <header className="h-14 p-4 flex items-center justify-between border-b glass-panel">
        <Button variant="ghost" onClick={handleBackToFlows}>
          返回流程列表
        </Button>
        <h1 className="text-xl font-medium text-gray-800">Flowsmith</h1>
        <Button 
          onClick={handleSaveFlow}
          disabled={isSaving}
        >
          {isSaving ? '保存中...' : '保存流程'}
        </Button>
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
            <Background 
              variant={BackgroundVariant.Dots} 
              gap={12} 
              size={1} 
              color="#cbd5e1" 
            />
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

