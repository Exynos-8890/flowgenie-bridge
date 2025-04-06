
import { Node, Edge } from '@xyflow/react';
import { v4 as uuidv4 } from 'uuid';
import { processWithLLM } from './llm-utils';

// Define specific node types
export type TextNodeData = {
  label: string;
  content: string;
};

export type ProcessorNodeData = {
  type: 'summary' | 'analyze' | 'extract' | 'translate';
  prompt: string;
};

// Find all source nodes connected to a target node
export function findSourceNodes(nodes: Node[], edges: Edge[], targetNodeId: string): Node[] {
  const sourceNodeIds = edges
    .filter(edge => edge.target === targetNodeId)
    .map(edge => edge.source);
  
  return nodes.filter(node => sourceNodeIds.includes(node.id));
}

// Find all target nodes connected to a source node
export function findTargetNodes(nodes: Node[], edges: Edge[], sourceNodeId: string): Node[] {
  const targetNodeIds = edges
    .filter(edge => edge.source === sourceNodeId)
    .map(edge => edge.target);
  
  return nodes.filter(node => targetNodeIds.includes(node.id));
}

// Get content from a text node
export function getTextNodeContent(node: Node): string {
  if (node.type === 'text' && node.data && typeof node.data.content === 'string') {
    return node.data.content;
  }
  return '';
}

// Replace input placeholders in prompt template
export function replaceInputPlaceholder(prompt: string, input: string): string {
  return prompt.replace(/{{input}}/g, input);
}

// Execute a processor node
export async function executeProcessor(nodes: Node[], edges: Edge[], processorId: string) {
  // Find the processor node
  const processorNode = nodes.find(node => node.id === processorId);
  if (!processorNode || processorNode.type !== 'processor') {
    throw new Error('Invalid processor node');
  }
  
  // Get all source text nodes
  const sourceNodes = findSourceNodes(nodes, edges, processorId);
  if (sourceNodes.length === 0) {
    throw new Error('Processor has no input connections');
  }
  
  // Collect content from all source text nodes
  const inputContent = sourceNodes
    .map(node => getTextNodeContent(node))
    .join('\n\n');
  
  // Get processor settings
  const processorType = processorNode.data.type;
  const promptTemplate = processorNode.data.prompt;
  
  // Replace placeholders in the prompt
  const finalPrompt = replaceInputPlaceholder(promptTemplate, inputContent);
  
  try {
    // Process the text using the active LLM
    const result = await processWithLLM(finalPrompt);
    
    // Find if there's a target text node
    const targetNodes = findTargetNodes(nodes, edges, processorId);
    let targetNode = targetNodes.find(node => node.type === 'text');
    let newEdge = null;
    
    // If no target node exists, create one
    if (!targetNode) {
      // Create a new text node positioned below the processor
      const newNodeId = `text_${uuidv4()}`;
      targetNode = {
        id: newNodeId,
        type: 'text',
        position: {
          x: processorNode.position.x,
          y: processorNode.position.y + 200,
        },
        data: {
          label: `${processorType} Result`,
          content: result as string,
        },
      };
      
      // Create an edge connecting the processor to the new text node
      newEdge = {
        id: `edge_${uuidv4()}`,
        source: processorId,
        target: newNodeId,
        type: 'default',
      };
      
      // Add new node to the nodes array
      nodes = [...nodes, targetNode];
    } else {
      // Update existing target node
      targetNode = {
        ...targetNode,
        data: {
          ...targetNode.data,
          content: result as string,
        },
      };
      
      // Update the node in the nodes array
      nodes = nodes.map(node => 
        node.id === targetNode?.id ? targetNode : node
      );
    }
    
    return { nodes, newEdge };
  } catch (error) {
    console.error('Error executing processor:', error);
    throw error;
  }
}
