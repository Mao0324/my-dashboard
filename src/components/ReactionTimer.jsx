import React, { useState, useRef } from 'react';
import { Timer, Zap, RotateCcw, Trophy } from 'lucide-react';
import { Card } from './ui/Card.jsx';
import { Button } from './ui/Button.jsx';

const ReactionTimer = () => {
  const [status, setStatus] = useState('idle'); // idle, waiting, ready, finished, early
  const [time, setTime] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  const handleStart = () => {
    setStatus('waiting');
    // 随机等待 2 - 5 秒，模拟发令枪
    const delay = 2000 + Math.random() * 3000;
    
    timerRef.current = setTimeout(() => {
      setStatus('ready');
      startTimeRef.current = performance.now();
    }, delay);
  };

  const handleClick = () => {
    if (status === 'waiting') {
      // 抢跑
      clearTimeout(timerRef.current);
      setStatus('early');
    } else if (status === 'ready') {
      // 完成
      const endTime = performance.now();
      const result = endTime - startTimeRef.current;
      setTime(result);
      setStatus('finished');
      
      // 更新个人最好成绩 (PB)
      if (!bestTime || result < bestTime) {
        setBestTime(result);
      }
    } else if (status === 'finished' || status === 'early') {
      // 重置
      setStatus('idle');
      setTime(0);
    }
  };

  // 苏炳添 9.83s 亚洲纪录的起跑反应约为 0.142s (东京奥运会半决赛) - 0.124s (决赛)
  // 这里我们设定一个“苏神级”的阈值
  const isSuGodLevel = status === 'finished' && time < 150; 

  return (
    <Card className="relative overflow-hidden transition-all duration-300 h-full min-h-[200px] flex flex-col">
      <div className="flex justify-between items-center mb-4 z-10">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Timer size={18} className="text-blue-600" /> 
          听枪起跑训练
        </h3>
        {bestTime && (
          <span className="text-xs font-mono text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg flex items-center gap-1">
            <Trophy size={12} /> PB: {bestTime.toFixed(0)}ms
          </span>
        )}
      </div>

      <div 
        className={`flex-1 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-200 select-none relative overflow-hidden
          ${status === 'idle' ? 'bg-gray-100 hover:bg-gray-200' : ''}
          ${status === 'waiting' ? 'bg-red-500' : ''}
          ${status === 'ready' ? 'bg-green-500 scale-[1.02]' : ''}
          ${status === 'finished' ? 'bg-white border-2 border-blue-100' : ''}
          ${status === 'early' ? 'bg-orange-100 border-2 border-orange-200' : ''}
        `}
        onMouseDown={status === 'idle' ? handleStart : handleClick}
      >
        {/* 背景装饰 */}
        {status === 'waiting' && <div className="absolute inset-0 animate-pulse bg-red-600/20"></div>}
        
        {status === 'idle' && (
          <div className="text-center text-gray-500">
            <Zap size={48} className="mx-auto mb-2 opacity-20" />
            <p className="font-bold">点击开始</p>
            <p className="text-xs mt-1">看到绿色立即点击</p>
          </div>
        )}

        {status === 'waiting' && (
          <div className="text-white font-bold text-2xl tracking-widest">
            各就位...
          </div>
        )}

        {status === 'ready' && (
          <div className="text-white font-bold text-4xl animate-bounce">
            跑 !!!
          </div>
        )}

        {status === 'finished' && (
          <div className="text-center">
            <div className="text-5xl font-mono font-black text-blue-600 mb-2">
              {time.toFixed(0)}<span className="text-lg text-gray-400 ml-1">ms</span>
            </div>
            <p className="text-gray-500 text-sm flex items-center justify-center gap-1">
              {isSuGodLevel ? "⚡️ 苏神附体！奥运决赛级反应！" : "再接再厉，点击重试"}
            </p>
            <div className="mt-4">
               <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}>
                 <RotateCcw size={16} /> 重置
               </Button>
            </div>
          </div>
        )}

        {status === 'early' && (
          <div className="text-center text-orange-500">
            <div className="text-3xl font-bold mb-2">抢跑犯规!</div>
            <p className="text-sm mb-4">太心急了，请等待绿灯</p>
            <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setStatus('idle'); }}>
                 <RotateCcw size={16} /> 重来
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ReactionTimer;