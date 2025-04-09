import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Save, Download, Upload, Trash } from 'lucide-react';

interface Flow {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

interface FlowSelectorProps {
  currentFlowId: string | null;
  onNewFlow: () => void;
  onSelectFlow: (flowId: string) => void;
  onSaveFlow: () => void;
}

const FlowSelector: React.FC<FlowSelectorProps> = ({
  currentFlowId,
  onNewFlow,
  onSelectFlow,
  onSaveFlow,
}) => {
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flowName, setFlowName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch flows from the edge function
  const fetchFlows = async () => {
    try {
      setIsLoading(true);
      
      if (!session?.access_token) {
        throw new Error('User not authenticated');
      }
      
      const { data, error } = await supabase.functions.invoke('get-user-flows', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        throw error;
      }

      // The flows are already sorted by updated_at in the edge function,
      // but we'll sort them here again just to be sure
      const sortedFlows = (data?.flows || []).sort((a: Flow, b: Flow) => {
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      setFlows(sortedFlows);
    } catch (error) {
      console.error('Error fetching flows:', error);
      toast({
        title: 'Failed to load flows',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update a flow name
  const updateFlowName = async () => {
    if (!currentFlowId) {
      toast({
        title: 'No flow selected',
        description: 'Please select a flow to rename',
        variant: 'destructive',
      });
      return;
    }

    if (!flowName.trim()) {
      toast({
        title: 'Invalid name',
        description: 'Please enter a valid flow name',
        variant: 'destructive',
      });
      return;
    }

    try {
      // First, check if the user has access to this flow
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('user_id')
        .eq('id', currentFlowId)
        .single();

      if (flowError) {
        throw flowError;
      }

      if (flowData.user_id !== session?.user?.id) {
        throw new Error('You do not have permission to modify this flow');
      }

      const { error } = await supabase
        .from('flows')
        .update({ name: flowName })
        .eq('id', currentFlowId);

      if (error) {
        throw error;
      }

      toast({
        title: 'Flow renamed',
        description: `Flow renamed to "${flowName}"`,
      });

      fetchFlows();
    } catch (error) {
      console.error('Error updating flow name:', error);
      toast({
        title: 'Failed to rename flow',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // 导出当前流程为JSON文件
  const exportFlow = async () => {
    if (!currentFlowId) {
      toast({
        title: 'No Flow Selected',
        description: 'Please select a flow to export',
        variant: 'destructive',
      });
      return;
    }

    try {
      // 检查用户是否有访问此流程的权限
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('*')
        .eq('id', currentFlowId)
        .single();

      if (flowError) {
        throw flowError;
      }

      if (flowData.user_id !== session?.user?.id) {
        throw new Error('You do not have permission to export this flow');
      }
      
      // 准备导出数据
      const exportData = {
        name: flowData.name,
        nodes: JSON.parse(flowData.nodes || '[]'),
        edges: JSON.parse(flowData.edges || '[]'),
        exportedAt: new Date().toISOString()
      };
      
      // 创建下载链接
      const fileName = `${flowData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // 创建一个隐藏的下载链接并点击它
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      // 清理
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Export Successful',
        description: `Flow "${flowData.name}" has been exported as a JSON file`,
      });
    } catch (error) {
      console.error('Error exporting flow:', error);
      toast({
        title: 'Export Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // 处理文件导入
  const importFlow = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.id) return;

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent);

      // 验证导入的数据格式
      if (!importedData.name || !importedData.nodes || !importedData.edges) {
        throw new Error('Invalid flow data format');
      }

      // 创建新的流程名称 (添加 "导入-" 前缀)
      const newFlowName = `Imported-${importedData.name}`;

      // 创建新流程
      const { data, error } = await supabase
        .from('flows')
        .insert({
          name: newFlowName,
          user_id: session.user.id,
          nodes: JSON.stringify(importedData.nodes),
          edges: JSON.stringify(importedData.edges),
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'Import Successful',
        description: `Flow "${newFlowName}" has been successfully imported`,
      });

      // 刷新流程列表并选择新导入的流程
      fetchFlows();
      if (data) {
        onSelectFlow(data.id);
      }
    } catch (error) {
      console.error('Error importing flow:', error);
      toast({
        title: 'Import Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }

    // 重置文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 触发文件选择对话框
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // 删除流程函数
  const deleteFlow = async () => {
    if (!currentFlowId) {
      toast({
        title: 'No Flow Selected',
        description: 'Please select a flow to delete',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('Are you sure you want to delete this flow? This action cannot be undone.')) {
      return;
    }

    try {
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('user_id')
        .eq('id', currentFlowId)
        .single();

      if (flowError) throw flowError;

      if (flowData.user_id !== session?.user?.id) {
        throw new Error('You do not have permission to delete this flow');
      }

      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', currentFlowId);

      if (error) throw error;

      toast({
        title: 'Deletion Successful',
        description: 'Flow has been successfully deleted',
      });

      fetchFlows();
      onSelectFlow(null); // 清除当前选择
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast({
        title: 'Deletion Failed',
        description: error instanceof Error ? error.message : 'An unknown error occurred',
        variant: 'destructive',
      });
    }
  };

  // Load flows on component mount and when session changes
  useEffect(() => {
    if (session) {
      fetchFlows();
    }
  }, [session]);

  // 新增：当 currentFlowId 变化时重新加载 flows
  useEffect(() => {
    if (session && currentFlowId) {
      fetchFlows();
    }
  }, [currentFlowId]);

  // Update flow name input when a new flow is selected
  useEffect(() => {
    if (currentFlowId) {
      const currentFlow = flows.find(flow => flow.id === currentFlowId);
      if (currentFlow) {
        setFlowName(currentFlow.name);
      }
    }
  }, [currentFlowId, flows]);

  return (
    <div className={`glass-panel p-4 rounded-lg shadow-lg ${isMobile ? 'w-full' : 'w-[320px]'} animate-slide-in-left`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-700">Your Flows</h3>
        <div className="flex space-x-2">
          {/* Import button */}
          <Button size="sm" variant="outline" onClick={handleImportClick} title="Import Flow">
            <Upload className="h-4 w-4" />
          </Button>
          {/* 隐藏的文件输入 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={importFlow}
            accept=".json"
            style={{ display: 'none' }}
          />
          {/* New flow button */}
          <Button size="sm" onClick={onNewFlow} title="New Flow">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex space-x-2">
          <Input
            value={flowName}
            onChange={(e) => setFlowName(e.target.value)}
            placeholder="Flow name"
            className="flex-1"
          />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={updateFlowName}
            disabled={!currentFlowId}
          >
            Rename
          </Button>
        </div>

        <div className="flex space-x-2">
          <Button 
            className="flex-1" 
            onClick={onSaveFlow}
            disabled={!currentFlowId}
          >
            <Save className="h-4 w-4 mr-2" />
            Save Flow
          </Button>
          <Button
            variant="outline"
            onClick={exportFlow}
            disabled={!currentFlowId}
            title="Export Flow to JSON"
          >
            <Download className="h-4 w-4" />
          </Button>
          {/* 添加删除按钮 */}
          <Button
            variant="destructive"
            onClick={deleteFlow}
            disabled={!currentFlowId}
            title="Delete Flow"
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-600 mb-2">Select a Flow</h4>
        
        {isLoading ? (
          <div className="text-center py-4 text-gray-500">Loading flows...</div>
        ) : flows.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No flows yet. Create your first flow!</div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className={`p-3 rounded-md cursor-pointer hover:bg-gray-100 transition-colors ${
                  currentFlowId === flow.id ? 'bg-gray-100 border border-gray-300' : ''
                }`}
                onClick={() => onSelectFlow(flow.id)}
              >
                <div className="font-medium">{flow.name}</div>
                <div className="text-xs text-gray-500">
                  {new Date(flow.updated_at).toLocaleDateString()} 
                  {/* Add time to show more precisely when it was updated */}
                  <span className="ml-1">
                    {new Date(flow.updated_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FlowSelector;
