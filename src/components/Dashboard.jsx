import React from 'react';
import { MapPin, Calendar, Bell, Trash2, Plus } from "lucide-react"; 
// 修复：显式添加 .jsx 后缀，确保构建工具能正确解析
import { Card } from './ui/Card.jsx'; 
import { Button } from './ui/Button.jsx'; 
import Pomodoro from './Pomodoro.jsx';
import DailyQuote from './DailyQuote.jsx';
import WeatherScene3D from './WeatherScene3D.jsx';
// 修复：显式添加 .jsx 后缀
import { EventStreamCursor, LIFNeuronCard } from './IdentityWidgets.jsx';

const Dashboard = ({ 
  weather, 
  settings, 
  announcements, 
  user, 
  onDelete, 
  onPost, 
  newAnnouncement, 
  setNewAnnouncement, 
  onOpenAuth,
  pomoState, 
  setPomoState 
}) => {
  
  const calculateDaysLeft = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in relative">
      
      {/* 1. 全局事件相机特效 */}
      <EventStreamCursor />

      {/* --- 左侧列：工具类 --- */}
      <div className="space-y-6">
        {/* 3D 天气场景 */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 overflow-hidden h-64 lg:h-72">
           <WeatherScene3D weather={weather} pomoState={pomoState} />
           <div className="absolute top-4 right-4 z-10 bg-black/20 backdrop-blur-sm px-2 py-1 rounded-lg text-white text-xs flex items-center gap-1">
             <MapPin size={10} /> {settings.city}
           </div>
        </div>

        {/* 番茄钟 */}
        <Pomodoro 
           state={pomoState} 
           setState={setPomoState}
           userEmail={settings.emailAddress} 
        />

        {/* 2. 新增：LIF 神经元监视器 */}
        <LIFNeuronCard />
      </div>

      {/* --- 中间列：信息类 --- */}
      <div className="space-y-6">
         {/* 每日一言 */}
         <DailyQuote />

        {/* 倒数日列表 */}
        <div className="space-y-4">
          {settings.events && settings.events.length > 0 ? (
            settings.events.map((event, index) => (
              <Card key={index} className="bg-white border-l-4 border-purple-500 relative overflow-hidden group hover:shadow-md transition-all py-4">
                <div className="flex justify-between items-center relative z-10">
                  <div>
                    <h3 className="text-gray-700 font-bold flex items-center gap-2">
                       {event.name}
                    </h3>
                    <span className="text-xs text-gray-400">
                      目标日: {event.date}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-purple-600">{calculateDaysLeft(event.date)}</span>
                    <span className="text-xs text-gray-400 ml-1">天</span>
                  </div>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-white text-gray-400 border-dashed border-2 flex flex-col items-center justify-center py-8">
               <Calendar size={32} className="mb-2 opacity-50"/>
               <p>暂无倒数日</p>
            </Card>
          )}
        </div>
      </div>

      {/* --- 右侧列：公告栏 --- */}
      <div className="lg:col-span-1">
        <Card className="h-full flex flex-col min-h-[400px]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Bell className="text-blue-500" /> 公告栏
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-2 max-h-[600px] custom-scrollbar">
            {announcements.map((ann) => (
              <div key={ann.id} className="group p-3 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100">
                <div className="flex justify-between items-start">
                  <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{ann.text}</p>
                  {user && ann.uid === user.uid && (
                    <button 
                      onClick={() => onDelete(ann.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-[10px] text-gray-400">
                    {ann.createdAt?.seconds ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString() : '刚刚'}
                  </span>
                  {ann.author && <span className="text-[10px] font-medium text-blue-500">@{ann.author}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            {user ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="发布新动态..."
                  className="flex-1 bg-gray-100 border-none rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && onPost()}
                />
                <Button onClick={onPost} className="!px-3">
                  <Plus size={18} />
                </Button>
              </div>
            ) : (
              <Button variant="secondary" onClick={onOpenAuth} className="w-full justify-center text-sm">
                登录以发布公告
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;