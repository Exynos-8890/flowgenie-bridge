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
    const { content, promptTemplate } = await req.json();
    
    // Replace placeholders in the prompt template
    const prompt = promptTemplate.replace(/{{input}}/g, content);
    
    // Make request to OpenAI API
    // const response = await fetch('https://api.openai.com/v1/chat/completions', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     model: 'gpt-3.5-turbo',
    //     messages: [
    //       { role: 'system', content: 'You are a helpful assistant that processes text based on instructions.' },
    //       { role: 'user', content: prompt }
    //     ],
    //     temperature: 0.7,
    //   }),
    // });
      
    // make request to siliconflow
    const options = {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${Deno.env.get("SILICONFLOW_API_KEY")}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model: "deepseek-ai/DeepSeek-V3",
            stream: false,
            max_tokens: 512,
            temperature: 0.7,
            top_p: 0.7,
            top_k: 50,
            frequency_penalty: 0.5,
            n: 1,
            stop: [],
            messages: [
                {
                    content: prompt,
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
