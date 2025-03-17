
import { Node, Edge, XYPosition, Connection } from '@xyflow/react';
import { supabase } from '@/integrations/supabase/client';

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
      prompt: data.prompt || 'Summarize the following text:\n\n{{input}}',
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

// Execute a processor (using OpenAI)
export const executeProcessor = async (
  nodes: Node[],
  edges: Edge[],
  processorId: string
): Promise<Node[]> => {
  // Find the processor node
  const processorNode = nodes.find(node => node.id === processorId);
  if (!processorNode || processorNode.type !== 'processor') {
    throw new Error('Invalid processor node');
  }

  // Find the input node (connected to processor's left side)
  const inputEdge = edges.find(edge => edge.target === processorId);
  if (!inputEdge) {
    throw new Error('Processor has no input node');
  }

  const inputNodeId = inputEdge.source;
  const inputNode = nodes.find(node => node.id === inputNodeId);
  if (!inputNode) {
    throw new Error('Input node not found');
  }

  // Get input content
  const inputContent = inputNode.data.content || '';
  
  // Find the output node (connected to processor's right side)
  let outputEdge = edges.find(edge => edge.source === processorId);
  let outputNode = null;
  
  // If no output node exists, create one
  if (!outputEdge) {
    // Create a new output node
    const newPosition = {
      x: processorNode.position.x + 200,
      y: processorNode.position.y,
    };
    
    const newNode = createTextNode(newPosition, {
      label: `Output: ${processorNode.data.type}`,
      content: '',
    });
    
    // Add the new node
    nodes = [...nodes, newNode];
    
    // Create a new edge
    const newEdge = {
      id: `e-${processorId}-${newNode.id}`,
      source: processorId,
      target: newNode.id,
    };
    
    // We're returning nodes, but edges will need to be updated separately
    outputNode = newNode;
  } else {
    outputNode = nodes.find(node => node.id === outputEdge?.target);
  }

  if (!outputNode) {
    throw new Error('Output node not found and could not be created');
  }
    //   在 console.log 中输出 inputContent
    console.log(inputContent)

  try {
    // Call the process-with-gpt edge function
    const { data, error } = await supabase.functions.invoke('process-with-gpt', {
      body: {
        content: inputContent,
        promptTemplate: processorNode.data.prompt || 'Process this: {{input}}'
      }
    });

    if (error) {
      throw error;
    }

    // Update the output node with the generated content
    return nodes.map(node => {
      if (node.id === outputNode?.id) {
        return {
          ...node,
          data: {
            ...node.data,
            content: data.result || "Error: No result returned",
          },
        };
      }
      return node;
    });
  } catch (error) {
    console.error('Error calling process-with-gpt:', error);
    throw new Error(`Failed to process: ${error.message || 'Unknown error'}`);
  }
};
