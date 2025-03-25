
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
    selectedNode,
    selectedEdge,
    reactFlowInstance,
    setReactFlowInstance,
    onNodeClick,
    onEdgeClick,
    onPaneClick,
    onDragOver,
    onDrop,
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
        const { data, error } = await supabase
          .from('flows')
          .select('*')
          .eq('user_id', userId)  
          .order('updated_at', { ascending: false })
          .limit(1);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          handleSelectFlow(data[0].id);
        } else {
          handleNewFlow();
        }
      } catch (error) {
        console.error('Error fetching user flows:', error);
      }
    };
    
    fetchUserFlows();
  }, [userId, handleSelectFlow, handleNewFlow]);

  useEffect(() => {
    const checkForFlowInUrl = async () => {
      const url = new URL(window.location.href);
      const flowId = url.searchParams.get('flowId');
      
      if (flowId) {
        handleSelectFlow(flowId);
      }
    };
    
    checkForFlowInUrl();
  }, [userId, handleSelectFlow]);

  useEffect(() => {
    if (currentFlowId) {
      const url = new URL(window.location.href);
      url.searchParams.set('flowId', currentFlowId);
      window.history.replaceState({}, '', url.toString());
    }
  }, [currentFlowId]);

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
          <Button
            variant="outline"
            size="sm"
            onClick={signOut}
          >
            登出
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

export default Flowsmith;
