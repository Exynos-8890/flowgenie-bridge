
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { api, Flow } from '@/lib/api';
import { toast } from '@/components/ui/use-toast';
import { useNavigate } from 'react-router-dom';

interface FlowSelectorProps {
  onSelect: (flowId: string) => void;
  onNewFlow: () => void;
}

const FlowSelector: React.FC<FlowSelectorProps> = ({ onSelect, onNewFlow }) => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewFlowDialog, setShowNewFlowDialog] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [newFlowDescription, setNewFlowDescription] = useState('');
  const navigate = useNavigate();

  // 加载所有流程
  const loadFlows = async () => {
    try {
      setLoading(true);
      const flowsData = await api.flows.getAll();
      setFlows(flowsData);
    } catch (error) {
      toast({
        title: '加载失败',
        description: '无法加载流程列表，请稍后再试',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // 创建新流程
  const createNewFlow = async () => {
    if (!newFlowName.trim()) {
      toast({
        title: '请输入名称',
        description: '流程名称不能为空',
        variant: 'destructive',
      });
      return;
    }

    try {
      const newFlow = await api.flows.create({
        name: newFlowName,
        description: newFlowDescription,
      });
      
      setFlows([...flows, newFlow]);
      setShowNewFlowDialog(false);
      setNewFlowName('');
      setNewFlowDescription('');
      
      toast({
        title: '创建成功',
        description: `流程 "${newFlow.name}" 已创建`,
      });
      
      // 跳转到新流程
      onSelect(newFlow.id);
      onNewFlow();
    } catch (error) {
      toast({
        title: '创建失败',
        description: '无法创建新流程，请稍后再试',
        variant: 'destructive',
      });
    }
  };

  // 删除流程
  const deleteFlow = async (id: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm(`确定要删除 "${name}" 流程吗？此操作不可逆。`)) {
      return;
    }

    try {
      await api.flows.delete(id);
      setFlows(flows.filter(flow => flow.id !== id));
      
      toast({
        title: '删除成功',
        description: `流程 "${name}" 已删除`,
      });
    } catch (error) {
      toast({
        title: '删除失败',
        description: '无法删除流程，请稍后再试',
        variant: 'destructive',
      });
    }
  };

  // 初始加载
  useEffect(() => {
    loadFlows();
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-medium">我的流程</h2>
        <Button onClick={() => setShowNewFlowDialog(true)}>新建流程</Button>
      </div>

      {loading ? (
        <div className="flex justify-center p-4">
          <p className="text-gray-500">加载中...</p>
        </div>
      ) : flows.length === 0 ? (
        <div className="text-center p-8 glass-panel rounded-lg">
          <p className="text-gray-500 mb-4">暂无流程</p>
          <Button onClick={() => setShowNewFlowDialog(true)}>创建第一个流程</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flows.map(flow => (
            <div
              key={flow.id}
              className="glass-panel p-4 rounded-lg cursor-pointer hover:bg-opacity-80 transition-all"
              onClick={() => onSelect(flow.id)}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-medium">{flow.name}</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => deleteFlow(flow.id, flow.name, e)}
                >
                  删除
                </Button>
              </div>
              {flow.description && (
                <p className="text-sm text-gray-500 mt-2">{flow.description}</p>
              )}
              <p className="text-xs text-gray-400 mt-4">
                更新于: {new Date(flow.updatedAt).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 新建流程对话框 */}
      <Dialog open={showNewFlowDialog} onOpenChange={setShowNewFlowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>创建新流程</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="flowName" className="text-sm font-medium">
                流程名称
              </label>
              <Input
                id="flowName"
                value={newFlowName}
                onChange={(e) => setNewFlowName(e.target.value)}
                placeholder="输入流程名称"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="flowDescription" className="text-sm font-medium">
                描述 (可选)
              </label>
              <Input
                id="flowDescription"
                value={newFlowDescription}
                onChange={(e) => setNewFlowDescription(e.target.value)}
                placeholder="输入流程描述"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewFlowDialog(false)}>
              取消
            </Button>
            <Button onClick={createNewFlow}>创建</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FlowSelector;
