
import { Node, Edge } from '@xyflow/react';

// API URL
const API_URL = 'http://localhost:3001/api';

// 类型定义
export interface Flow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface FlowWithGraph extends Flow {
  nodes: Node[];
  edges: Edge[];
}

// API 客户端
export const api = {
  // 流程相关
  flows: {
    // 获取所有流程
    getAll: async (): Promise<Flow[]> => {
      const response = await fetch(`${API_URL}/flows`);
      if (!response.ok) throw new Error('获取流程失败');
      return response.json();
    },
    
    // 获取单个流程（包含节点和连接）
    get: async (id: string): Promise<FlowWithGraph> => {
      const response = await fetch(`${API_URL}/flows/${id}`);
      if (!response.ok) throw new Error('获取流程详情失败');
      return response.json();
    },
    
    // 创建新流程
    create: async (data: { name: string; description?: string }): Promise<Flow> => {
      const response = await fetch(`${API_URL}/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('创建流程失败');
      return response.json();
    },
    
    // 更新流程
    update: async (id: string, data: { name?: string; description?: string }): Promise<Flow> => {
      const response = await fetch(`${API_URL}/flows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error('更新流程失败');
      return response.json();
    },
    
    // 删除流程
    delete: async (id: string): Promise<void> => {
      const response = await fetch(`${API_URL}/flows/${id}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('删除流程失败');
    },
    
    // 保存整个流程图
    saveGraph: async (id: string, { nodes, edges }: { nodes: Node[]; edges: Edge[] }): Promise<{ message: string }> => {
      const response = await fetch(`${API_URL}/flows/${id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
      if (!response.ok) throw new Error('保存流程图失败');
      return response.json();
    }
  },
  
  // 处理器相关
  processors: {
    // 执行处理器
    execute: async (
      processorId: string, 
      inputNodes: string[], 
      outputNodeId: string
    ): Promise<{ success: boolean; result: string; outputNodeId: string }> => {
      const response = await fetch(`${API_URL}/processors/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ processorId, inputNodes, outputNodeId })
      });
      if (!response.ok) throw new Error('执行处理器失败');
      return response.json();
    }
  }
};

// 辅助函数：查找连接到处理器的输入节点
export const findInputNodes = (nodes: Node[], edges: Edge[], processorId: string): string[] => {
  return edges
    .filter(edge => edge.target === processorId)
    .map(edge => edge.source);
};

// 辅助函数：查找连接到处理器的输出节点
export const findOutputNode = (nodes: Node[], edges: Edge[], processorId: string): string | null => {
  const outputEdge = edges.find(edge => edge.source === processorId);
  return outputEdge ? outputEdge.target : null;
};
