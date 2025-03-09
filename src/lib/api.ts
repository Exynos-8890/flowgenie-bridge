
import { Node, Edge } from '@xyflow/react';

// API URL - 修改为当前运行环境的API地址
// 使用相对路径，这样不管在本地开发还是部署环境都能正常工作
const API_URL = '/api';

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

// 模拟API响应的函数，当后端不可用时使用
const mockApiResponse = async (data: any, delay = 500) => {
  return new Promise((resolve) => {
    setTimeout(() => resolve(data), delay);
  });
};

// 带失败回退的API调用函数
const fetchWithFallback = async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`API错误: ${response.status}`);
    return response.json();
  } catch (error) {
    console.error('API调用失败，使用本地存储回退', error);
    
    // 从localStorage获取数据或使用默认值
    if (url.includes('/flows') && !url.includes('/save')) {
      const storedFlows = localStorage.getItem('flowsmith_flows');
      if (storedFlows) return JSON.parse(storedFlows);
      return [];
    }
    
    // 创建新flow时生成本地ID
    if (options?.method === 'POST' && url.includes('/flows') && !url.includes('/save')) {
      const newFlow = JSON.parse(options.body as string);
      const flowId = `local_${Date.now()}`;
      const flow = {
        id: flowId,
        name: newFlow.name || '未命名流程',
        description: newFlow.description || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // 保存到localStorage
      const storedFlows = localStorage.getItem('flowsmith_flows');
      const flows = storedFlows ? JSON.parse(storedFlows) : [];
      flows.push(flow);
      localStorage.setItem('flowsmith_flows', JSON.stringify(flows));
      
      return flow;
    }
    
    // 获取单个flow详情
    if (url.includes('/flows/') && !url.includes('/save')) {
      const flowId = url.split('/flows/')[1];
      const storedFlows = localStorage.getItem('flowsmith_flows');
      const flows = storedFlows ? JSON.parse(storedFlows) : [];
      const flow = flows.find((f: Flow) => f.id === flowId);
      
      if (flow) {
        // 获取节点和边
        const storedNodes = localStorage.getItem(`flowsmith_nodes_${flowId}`);
        const storedEdges = localStorage.getItem(`flowsmith_edges_${flowId}`);
        
        return {
          ...flow,
          nodes: storedNodes ? JSON.parse(storedNodes) : [],
          edges: storedEdges ? JSON.parse(storedEdges) : []
        };
      }
    }
    
    // 保存流程图
    if (url.includes('/save') && options?.method === 'POST') {
      const flowId = url.split('/flows/')[1].split('/save')[0];
      const { nodes, edges } = JSON.parse(options.body as string);
      
      localStorage.setItem(`flowsmith_nodes_${flowId}`, JSON.stringify(nodes));
      localStorage.setItem(`flowsmith_edges_${flowId}`, JSON.stringify(edges));
      
      // 更新flow的updatedAt
      const storedFlows = localStorage.getItem('flowsmith_flows');
      if (storedFlows) {
        const flows = JSON.parse(storedFlows);
        const flowIndex = flows.findIndex((f: Flow) => f.id === flowId);
        if (flowIndex !== -1) {
          flows[flowIndex].updatedAt = new Date().toISOString();
          localStorage.setItem('flowsmith_flows', JSON.stringify(flows));
        }
      }
      
      return { message: '流程图已保存' };
    }
    
    // 删除流程
    if (options?.method === 'DELETE' && url.includes('/flows/')) {
      const flowId = url.split('/flows/')[1];
      const storedFlows = localStorage.getItem('flowsmith_flows');
      
      if (storedFlows) {
        let flows = JSON.parse(storedFlows);
        flows = flows.filter((f: Flow) => f.id !== flowId);
        localStorage.setItem('flowsmith_flows', JSON.stringify(flows));
        
        // 删除相关节点和边
        localStorage.removeItem(`flowsmith_nodes_${flowId}`);
        localStorage.removeItem(`flowsmith_edges_${flowId}`);
      }
      
      return null;
    }
    
    return {};
  }
};

// API 客户端
export const api = {
  // 流程相关
  flows: {
    // 获取所有流程
    getAll: async (): Promise<Flow[]> => {
      return fetchWithFallback(`${API_URL}/flows`);
    },
    
    // 获取单个流程（包含节点和连接）
    get: async (id: string): Promise<FlowWithGraph> => {
      return fetchWithFallback(`${API_URL}/flows/${id}`);
    },
    
    // 创建新流程
    create: async (data: { name: string; description?: string }): Promise<Flow> => {
      return fetchWithFallback(`${API_URL}/flows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    
    // 更新流程
    update: async (id: string, data: { name?: string; description?: string }): Promise<Flow> => {
      return fetchWithFallback(`${API_URL}/flows/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    },
    
    // 删除流程
    delete: async (id: string): Promise<void> => {
      return fetchWithFallback(`${API_URL}/flows/${id}`, {
        method: 'DELETE'
      });
    },
    
    // 保存整个流程图
    saveGraph: async (id: string, { nodes, edges }: { nodes: Node[]; edges: Edge[] }): Promise<{ message: string }> => {
      return fetchWithFallback(`${API_URL}/flows/${id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodes, edges })
      });
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
      try {
        return fetchWithFallback(`${API_URL}/processors/execute`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ processorId, inputNodes, outputNodeId })
        });
      } catch (error) {
        // 模拟处理结果
        return {
          success: true,
          result: `模拟处理结果: 已处理输入节点内容`,
          outputNodeId
        };
      }
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
