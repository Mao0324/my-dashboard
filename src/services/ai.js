import { GoogleGenerativeAI } from "@google/generative-ai";

// ⚠️ 实际项目中，建议将 Key 放在 .env 文件中: VITE_GEMINI_API_KEY
// 这里为了演示方便，你需要填入你的 Key
// 获取 Key 地址: https://aistudio.google.com/app/apikey
const API_KEY = "AIzaSyC7jMGisx20Py7swvZArS4lkAV9eyheHdY"; 

let genAI = null;
let model = null;

export const initializeAI = () => {
  if (!API_KEY) {
    console.warn("请在 src/services/ai.js 中配置有效的 Gemini API Key");
    return false;
  }
  genAI = new GoogleGenerativeAI(API_KEY);
  
  // 更新：使用 Gemini 2.5 Flash Preview 模型
  // 注意：如果这个模型 ID 不可用，可以回退到 "gemini-1.5-flash"
  model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" }); 
  return true;
};

export const generateAIResponse = async (userQuery, contextData, chatHistory) => {
  if (!model) {
    const success = initializeAI();
    if (!success) return "请先配置 API Key。";
  }

  try {
    // 1. 构建上下文数据字符串
    const dataContext = JSON.stringify(contextData, null, 2);

    // 2. 构建系统提示词
    const systemPrompt = `
      你是一个运行在个人仪表盘(Dashboard)中的智能助手。
      
      以下是用户的个人数据（博客文章、公告、设置等）：
      ---开始数据---
      ${dataContext}
      ---结束数据---

      请根据以上数据回答用户的问题。
      规则：
      1. 如果用户问博客相关的问题，请引用具体的文章标题。
      2. 如果用户问今天天气或待办，结合数据回答。
      3. 保持回答简洁、亲切。
      4. 如果数据中没有答案，请诚实说不知道，不要编造。
    `;

    // 3. 启动聊天会话
    const chat = model.startChat({
      history: [
        {
          role: "user",
          parts: [{ text: systemPrompt }],
        },
        {
          role: "model",
          parts: [{ text: "明白，我已经读取了您的个人数据。请问有什么可以帮您？" }],
        },
        ...chatHistory.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }))
      ],
    });

    // 4. 发送消息
    const result = await chat.sendMessage(userQuery);
    const response = await result.response;
    return response.text();

  } catch (error) {
    console.error("AI Error:", error);
    return "抱歉，AI 服务暂时不可用 (请检查 API Key 或网络，或者尝试回退到 gemini-1.5-flash)。";
  }
};