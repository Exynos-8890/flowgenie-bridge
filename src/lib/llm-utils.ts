
import { supabase } from '@/integrations/supabase/client';

// Function to get the currently active LLM
export async function getActiveLLM() {
  const { data, error } = await supabase
    .from('llm_config')
    .select('id, name, description')
    .eq('active', true)
    .single();
    
  if (error) {
    console.error('Error fetching active LLM:', error);
    // Default to Deepseek if there's an error
    return { name: 'deepseek', description: 'DeepSeek model (default fallback)' };
  }
  
  return data;
}

// Function to process text with the selected LLM
export async function processWithLLM(content: string) {
  try {
    // Get the active LLM
    const activeLLM = await getActiveLLM();
    
    // Choose which endpoint to call based on the active LLM
    let functionName = 'process-with-gpt';
    if (activeLLM.name === 'gemini') {
      functionName = 'process-with-gemini';
    } else if (activeLLM.name === 'deepseek') {
      functionName = 'process-with-gpt';
    }
    
    // Call the appropriate function
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: { content }
    });
    
    if (error) {
      throw new Error(`Error calling ${functionName}: ${error.message}`);
    }
    
    return data.result;
  } catch (error) {
    console.error('Error in processWithLLM:', error);
    throw error;
  }
}
