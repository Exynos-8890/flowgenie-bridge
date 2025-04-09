
import { useState, useCallback } from 'react';
import { Node, Edge, Connection, addEdge } from '@xyflow/react';
import { toast } from '@/components/ui/use-toast';
// Removed the incorrect imports from @/lib/nodes

export function useFlowInteractions(
  nodes: Node[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  onFlowChange: () => void
) {
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

  const onPaneClick = useCallback(() => {
    // 只触发流程变更相关的操作，不再清除选中状态
    // 因为选中状态现在由Flowsmith组件管理
  }, []);

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowInstance) return;

      const type = event.dataTransfer.getData('application/reactflow');
      if (!type) return;

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let newNode;
      if (type === 'text') {
        newNode = {
          id: `${type}_${Date.now()}`,
          type,
          position,
          data: { label: 'New Text Node', content: '' },
        };
      } else if (type === 'processor') {
        newNode = {
          id: `${type}_${Date.now()}`,
          type,
          position,
          data: { type: 'summary', prompt: 'Process this text:\n\n{{input}}' },
        };
      }

      if (newNode) {
        setNodes((nds) => nds.concat(newNode));
        // Trigger auto-save after node creation
        setTimeout(() => onFlowChange(), 100);
      }
    },
    [reactFlowInstance, setNodes, onFlowChange]
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
      // Trigger auto-save after edge creation
      setTimeout(() => onFlowChange(), 100);
    },
    [nodes, setEdges, onFlowChange]
  );

  const onEdgeClick = useCallback(
    (event: React.MouseEvent, edge: Edge) => {
      // Implement edge selection logic
      return edge;
    },
    []
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
      
      // Trigger auto-save after node update
      setTimeout(() => onFlowChange(), 100);
      
      toast({
        title: "Changes Saved",
        description: "Your node changes have been applied.",
      });
    },
    [setNodes, onFlowChange]
  );

  const handleDeleteNode = useCallback(
    (nodeId: string) => {
      setNodes((nds) => nds.filter((node) => node.id !== nodeId));
      setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId));

      // 立即触发保存到数据库
      onFlowChange();

      toast({
        title: "Node Deleted",
        description: "The node and its connections have been removed.",
      });
    },
    [setNodes, setEdges, onFlowChange]
  );

  const handleDeleteEdge = useCallback(
    (edgeId: string) => {
      setEdges((eds) => eds.filter((edge) => edge.id !== edgeId));
      
      // Trigger auto-save after edge deletion
      setTimeout(() => onFlowChange(), 100);
      
      toast({
        title: "Connection Deleted",
        description: "The connection has been removed.",
      });
    },
    [setEdges, onFlowChange]
  );

  return {
    reactFlowInstance,
    setReactFlowInstance,
    onPaneClick,
    onDragOver,
    onDrop,
    onDragStart,
    onConnect,
    onEdgeClick,
    handleUpdateNode,
    handleDeleteNode,
    handleDeleteEdge
  };
}
