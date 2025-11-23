import React, { useState } from 'react';
import { Play, Pause, RotateCcw, Coffee, Briefcase, Settings2, Save, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

// 这是一个受控组件，状态由父组件 (App -> Dashboard) 传入
const Pomodoro = ({ state, setState, userEmail }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: state.eventName,
    focus: state.focusDuration,
    break: state.breakDuration
  });

  const toggleTimer = () => {
    setState(prev => ({ ...prev, isActive: !prev.isActive }));
  };

  const resetTimer = (newMode = state.mode) => {
    const duration = newMode === 'focus' ? state.focusDuration : state.breakDuration;
    setState(prev => ({
      ...prev,
      isActive: false,
      mode: newMode,
      timeLeft: duration * 60
    }));
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveSettings = () => {
    const newFocus = parseInt(editForm.focus) || 25;
    const newBreak = parseInt(editForm.break) || 5;
    const newName = editForm.name || "未命名任务";

    setState(prev => ({
      ...prev,
      eventName: newName,
      focusDuration: newFocus,
      breakDuration: newBreak,
      // 如果当前没有在运行，且当前模式对应的时长变了，重置时间
      timeLeft: (!prev.isActive && prev.mode === 'focus') ? newFocus * 60 : 
                (!prev.isActive && prev.mode === 'break') ? newBreak * 60 : prev.timeLeft
    }));
    setIsEditing(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (isEditing) {
    return (
      <Card className="bg-white border border-gray-200">
        <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-2">
          <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Settings2 size={18} /> 设置番茄钟
          </h3>
          <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">任务名称</label>
            <input 
              type="text" 
              name="name"
              value={editForm.name} 
              onChange={handleEditChange}
              className="w-full p-2 text-sm border rounded-lg bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">专注 (分钟)</label>
              <input 
                type="number" 
                name="focus"
                min="1" max="120"
                value={editForm.focus} 
                onChange={handleEditChange}
                className="w-full p-2 text-sm border rounded-lg bg-gray-50 focus:bg-white outline-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">休息 (分钟)</label>
              <input 
                type="number" 
                name="break"
                min="1" max="60"
                value={editForm.break} 
                onChange={handleEditChange}
                className="w-full p-2 text-sm border rounded-lg bg-gray-50 focus:bg-white outline-none"
              />
            </div>
          </div>
          
          {userEmail && (
            <div className="text-[10px] text-gray-400 mt-2">
              * 计时结束将发送通知邮件至 {userEmail}
            </div>
          )}

          <Button onClick={saveSettings} className="w-full mt-2 justify-center text-sm">
            保存配置 <Save size={16} />
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className={`transition-colors duration-500 border-none relative overflow-hidden ${state.mode === 'focus' ? 'bg-gradient-to-br from-orange-400 to-red-500' : 'bg-gradient-to-br from-teal-400 to-emerald-500'} text-white`}>
      {/* 顶部栏 */}
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div>
          <h3 className="text-white/90 font-medium flex items-center gap-2">
            {state.mode === 'focus' ? <Briefcase size={18} /> : <Coffee size={18} />}
            {state.eventName}
          </h3>
          <p className="text-[10px] text-white/70 mt-0.5">
            {state.mode === 'focus' ? `专注 ${state.focusDuration} 分钟` : `休息 ${state.breakDuration} 分钟`}
          </p>
        </div>
        
        <div className="flex gap-2">
             <button 
                onClick={() => {
                  setEditForm({ name: state.eventName, focus: state.focusDuration, break: state.breakDuration });
                  setIsEditing(true);
                }}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-colors"
                title="设置"
              >
                <Settings2 size={14} />
              </button>
        </div>
      </div>
      
      {/* 时间显示 */}
      <div className="text-center mb-6 relative z-10">
        <div className="text-6xl font-bold tracking-wider font-mono drop-shadow-sm">
          {formatTime(state.timeLeft)}
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="flex justify-center items-center gap-6 relative z-10">
        {/* 修复说明：
            1. 增加 w-16 h-16 尺寸，使按钮更大更易点击。
            2. 使用 !text-orange-500 / !text-teal-500 强制覆盖 Button 组件默认的 text-white，
               解决“白色背景+白色文字”导致的图标不可见问题。
        */}
        <Button 
          onClick={toggleTimer} 
          className={`bg-white hover:bg-gray-50 border-none w-16 h-16 !p-0 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${state.mode === 'focus' ? '!text-orange-500' : '!text-teal-500'}`}
        >
          {state.isActive ? <Pause fill="currentColor" size={28} /> : <Play fill="currentColor" className="ml-1" size={28} />}
        </Button>
        
        <div className="flex gap-2 bg-black/20 rounded-2xl p-1.5 backdrop-blur-sm">
             <button 
                onClick={() => resetTimer('focus')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${state.mode === 'focus' ? 'bg-white text-orange-500 shadow-sm' : 'text-white/70 hover:bg-white/10'}`}
                title="切换到专注"
             >
                <Briefcase size={18} />
             </button>
             <button 
                onClick={() => resetTimer('break')}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${state.mode === 'break' ? 'bg-white text-teal-500 shadow-sm' : 'text-white/70 hover:bg-white/10'}`}
                title="切换到休息"
             >
                <Coffee size={18} />
             </button>
             <button 
               onClick={() => resetTimer(state.mode)} 
               className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:bg-white/10 hover:text-white transition-colors"
               title="重置当前计时"
             >
              <RotateCcw size={18} />
            </button>
        </div>
      </div>

      {/* 装饰圆环 */}
      <div className="absolute -bottom-12 -left-12 w-40 h-40 border-4 border-white/10 rounded-full blur-sm"></div>
      <div className="absolute top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
    </Card>
  );
};

export default Pomodoro;