import { useState, useCallback, useEffect } from 'react';
import { Node, Edge } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { executeProcessor } from '@/lib/nodes';

export function useFlowActions(
  nodes: Node[],
  edges: Edge[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  userId: string | undefined,
  currentFlowId: string | null,
  setCurrentFlowId: React.Dispatch<React.SetStateAction<string | null>>
) {
  const [lastSavedState, setLastSavedState] = useState<{ nodes: Node[], edges: Edge[] } | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // Check if state has changed since last save
  const hasStateChanged = useCallback(() => {
    if (!lastSavedState) return true;
    
    const nodesString = JSON.stringify(nodes);
    const edgesString = JSON.stringify(edges);
    const lastNodesString = JSON.stringify(lastSavedState.nodes);
    const lastEdgesString = JSON.stringify(lastSavedState.edges);
    
    return nodesString !== lastNodesString || edgesString !== lastEdgesString;
  }, [nodes, edges, lastSavedState]);

  const handleNewFlow = useCallback(async () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to create a new flow",
        variant: "destructive",
      });
      return;
    }
    
    try {
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
      
      setNodes(initialNodes);
      setEdges(initialEdges);
      
      const { data, error } = await supabase
        .from('flows')
        .insert({
          nodes: JSON.stringify(initialNodes),
          edges: JSON.stringify(initialEdges),
          user_id: userId,
          name: "New Flow"
        })
        .select();
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        setCurrentFlowId(data[0].id);
        setLastSavedState({ nodes: initialNodes, edges: initialEdges });
        
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
  }, [userId, setNodes, setEdges, setCurrentFlowId]);

  const handleSelectFlow = useCallback(async (flowId: string) => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to select a flow",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Verify that the user has access to this flow
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .eq('user_id', userId)  
        .single();
      
      if (error) {
        // If we get an error, it likely means the user doesn't have access to this flow
        console.error('Error loading flow:', error);
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this flow",
          variant: "destructive",
        });
        return;
      }
      
      if (data) {
        setCurrentFlowId(data.id);
        
        try {
          const parsedNodes = JSON.parse(data.nodes as string);
          const parsedEdges = JSON.parse(data.edges as string);
          
          setNodes(parsedNodes);
          setEdges(parsedEdges);
          setLastSavedState({ nodes: parsedNodes, edges: parsedEdges });
          
          toast({
            title: "Flow Loaded",
            description: `"${data.name}" has been loaded`,
          });
        } catch (parseError) {
          console.error('Error parsing flow data:', parseError);
          toast({
            title: "Error Loading Flow",
            description: "Invalid flow data format",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      console.error('Error loading flow:', error);
      toast({
        title: "Error Loading Flow",
        description: error instanceof Error ? error.message : "Failed to load the selected flow",
        variant: "destructive",
      });
    }
  }, [userId, setNodes, setEdges, setCurrentFlowId]);

  const handleSaveFlow = useCallback(async () => {
    if (!userId) {
      toast({
        title: "Authentication Required",
        description: "Please log in to save a flow",
        variant: "destructive",
      });
      return;
    }
    
    if (!currentFlowId) {
      toast({
        title: "No Flow Selected",
        description: "Please create a new flow or select an existing one",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // First verify that the user has access to this flow
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('user_id')
        .eq('id', currentFlowId)
        .single();
        
      if (flowError) {
        throw flowError;
      }
      
      if (flowData.user_id !== userId) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to modify this flow",
          variant: "destructive",
        });
        return;
      }
      
      setIsAutoSaving(true);
      const { error } = await supabase
        .from('flows')
        .update({ 
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
          updated_at: new Date().toISOString()
        })
        .eq('id', currentFlowId);
      
      if (error) throw error;
      
      setLastSavedState({ nodes, edges });
      
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
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentFlowId, nodes, edges, userId]);

  const handleAutoSaveFlow = useCallback(async () => {
    if (!userId || !currentFlowId || isAutoSaving) return;

    try {
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('user_id')
        .eq('id', currentFlowId)
        .maybeSingle();

      if (flowError) {
        console.error('Error checking flow ownership:', flowError);
        return;
      }

      if (!flowData || flowData.user_id !== userId) {
        console.error('User does not have permission to auto-save this flow');
        return;
      }

      setIsAutoSaving(true);
      const { error } = await supabase
        .from('flows')
        .update({
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentFlowId);

      if (error) throw error;

      setLastSavedState({ nodes, edges });
    } catch (error) {
      console.error('Error auto-saving flow:', error);
      toast({
        title: "Auto-Save Failed",
        description: error instanceof Error ? error.message : "Failed to save the flow",
        variant: "destructive",
      });
    } finally {
      setIsAutoSaving(false);
    }
  }, [currentFlowId, nodes, edges, userId, isAutoSaving]);

  const handleExecuteProcessor = useCallback(
    async (processorId: string) => {
      if (!userId || !currentFlowId) {
        toast({
          title: "Authentication Required",
          description: "Please log in to execute processors",
          variant: "destructive",
        });
        return;
      }
      
      try {
        // First verify that the user has access to this flow
        const { data: flowData, error: flowError } = await supabase
          .from('flows')
          .select('user_id')
          .eq('id', currentFlowId)
          .single();
          
        if (flowError) {
          throw flowError;
        }
        
        if (flowData.user_id !== userId) {
          toast({
            title: "Access Denied",
            description: "You don't have permission to execute processors in this flow",
            variant: "destructive",
          });
          return;
        }
        
        toast({
          title: "Processor Running",
          description: "Processing your data...",
        });
        
        // 保存当前节点状态的快照
        const currentNodes = [...nodes];
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await executeProcessor(currentNodes, edges, processorId);
        
        // 只更新处理器相关的节点，保留用户在处理过程中对其他节点的修改
        setNodes(prevNodes => {
          // 创建一个新的节点副本
          const updatedNodes = [...prevNodes];
          
          // 遍历结果中的节点
          result.nodes.forEach(resultNode => {
            // 找到当前节点列表中对应的节点索引
            const nodeIndex = updatedNodes.findIndex(n => n.id === resultNode.id);
            
            // 如果找到了，更新该节点
            if (nodeIndex !== -1) {
              updatedNodes[nodeIndex] = resultNode;
            } else {
              // 如果是新节点，添加到列表中
              updatedNodes.push(resultNode);
            }
          });
          
          return updatedNodes;
        });
        
        // If a new edge was created, add it to the edges
        if (result.newEdge) {
          setEdges(prevEdges => [...prevEdges, result.newEdge as Edge]);
        }
        
        // Auto-save after processing is complete
        setTimeout(() => handleAutoSaveFlow(), 500);
        
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
    [nodes, edges, setNodes, setEdges, handleAutoSaveFlow, userId, currentFlowId]
  );

  // 添加导出Flow功能
  const handleExportFlow = useCallback(async (flowName = "myflow") => {
    if (!currentFlowId) {
      toast({
        title: "No Flow Selected",
        description: "Please select a flow to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // 确保用户有权限访问该flow
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('*')
        .eq('id', currentFlowId)
        .eq('user_id', userId)
        .single();
        
      if (flowError) {
        throw flowError;
      }

      const flowExport = {
        id: flowData.id,
        name: flowData.name,
        nodes: JSON.parse(flowData.nodes),
        edges: JSON.parse(flowData.edges),
        created_at: flowData.created_at,
        updated_at: flowData.updated_at
      };

      // 创建一个Blob对象
      const blob = new Blob([JSON.stringify(flowExport, null, 2)], { type: 'application/json' });

      // 创建下载链接
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${flowData.name || flowName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Flow Exported",
        description: `"${flowData.name}" has been exported to your downloads`,
      });
    } catch (error) {
      console.error('Error exporting flow:', error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export the flow",
        variant: "destructive",
      });
    }
  }, [currentFlowId, userId]);

  // Set up auto-save interval (every 5 seconds)
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (hasStateChanged()) {
        handleAutoSaveFlow();
      }
    }, 5000);
    
    return () => clearInterval(intervalId);
  }, [handleAutoSaveFlow, hasStateChanged]);

  return {
    handleNewFlow,
    handleSelectFlow,
    handleSaveFlow,
    handleAutoSaveFlow,
    handleExecuteProcessor,
    handleExportFlow
  };
}
