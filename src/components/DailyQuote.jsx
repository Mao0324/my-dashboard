import React, { useState, useEffect } from 'react';
import { Quote, RefreshQwerty } from 'lucide-react';
import { Card } from './ui/Card';

const DailyQuote = () => {
  const [quote, setQuote] = useState({ text: "加载中...", author: "" });
  const [loading, setLoading] = useState(false);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      // 调用一言 API (k=i 代表诗词，k=d 代表文学)
      const res = await fetch('https://v1.hitokoto.cn/?c=d&c=i&c=k');
      const data = await res.json();
      setQuote({ text: data.hitokoto, author: data.from_who || data.from });
    } catch (e) {
      setQuote({ text: "生活明朗，万物可爱。", author: "网络" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  return (
    <Card className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white border-none relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
         <button onClick={fetchQuote} disabled={loading} className="hover:rotate-180 transition-transform duration-500">
            <RefreshQwerty size={18} />
         </button>
      </div>
      <div className="relative z-10">
        <Quote size={24} className="text-indigo-200 mb-2 opacity-50" />
        <p className="text-lg font-medium leading-relaxed mb-3 font-serif">
          {quote.text}
        </p>
        <p className="text-right text-sm text-indigo-200">
          —— {quote.author || "佚名"}
        </p>
      </div>
      {/* 装饰背景 */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
    </Card>
  );
};

export default DailyQuote;