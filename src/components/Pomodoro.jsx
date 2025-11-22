import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Briefcase } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

const Pomodoro = () => {
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [mode, setMode] = useState('focus'); // 'focus' | 'break'
  
  useEffect(() => {
    let interval = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      // 简单的浏览器通知
      if (Notification.permission === 'granted') {
        new Notification(mode === 'focus' ? "专注结束，休息一下！" : "休息结束，开始工作！");
      }
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft, mode]);

  // 申请通知权限
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = (newMode = mode) => {
    setIsActive(false);
    setMode(newMode);
    setTimeLeft(newMode === 'focus' ? 25 * 60 : 5 * 60);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="bg-gradient-to-br from-orange-400 to-red-500 text-white border-none">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-orange-50 font-medium flex items-center gap-2">
          {mode === 'focus' ? <Briefcase size={18} /> : <Coffee size={18} />}
          {mode === 'focus' ? '专注时刻' : '休息时间'}
        </h3>
        <div className="flex gap-1 bg-white/20 rounded-lg p-1">
          <button 
            onClick={() => resetTimer('focus')} 
            className={`p-1 rounded ${mode === 'focus' ? 'bg-white text-orange-500' : 'text-white hover:bg-white/10'}`}
            title="专注模式"
          >
            <Briefcase size={14} />
          </button>
          <button 
            onClick={() => resetTimer('break')} 
            className={`p-1 rounded ${mode === 'break' ? 'bg-white text-orange-500' : 'text-white hover:bg-white/10'}`}
            title="休息模式"
          >
            <Coffee size={14} />
          </button>
        </div>
      </div>
      
      <div className="text-center mb-6">
        <div className="text-5xl font-bold tracking-wider font-mono">
          {formatTime(timeLeft)}
        </div>
      </div>

      <div className="flex justify-center gap-4">
        <Button 
          onClick={toggleTimer} 
          className="bg-white text-orange-600 hover:bg-orange-50 border-none w-12 h-12 !p-0 rounded-full shadow-lg"
        >
          {isActive ? <Pause fill="currentColor" /> : <Play fill="currentColor" className="ml-1"/>}
        </Button>
        <Button 
          onClick={() => resetTimer(mode)} 
          className="bg-white/20 text-white hover:bg-white/30 border-none w-12 h-12 !p-0 rounded-full"
        >
          <RotateCcw size={20} />
        </Button>
      </div>
    </Card>
  );
};

export default Pomodoro;