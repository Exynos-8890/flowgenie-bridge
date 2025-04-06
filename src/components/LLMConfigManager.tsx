
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type LLMConfig = {
  id: string;
  name: string;
  description: string | null;
  active: boolean | null;
};

const LLMConfigManager = () => {
  const [llmConfigs, setLLMConfigs] = useState<LLMConfig[]>([]);
  const [selectedLLM, setSelectedLLM] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSuperUser, setIsSuperUser] = useState(false);
  const { session } = useAuth();

  // Check if user has superuser privileges
  useEffect(() => {
    const checkUserRole = async () => {
      if (!session?.user?.id) return;
      
      const { data, error } = await supabase
        .rpc('is_super_user');
      
      if (!error && data) {
        setIsSuperUser(true);
      }
    };
    
    checkUserRole();
  }, [session]);

  // Fetch LLM configurations
  useEffect(() => {
    const fetchLLMConfigs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('llm_config')
        .select('*')
        .order('name');
      
      if (error) {
        toast({
          title: "Error Loading LLM Configurations",
          description: error.message,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      
      setLLMConfigs(data as LLMConfig[]);
      
      // Set the active LLM as selected
      const active = data.find(config => config.active);
      if (active) {
        setSelectedLLM(active.id);
      }
      
      setLoading(false);
    };
    
    fetchLLMConfigs();
  }, []);

  // Handle setting active LLM
  const handleSetActiveLLM = async () => {
    if (!selectedLLM) return;
    
    setLoading(true);
    
    try {
      // First reset all to inactive
      await supabase
        .from('llm_config')
        .update({ active: false })
        .neq('id', 'placeholder');
      
      // Then set the selected one to active
      const { error } = await supabase
        .from('llm_config')
        .update({ active: true })
        .eq('id', selectedLLM);
      
      if (error) throw error;
      
      // Update local state
      setLLMConfigs(configs => 
        configs.map(config => ({
          ...config,
          active: config.id === selectedLLM
        }))
      );
      
      toast({
        title: "LLM Configuration Updated",
        description: "The active LLM has been updated successfully.",
      });
    } catch (error: any) {
      toast({
        title: "Error Updating LLM Configuration",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isSuperUser) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>LLM Configuration</CardTitle>
          <CardDescription>
            You need administrator privileges to manage LLM configurations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>LLM Configuration</CardTitle>
        <CardDescription>
          Choose which language model to use for text processing in the application.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-4">Loading configurations...</div>
        ) : (
          <>
            <RadioGroup
              value={selectedLLM || ''}
              onValueChange={setSelectedLLM}
              className="space-y-4 py-4"
            >
              {llmConfigs.map(config => (
                <div key={config.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={config.id} id={config.id} />
                  <Label htmlFor={config.id} className="font-medium">
                    {config.name}
                    {config.active && <span className="ml-2 text-green-600">(Active)</span>}
                  </Label>
                  <span className="text-sm text-gray-500">- {config.description}</span>
                </div>
              ))}
            </RadioGroup>
            
            <Button
              onClick={handleSetActiveLLM}
              disabled={loading || !selectedLLM}
              className="mt-4"
            >
              Set as Active LLM
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default LLMConfigManager;
