import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Sparkles, Bot, User, Loader2 } from 'lucide-react';
import { collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { generateAIResponse } from '../services/ai';
import { Button } from './ui/Button';

const AIAssistant = ({ db, user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    { id: 1, role: 'assistant', content: '你好！我是你的个人数据助手。我可以帮你查找以前写的博客、总结公告或回答关于你仪表盘的问题。' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  // 获取全量数据用于 RAG (Context Stuffing)
  const fetchContextData = async () => {
    if (!db) return {};
    
    const context = {
      userProfile: {
        name: user?.displayName || '用户',
        email: user?.email
      },
      currentTime: new Date().toLocaleString(),
    };

    try {
      // 1. 获取最近的博客 (限制 20 篇以节省 Token，实际可更多)
      const postsSnap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20)));
      context.posts = postsSnap.docs.map(d => {
        const data = d.data();
        return {
          title: data.title,
          content: data.content.replace(/<[^>]+>/g, '').slice(0, 500), // 去除 HTML 标签，截取前500字摘要
          date: data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : '未知日期'
        };
      });

      // 2. 获取公告
      const announceSnap = await getDocs(query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(10)));
      context.announcements = announceSnap.docs.map(d => d.data().text);

    } catch (e) {
      console.error("数据获取失败", e);
    }

    return context;
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = { id: Date.now(), role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // 1. 准备数据
      const contextData = await fetchContextData();
      
      // 2. 转换历史记录格式 (去掉第一条默认消息，只保留最近 10 条以防 token 溢出)
      const historyForAI = messages.slice(-10).map(m => ({
        role: m.role,
        content: m.content
      }));

      // 3. 调用 AI
      const replyText = await generateAIResponse(input, contextData, historyForAI);
      
      const aiMsg = { id: Date.now() + 1, role: 'assistant', content: replyText };
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      setMessages(prev => [...prev, { id: Date.now(), role: 'assistant', content: "思考过程中发生了错误..." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* 悬浮按钮 */}
      <button 
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 p-4 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group ${isOpen ? 'scale-0 opacity-0' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
      >
        <div className="absolute inset-0 bg-white rounded-full opacity-0 group-hover:opacity-20 transition-opacity animate-pulse"></div>
        <Sparkles className="text-white w-6 h-6" />
      </button>

      {/* 聊天窗口 */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[90vw] md:w-[400px] h-[600px] max-h-[80vh] bg-white/90 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
          
          {/* 头部 */}
          <div className="p-4 bg-gradient-to-r from-indigo-600 to-purple-600 flex justify-between items-center text-white shadow-md">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-white/20 rounded-lg">
                <Bot size={20} />
              </div>
              <div>
                <h3 className="font-bold text-sm">AI 个人助手</h3>
                <div className="flex items-center gap-1 opacity-80">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span className="text-[10px]">Gemini 1.5 Pro Online</span>
                </div>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-white/20 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* 消息列表 */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-gray-50/50">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${msg.role === 'user' ? 'bg-gray-200' : 'bg-indigo-100 text-indigo-600'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm max-w-[80%] shadow-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-100 rounded-bl-none'
                }`}>
                  {/* 简单的文本渲染，支持换行 */}
                  {msg.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i !== msg.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-100 shadow-sm flex items-center gap-2">
                  <Loader2 size={16} className="animate-spin text-indigo-500" />
                  <span className="text-xs text-gray-400">正在思考...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* 输入框 */}
          <div className="p-3 bg-white border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-100 rounded-2xl p-1 pr-2 focus-within:ring-2 focus-within:ring-indigo-200 transition-all">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="问问关于你的博客或日程..."
                className="flex-1 bg-transparent border-none px-3 py-2 text-sm focus:ring-0 outline-none text-gray-700 placeholder:text-gray-400"
              />
              <Button 
                onClick={handleSend} 
                disabled={isLoading || !input.trim()}
                className={`!p-2 !rounded-xl h-8 w-8 flex items-center justify-center transition-all ${input.trim() ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-300'}`}
              >
                <Send size={14} className="text-white ml-0.5" />
              </Button>
            </div>
            <div className="text-center mt-2">
               <span className="text-[10px] text-gray-300">Powered by Local Data & Gemini AI</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;