
import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/components/ui/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Plus, Save, FolderOpen } from 'lucide-react';

interface Flow {
  id: string;
  name: string;
  created_at: string;
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
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [flowName, setFlowName] = useState('');

  // Fetch flows from Supabase
  const fetchFlows = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('flows')
        .select('id, name, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      setFlows(data || []);
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

  // Load flows on component mount
  useEffect(() => {
    fetchFlows();
  }, []);

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
        <Button size="sm" onClick={onNewFlow} title="Create New Flow">
          <Plus className="h-4 w-4" />
        </Button>
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
                  {new Date(flow.created_at).toLocaleDateString()}
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
