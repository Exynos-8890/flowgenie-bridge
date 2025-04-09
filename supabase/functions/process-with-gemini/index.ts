// filepath: /Users/macbook/Documents/flowgenie-bridge/supabase/functions/process-with-gemini/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// 导入 Gemini API 客户端库 (Deno 兼容版本)
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai";

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
    
    // 初始化 Gemini API 客户端
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY not found in environment variables");
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-thinking-exp-01-21",
    //   systemInstruction: "回答问题，无需总结重复",
    });

    // 配置生成参数
    const generationConfig = {
      temperature: 0.7,
      topP: 0.9,
      topK: 64,
      maxOutputTokens: 8192,
    };

    // 创建聊天会话
    const chatSession = model.startChat({
      generationConfig,
      history: [], // 无需保留历史记录，每次请求都是独立的
    });
    
    // 发送消息并获取响应
    const result = await chatSession.sendMessage(content);
    const fullResponse = result.response.text();
    
    // 处理返回内容，提取实际结果（过滤思考过程）
    const actualResponse = extractActualResponse(fullResponse);
    
    console.log('API Response Success: Generated Gemini response');

    return new Response(
      JSON.stringify({ result: actualResponse }),
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

/**
 * 从完整的 Gemini 响应中提取实际的回答内容
 * 过滤掉 "thinking" 部分，只保留实际回答
 */
function extractActualResponse(fullResponse: string): string {
  // 根据示例中的格式，Gemini 的 thinking 模型会先输出思考过程，然后输出实际结果
  // 思考部分通常以 "The user is asking" 开头，或包含 "I should" 等提示词
  
  // 分割策略：找到最后一段实际内容
  const thinkingMarkers = [
    "The user is asking",
    "I should",
    "I need to",
    "I will",
    "I can",
    "I'll"
  ];
  
  for (const marker of thinkingMarkers) {
    if (fullResponse.includes(marker)) {
      // 尝试找到第一个思考标记后的实际内容
      const parts = fullResponse.split(/(?=The user is asking|I should|I need to|I will|I can|I'll)/);
      if (parts.length > 1) {
        // 最后一部分通常是实际结果，而不是思考过程
        return parts[parts.length - 1].trim();
      }
      break;
    }
  }
  
  // 如果无法确定分割点，返回原始响应
  return fullResponse;
}