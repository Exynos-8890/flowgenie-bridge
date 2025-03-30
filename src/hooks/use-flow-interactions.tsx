import { useState, useCallback } from 'react';
import { Node, Edge, Connection, addEdge } from '@xyflow/react';
import { toast } from '@/components/ui/use-toast';
import { createTextNode, createProcessorNode } from '@/lib/nodes';

export function useFlowInteractions(
  nodes: Node[],
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>,
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>,
  onFlowChange: () => void
) {
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<Edge | null>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);

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

      if (!reactFlowInstance) return;

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
      setSelectedNode(null);

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
      setSelectedEdge(null);
      
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
  };
}
