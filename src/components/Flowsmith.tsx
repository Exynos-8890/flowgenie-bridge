
import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  ConnectionLineType,
  Panel,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

import NodePanel from '@/components/NodePanel';
import ConfigPanel from '@/components/ConfigPanel';
import FlowSelector from '@/components/FlowSelector';
import TextNode from '@/components/TextNode';
import ProcessorNode from '@/components/ProcessorNode';
import CustomEdge from '@/components/CustomEdge';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFlowActions } from '@/hooks/use-flow-actions';
import { useFlowInteractions } from '@/hooks/use-flow-interactions';

// Import shadcn components
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';
import { User } from 'lucide-react';

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
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;
  
  const isMobile = useIsMobile();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [currentFlowId, setCurrentFlowId] = useState<string | null>(null);
  const [showFlowSelector, setShowFlowSelector] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);

  const {
    handleNewFlow,
    handleSelectFlow,
    handleSaveFlow,
    handleAutoSaveFlow,
    handleExecuteProcessor
  } = useFlowActions(
    nodes,
    edges,
    setNodes,
    setEdges,
    userId,
    currentFlowId,
    setCurrentFlowId
  );

  const {
    reactFlowInstance,
    setReactFlowInstance,
    onEdgeClick,
    onPaneClick,
    onDragOver,
    onDragStart,
    onConnect,
    handleUpdateNode,
    handleDeleteNode,
    handleDeleteEdge
  } = useFlowInteractions(
    nodes, 
    setNodes, 
    setEdges,
    handleAutoSaveFlow // Pass auto-save function to the interactions hook
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNodeId = `${type}_${Date.now()}`;
      const newNode = {
        id: newNodeId,
        type,
        position,
        data: type === 'text' 
          ? { label: 'New Text Node', content: '' } 
          : { type: 'summary', prompt: 'Process this text:\n\n{{input}}' },
      };

      setNodes((nds) => [...nds, newNode]);
      setSelectedNode(newNode); // 自动选中新节点
      setTimeout(() => handleAutoSaveFlow(), 100); // 自动保存
    },
    [reactFlowInstance, setNodes, handleAutoSaveFlow]
  );

  const onNodeClick = useCallback(
    (event: React.MouseEvent, node: Node) => {
      setSelectedNode(node);
      setSelectedEdge(null); // 取消边的选择
    },
    [setSelectedNode, setSelectedEdge]
  );

  const handlePaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    onPaneClick(); // 调用原来的onPaneClick处理其他逻辑
  }, [onPaneClick]);

  // Custom flow selection handler that also closes the flow selector
  const handleFlowSelection = useCallback((flowId: string) => {
    handleSelectFlow(flowId);
    setShowFlowSelector(false); // Close the flow selector after selection
  }, [handleSelectFlow]);

  // Trigger auto-save when nodes or edges change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleAutoSaveFlow();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, [nodes, edges, handleAutoSaveFlow]);

  useEffect(() => {
    const fetchUserFlows = async () => {
      if (!userId) return;
      
      try {
        const { data, error } = await supabase.functions.invoke('get-user-flows', {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        });
        
        if (error) throw error;
        
        const flows = data?.flows || [];
        
        if (flows.length > 0) {
          handleSelectFlow(flows[0].id);
        } else {
          handleNewFlow();
        }
      } catch (error) {
        console.error('Error fetching user flows:', error);
        // If we can't fetch flows, create a new one
        handleNewFlow();
      }
    };
    
    fetchUserFlows();
  }, [userId, session, handleSelectFlow, handleNewFlow]);

  useEffect(() => {
    const checkForFlowInUrl = async () => {
      if (!userId) return;
      
      const url = new URL(window.location.href);
      const flowId = url.searchParams.get('flowId');
      
      if (flowId) {
        try {
          // First, verify the user has access to this flow
          const { data, error } = await supabase
            .from('flows')
            .select('id')
            .eq('id', flowId)
            .eq('user_id', userId)
            .maybeSingle();
            
          if (error || !data) {
            console.error('Error or no access to this flow:', error || 'No access');
            toast({
              title: "Access Denied",
              description: "You don't have permission to access this flow",
              variant: "destructive",
            });
            return;
          }
          
          handleSelectFlow(flowId);
        } catch (error) {
          console.error('Error checking flow access:', error);
        }
      }
    };
    
    checkForFlowInUrl();
  }, [userId, handleSelectFlow]);

  useEffect(() => {
    if (currentFlowId && userId) {
      const url = new URL(window.location.href);
      url.searchParams.set('flowId', currentFlowId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentFlowId, userId]);

  const toggleFlowSelector = () => {
    setShowFlowSelector(prev => !prev);
  };

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden">
      <header className="h-14 p-4 flex items-center justify-between border-b glass-panel">
        <h1 className="text-xl font-medium text-gray-800">Flowsmith</h1>
        
        {/* 新增: 显示当前用户邮箱 */}
        <div className="flex-grow flex justify-end mr-4">
          {session?.user?.email && (
            <span className="text-sm text-gray-600 flex items-center">
              <User className="h-4 w-4 mr-1.5" />
              {session.user.email}
            </span>
          )}
        </div>
        
        <div className="flex space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={toggleFlowSelector}
          >
            {showFlowSelector ? 'Hide Flows' : 'My Flows'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
          >
            log out
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
            onPaneClick={handlePaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            connectionLineType={ConnectionLineType.Bezier}
            defaultEdgeOptions={{ animated: true }}
            fitView
            fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
            className="bg-gray-50"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} color="#cbd5e1" />
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
                  onNewFlow={() => {
                    handleNewFlow();
                    setShowFlowSelector(false); // Close after creating a new flow
                  }}
                  onSelectFlow={handleFlowSelection}
                  onSaveFlow={handleSaveFlow}
                />
              </Panel>
            )}
            
            <Panel position="top-right" className="m-4">
              {(selectedNode || selectedEdge) && (
                <ConfigPanel
                  selectedNode={selectedNode}
                  selectedEdge={selectedEdge}
                  onUpdateNode={handleUpdateNode}
                  onDeleteNode={handleDeleteNode}
                  onDeleteEdge={handleDeleteEdge}
                  onExecuteProcessor={handleExecuteProcessor}
                />
              )}
            </Panel>
          </ReactFlow>
        </div>
      </div>
    </div>
  );
};

export default Flowsmith;
