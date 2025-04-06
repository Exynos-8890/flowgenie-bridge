
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
            'x-goog-api-key': Deno.env.get("GEMINI_API_KEY"),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [
                {
                    parts: [
                        {
                            text: content
                        }
                    ]
                }
            ],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 4096,
            }
        })
    };
      
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent', options)

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gemini API Error:', errorData);
      console.error('Error Status:', response.status);
      console.error('Error Details:', JSON.stringify(errorData, null, 2));
      throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText || 'Unknown error'}`);
    }

    const data = await response.json();
    console.log('API Response Success:', { status: response.status });
    
    // Extract the generated text from Gemini's response structure
    const generatedText = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ result: generatedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error processing with Gemini:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Unknown error occurred' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
})
