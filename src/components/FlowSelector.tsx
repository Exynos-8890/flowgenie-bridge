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

  const formatDate = (dateString: string | number | boolean | { [key: string]: Json; } | Json[] | null) => {
    if (!dateString || typeof dateString !== 'string') return '';
    
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

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

  const exportFlow = async () => {
    if (!currentFlowId) {
      toast({
        title: '没有选择流程',
        description: '请先选择一个流程进行导出',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data: flowData, error: flowError } = await supabase
        .from('flows')
        .select('*')
        .eq('id', currentFlowId)
        .single();

      if (flowError) {
        throw flowError;
      }

      if (flowData.user_id !== session?.user?.id) {
        throw new Error('您没有权限导出此流程');
      }
      
      const exportData = {
        name: flowData.name,
        nodes: JSON.parse(flowData.nodes || '[]'),
        edges: JSON.parse(flowData.edges || '[]'),
        exportedAt: new Date().toISOString()
      };
      
      const fileName = `${flowData.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
      const json = JSON.stringify(exportData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: '导出成功',
        description: `流程 "${flowData.name}" 已导出为JSON文件`,
      });
    } catch (error) {
      console.error('导出流程时出错:', error);
      toast({
        title: '导出失败',
        description: error instanceof Error ? error.message : '发生未知错误',
        variant: 'destructive',
      });
    }
  };

  const importFlow = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !session?.user?.id) return;

    try {
      const fileContent = await file.text();
      const importedData = JSON.parse(fileContent);

      if (!importedData.name || !importedData.nodes || !importedData.edges) {
        throw new Error('无效的流程数据格式');
      }

      const newFlowName = `导入-${importedData.name}`;

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
        title: '导入成功',
        description: `流程 "${newFlowName}" 已成功导入`,
      });

      fetchFlows();
      if (data) {
        onSelectFlow(data.id);
      }
    } catch (error) {
      console.error('导入流程时出错:', error);
      toast({
        title: '导入失败',
        description: error instanceof Error ? error.message : '发生未知错误',
        variant: 'destructive',
      });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const deleteFlow = async () => {
    if (!currentFlowId) {
      toast({
        title: '没有选择流程',
        description: '请先选择一个流程进行删除',
        variant: 'destructive',
      });
      return;
    }

    if (!window.confirm('确定要删除此流程吗？此操作不可恢复。')) {
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
        throw new Error('您没有权限删除此流程');
      }

      const { error } = await supabase
        .from('flows')
        .delete()
        .eq('id', currentFlowId);

      if (error) throw error;

      toast({
        title: '删除成功',
        description: '流程已成功删除',
      });

      fetchFlows();
      onSelectFlow(null);
    } catch (error) {
      console.error('删除流程时出错:', error);
      toast({
        title: '删除失败',
        description: error instanceof Error ? error.message : '发生未知错误',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (session) {
      fetchFlows();
    }
  }, [session]);

  useEffect(() => {
    if (session && currentFlowId) {
      fetchFlows();
    }
  }, [currentFlowId]);

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
          <Button size="sm" variant="outline" onClick={handleImportClick} title="导入流程">
            <Upload className="h-4 w-4" />
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={importFlow}
            accept=".json"
            style={{ display: 'none' }}
          />
          <Button size="sm" onClick={onNewFlow} title="新建流程">
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
                  {formatDate(flow.updated_at)}
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
