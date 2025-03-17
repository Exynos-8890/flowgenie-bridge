
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json();
    const { content } = requestBody;
    
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${Deno.env.get("SILICONFLOW_API_KEY")}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-V3",
            stream: false,
            max_tokens: 4096,
            temperature: 0.7,
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5,
            n: 1,
            stop: [],
            messages: [
                {
                    content: content,
                    role: "user"
                }
            ]
        })
    };
      
    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', options)

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Siliconflow API Error:', errorData);
      console.error('Error Status:', response.status);
      console.error('Error Details:', JSON.stringify(errorData, null, 2));
      throw new Error(`Siliconflow API error: ${errorData.error?.message || response.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('API Response Success:', { status: response.status, model: data.model });
    const generatedText = data.choices[0].message.content;

    return new Response(
      JSON.stringify({ result: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing with GPT:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
