
import { useState, useCallback } from 'react';
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
  const handleNewFlow = useCallback(async () => {
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
    try {
      const { data, error } = await supabase
        .from('flows')
        .select('*')
        .eq('id', flowId)
        .eq('user_id', userId)  
        .single();
      
      if (error) throw error;
      
      if (data) {
        setCurrentFlowId(data.id);
        
        try {
          const parsedNodes = JSON.parse(data.nodes as string);
          const parsedEdges = JSON.parse(data.edges as string);
          
          setNodes(parsedNodes);
          setEdges(parsedEdges);
          
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
          nodes: JSON.stringify(nodes),
          edges: JSON.stringify(edges),
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
  }, [currentFlowId, nodes, edges]);

  const handleExecuteProcessor = useCallback(
    async (processorId: string) => {
      try {
        toast({
          title: "Processor Running",
          description: "Processing your data...",
        });
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const result = await executeProcessor(nodes, edges, processorId);
        
        // Update nodes with the processed result
        setNodes(result.nodes);
        
        // If a new edge was created, add it to the edges
        if (result.newEdge) {
          setEdges(prevEdges => [...prevEdges, result.newEdge as Edge]);
        }
        
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
    [nodes, edges, setNodes, setEdges]
  );

  return {
    handleNewFlow,
    handleSelectFlow,
    handleSaveFlow,
    handleExecuteProcessor
  };
}
