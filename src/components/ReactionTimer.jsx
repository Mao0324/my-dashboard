import React, { useState, useRef, useEffect } from 'react';
import { Timer, Zap, RotateCcw, Trophy, Footprints } from 'lucide-react';
import { Card } from './ui/Card.jsx';
import { Button } from './ui/Button.jsx';

const ReactionTimer = () => {
  // 状态流转: idle -> marks (各就位) -> set (预备) -> go (跑) -> finished
  const [status, setStatus] = useState('idle'); 
  const [time, setTime] = useState(0);
  const [bestTime, setBestTime] = useState(null);
  
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);

  // 清理定时器
  useEffect(() => {
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleStart = () => {
    if (status !== 'idle') return;

    // 1. 进入 "各就位"
    setStatus('marks');
    
    // "各就位" 持续约 2 秒，然后进入 "预备"
    timerRef.current = setTimeout(() => {
      setStatus('set');
      
      // 2. "预备" 持续随机时间 (1.5s - 3.5s)，模拟发令员的不确定性
      const delay = 1500 + Math.random() * 2000;
      
      timerRef.current = setTimeout(() => {
        // 3. 发枪！
        setStatus('go');
        startTimeRef.current = performance.now();
      }, delay);
      
    }, 2000);
  };

  const handleClick = () => {
    if (status === 'idle') {
      handleStart();
    } else if (status === 'marks' || status === 'set') {
      // 抢跑 (False Start)
      clearTimeout(timerRef.current);
      setStatus('early');
    } else if (status === 'go') {
      // 完成
      const endTime = performance.now();
      const result = endTime - startTimeRef.current;
      setTime(result);
      setStatus('finished');
      
      if (!bestTime || result < bestTime) {
        setBestTime(result);
      }
    } else if (status === 'finished' || status === 'early') {
      // 重置
      setStatus('idle');
      setTime(0);
    }
  };

  // 苏炳添 9.83s 亚洲纪录的起跑反应约为 0.142s
  const isSuGodLevel = status === 'finished' && time < 150; 

  return (
    <Card className="relative overflow-hidden transition-all duration-300 h-full min-h-[240px] flex flex-col border-none shadow-lg">
      <div className="flex justify-between items-center mb-4 z-10 px-1">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Timer size={18} className="text-blue-600" /> 
          听枪反应训练
        </h3>
        {bestTime && (
          <span className="text-xs font-mono text-yellow-600 bg-yellow-50 px-2 py-1 rounded-lg flex items-center gap-1 border border-yellow-100">
            <Trophy size={12} /> PB: {bestTime.toFixed(0)}ms
          </span>
        )}
      </div>

      <div 
        className={`flex-1 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all duration-300 select-none relative overflow-hidden shadow-inner
          ${status === 'idle' ? 'bg-gray-50 hover:bg-gray-100 border-2 border-dashed border-gray-300' : ''}
          ${status === 'marks' ? 'bg-yellow-500 border-2 border-yellow-600' : ''}
          ${status === 'set' ? 'bg-orange-500 border-2 border-orange-600' : ''}
          ${status === 'go' ? 'bg-green-500 scale-[1.02] shadow-xl border-none' : ''}
          ${status === 'finished' ? 'bg-white border-2 border-blue-100' : ''}
          ${status === 'early' ? 'bg-red-50 border-2 border-red-200' : ''}
        `}
        onMouseDown={handleClick}
      >
        {/* 状态文本显示 */}
        {status === 'idle' && (
          <div className="text-center text-gray-400">
            <Footprints size={48} className="mx-auto mb-2 opacity-20" />
            <p className="font-bold text-gray-600">点击进入跑道</p>
            <p className="text-xs mt-1">各就位 {'->'} 预备 {'->'} 跑</p>
          </div>
        )}

        {status === 'marks' && (
          <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <Footprints size={64} className="text-white opacity-80 mb-2 rotate-90" />
            <div className="text-white font-black text-3xl tracking-widest uppercase drop-shadow-md">
              各就位
            </div>
            <div className="text-white/60 text-xs font-mono mt-1">ON YOUR MARKS</div>
          </div>
        )}

        {status === 'set' && (
          <div className="flex flex-col items-center">
             {/* 模拟重心抬起 */}
            <div className="text-white font-black text-4xl tracking-widest uppercase drop-shadow-md animate-pulse">
              预备
            </div>
            <div className="text-white/60 text-xs font-mono mt-1">SET</div>
          </div>
        )}

        {status === 'go' && (
          <div className="flex flex-col items-center">
            <div className="text-white font-black text-6xl animate-bounce drop-shadow-lg">
              跑 !!!
            </div>
            <Zap className="text-yellow-300 w-12 h-12 absolute top-4 right-4 animate-ping" />
          </div>
        )}

        {status === 'finished' && (
          <div className="text-center animate-in slide-in-from-bottom-4 fade-in duration-300">
            <div className="text-xs text-gray-400 mb-1">REACTION TIME</div>
            <div className={`text-5xl font-mono font-black mb-2 ${isSuGodLevel ? 'text-yellow-500' : 'text-blue-600'}`}>
              {time.toFixed(0)}<span className="text-lg text-gray-400 ml-1">ms</span>
            </div>
            <p className="text-gray-500 text-xs font-medium px-4">
              {isSuGodLevel ? "🏆 苏神附体！起跑反应世界级！" : time < 200 ? "⚡️ 反应不错，职业级水平！" : "再接再厉，专注听枪声"}
            </p>
            <div className="mt-4">
               <Button variant="secondary" onClick={(e) => { e.stopPropagation(); setStatus('idle'); setTime(0); }} className="text-xs h-8">
                 <RotateCcw size={14} className="mr-1"/> 重置
               </Button>
            </div>
          </div>
        )}

        {status === 'early' && (
          <div className="text-center text-red-500 animate-shake">
            <div className="text-3xl font-bold mb-1">抢跑犯规!</div>
            <div className="text-xs font-mono bg-red-100 text-red-600 px-2 py-1 rounded inline-block mb-3">FALSE START</div>
            <p className="text-xs text-gray-500 mb-4">必须等待发令枪响（变绿）</p>
            <Button variant="danger" onClick={(e) => { e.stopPropagation(); setStatus('idle'); }} className="text-xs h-8">
                 <RotateCcw size={14} className="mr-1"/> 重新开始
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ReactionTimer;