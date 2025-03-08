
import { Node, Edge, XYPosition, Connection } from '@xyflow/react';
import { api, findInputNodes, findOutputNode } from './api';

// Generate a unique ID
export const generateId = (): string => {
  return Math.random().toString(36).substring(2, 9);
};

// Create a new text node
export const createTextNode = (position: XYPosition, data: any = {}): Node => {
  return {
    id: generateId(),
    type: 'text',
    position,
    data: {
      label: data.label || 'New Text Node',
      content: data.content || '',
      ...data,
    },
  };
};

// Create a new processor node
export const createProcessorNode = (position: XYPosition, data: any = {}): Node => {
  return {
    id: generateId(),
    type: 'processor',
    position,
    data: {
      type: data.type || 'summary',
      prompt: data.prompt || '',
      ...data,
    },
  };
};

// Create a new edge connection
export const createEdge = (connection: Connection): Edge => {
  return {
    id: `e-${connection.source}-${connection.target}`,
    source: connection.source || '',
    target: connection.target || '',
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
  };
};

// Execute a processor using the backend API
export const executeProcessor = async (
  nodes: Node[],
  edges: Edge[],
  processorId: string
): Promise<Node[]> => {
  try {
    // Find the processor node
    const processorNode = nodes.find(node => node.id === processorId);
    if (!processorNode || processorNode.type !== 'processor') {
      throw new Error('无效的处理器节点');
    }

    // Find the input node IDs (connected to processor's left side)
    const inputNodeIds = findInputNodes(nodes, edges, processorId);
    if (inputNodeIds.length === 0) {
      throw new Error('处理器没有输入节点');
    }

    // Find or create the output node
    let outputNodeId = findOutputNode(nodes, edges, processorId);
    let outputNode = null;
    
    // If no output node exists, create one
    if (!outputNodeId) {
      // Create a new output node
      const newPosition = {
        x: processorNode.position.x + 200,
        y: processorNode.position.y,
      };
      
      const newNode = createTextNode(newPosition, {
        label: `Output: ${processorNode.data.type}`,
        content: '',
      });
      
      // Add the new node to our local array
      nodes = [...nodes, newNode];
      
      // Create a new edge (this would be done separately by the calling function)
      outputNodeId = newNode.id;
      outputNode = newNode;
    } else {
      outputNode = nodes.find(node => node.id === outputNodeId);
    }

    if (!outputNode) {
      throw new Error('无法找到或创建输出节点');
    }

    // Call the backend API to execute the processor
    const result = await api.processors.execute(
      processorId,
      inputNodeIds,
      outputNodeId
    );

    // Update the output node with the result
    return nodes.map(node => {
      if (node.id === outputNodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            content: result.result,
          },
        };
      }
      return node;
    });
  } catch (error) {
    console.error('执行处理器失败:', error);
    throw error;
  }
};

// Save the entire flow to the backend
export const saveFlow = async (
  flowId: string,
  nodes: Node[],
  edges: Edge[]
): Promise<void> => {
  try {
    await api.flows.saveGraph(flowId, { nodes, edges });
  } catch (error) {
    console.error('保存流程失败:', error);
    throw error;
  }
};

// Load a flow from the backend
export const loadFlow = async (
  flowId: string
): Promise<{ nodes: Node[]; edges: Edge[] }> => {
  try {
    const flow = await api.flows.get(flowId);
    return {
      nodes: flow.nodes,
      edges: flow.edges
    };
  } catch (error) {
    console.error('加载流程失败:', error);
    throw error;
  }
};
