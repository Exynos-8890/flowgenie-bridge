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

// Execute a processor (using LLM - Silicon Flow or Gemini)
export const executeProcessor = async (
  nodes: Node[],
  edges: Edge[],
  processorId: string
): Promise<{ nodes: Node[], newEdge?: Edge }> => {
  // Find the processor node
  const processorNode = nodes.find(node => node.id === processorId);
  if (!processorNode || processorNode.type !== 'processor') {
    throw new Error('Invalid processor node');
  }

  // Find all input nodes (connected to processor's left side)
  const inputEdges = edges.filter(edge => edge.target === processorId);
  if (inputEdges.length === 0) {
    throw new Error('Processor has no input nodes');
  }

  // Collect all input content from connected text nodes
  const inputContents: Array<{ nodeId: string, label: string, content: string }> = [];
  
  for (const edge of inputEdges) {
    const inputNodeId = edge.source;
    const inputNode = nodes.find(node => node.id === inputNodeId);
    
    if (!inputNode) {
      console.warn(`Input node ${inputNodeId} not found`);
      continue;
    }
    
    inputContents.push({
      nodeId: inputNode.id,
      label: inputNode.data.label || 'Untitled Node',
      content: inputNode.data.content || '',
    });
  }
  
  // Construct the combined input content
  let combinedContent = '';
  
  // Add each input node's content with its label as identifier
  inputContents.forEach(input => {
    combinedContent += `\n===== ${input.label} =====\n${input.content}\n`;
  });
  
  // Find or create the output node (connected to processor's right side)
  let outputEdge = edges.find(edge => edge.source === processorId);
  let outputNode = null;
  let newEdge = undefined;
  
  // If no output node exists, create one
  if (!outputEdge) {
    // Create a new output node
    const newPosition = {
      x: processorNode.position.x + 250,
      y: processorNode.position.y,
    };
    
    const newNode = createTextNode(newPosition, {
      label: `Output: ${processorNode.data.type}`,
      content: '',
    });
    
    // Add the new node
    nodes = [...nodes, newNode];
    
    // Create a new edge
    newEdge = {
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

  const prompt = `${processorNode.data.prompt}\n\n${combinedContent}`;
  console.log('Processing with LLM:', { prompt});
  
  try {
    // 首先从数据库获取当前应该使用的模型
    const { data: configData, error: configError } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'llm_model')
      .single();

    if (configError) {
      console.warn('无法获取模型配置，使用默认模型 siliconflow:', configError);
    }

    // 确定使用哪个模型 (siliconflow 或 gemini)
    const modelToUse = configData?.value || 'siliconflow';
    console.log(`Using LLM model: ${modelToUse}`);
    console.log('config:', configData?.value);

    // 根据选择的模型调用不同的 Edge Function
    let functionName = 'process-with-gpt'; // 默认使用 Silicon Flow
    if (modelToUse === 'gemini') {
      functionName = 'process-with-gemini'; // 使用 Gemini
    }

    // 调用选定的 Edge Function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: {
        content: prompt,
      }
    });

    if (error) {
      throw error;
    }

    // Fixed TypeScript errors: Properly handle result types
    const result = data.result as string || "Error: No result returned";

    // Update the output node with the generated content
    const updatedNodes = nodes.map(node => {
      if (node.id === outputNode?.id) {
        return {
          ...node,
          data: {
            ...node.data,
            content: result,
          },
        };
      }
      return node;
    });

    return { 
      nodes: updatedNodes,
      newEdge 
    };
  } catch (error) {
    console.error(`Error calling LLM processor:`, error);
    throw new Error(`Failed to process: ${error.message || 'Unknown error'}`);
  }
};
