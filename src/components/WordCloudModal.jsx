import React, { useMemo } from 'react';
import { X, Cloud } from 'lucide-react';
import { Card } from './ui/Card';

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这',
  'the', 'and', 'is', 'of', 'to', 'a', 'in', 'that', 'it', 'for', 'on', 'with', 'as', 'this', 'was', 'at', 'by', 'an', 'be', 'or', 'from'
]);

const COLORS = [
  'text-blue-500', 'text-indigo-500', 'text-purple-500', 'text-pink-500', 
  'text-rose-500', 'text-orange-500', 'text-emerald-500', 'text-teal-500'
];

const WordCloudModal = ({ isOpen, onClose, posts }) => {
  if (!isOpen) return null;

  // 核心逻辑：简单的中英文分词与统计
  const wordData = useMemo(() => {
    const text = posts.map(p => {
        // 移除 HTML 标签，只保留文本
        const div = document.createElement('div');
        div.innerHTML = p.content;
        return div.textContent || div.innerText || "";
    }).join(" ");

    const frequency = {};

    // 1. 处理英文 (按空格和标点分割)
    const englishMatches = text.match(/[a-zA-Z]{2,}/g) || [];
    englishMatches.forEach(word => {
      const w = word.toLowerCase();
      if (!STOP_WORDS.has(w)) {
        frequency[w] = (frequency[w] || 0) + 1;
      }
    });

    // 2. 处理中文 (简单按双字切分策略)
    const chineseText = text.replace(/[a-zA-Z0-9\s\p{P}]+/gu, ""); // 移除非中文字符
    
    for (let i = 0; i < chineseText.length - 1; i++) {
      const twoChars = chineseText.substr(i, 2);
      if (!STOP_WORDS.has(twoChars[0]) && !STOP_WORDS.has(twoChars[1])) {
         frequency[twoChars] = (frequency[twoChars] || 0) + 1;
      }
    }

    // 转换为数组并排序
    const sorted = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1]) 
      .slice(0, 50); // 只取前 50 个

    // 标准化大小
    if (sorted.length === 0) return [];
    const maxCount = sorted[0][1];
    const minCount = sorted[sorted.length - 1][1];
    
    return sorted.map(([text, count]) => {
      const fontSize = maxCount === minCount 
        ? 16 
        : 12 + ((count - minCount) / (maxCount - minCount)) * 24;
      
      return {
        text,
        count,
        fontSize: Math.round(fontSize),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        rotation: Math.random() > 0.8 ? -10 + Math.random() * 20 : 0 
      };
    });

  }, [posts]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Cloud className="text-blue-500" /> 博客词云
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-8 overflow-y-auto bg-gray-50 flex-1">
          {wordData.length > 0 ? (
            <div className="flex flex-wrap justify-center items-center content-center gap-4 min-h-[300px]">
              {wordData.map((item, index) => (
                <span
                  key={index}
                  className={`${item.color} font-bold cursor-default transition-all duration-300 hover:scale-110 hover:opacity-80`}
                  style={{ 
                    fontSize: `${item.fontSize}px`,
                    transform: `rotate(${item.rotation}deg)`,
                    padding: '4px'
                  }}
                  title={`出现 ${item.count} 次`}
                >
                  {item.text}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <Cloud size={64} className="mb-4 opacity-20" />
              <p>文章内容太少，暂无法生成词云</p>
            </div>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 text-center text-xs text-gray-400 border-t border-gray-100">
          基于文章内容自动生成的关键词统计
        </div>
      </div>
    </div>
  );
};

export default WordCloudModal;