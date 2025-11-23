import React from 'react';
import { CloudRain, MapPin, Calendar, Bell, Trash2, Plus } from "lucide-react";
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import Pomodoro from './Pomodoro';
import DailyQuote from './DailyQuote';

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
  pomoState, // 接收 App 传下来的状态
  setPomoState // 接收 App 传下来的 setter
}) => {
  
  const calculateDaysLeft = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      
      {/* ---kv 左侧列：工具类 --- */}
      <div className="space-y-6">
        {/* 天气卡片 */}
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-blue-100 font-medium flex items-center gap-2">
                <CloudRain size={18} /> 今日天气
              </h3>
              <p className="text-xs text-blue-200 mt-1 flex items-center gap-1">
                <MapPin size={12}/> {settings.city}
              </p>
            </div>
            <div className="text-4xl font-bold">
              {weather ? Math.round(weather.current.temperature_2m) : "--"}°
            </div>
          </div>
          <div className="mt-6 flex justify-between text-sm text-blue-100">
            <span>最高: {weather ? weather.daily.temperature_2m_max[0] : "--"}°</span>
            <span>最低: {weather ? weather.daily.temperature_2m_min[0] : "--"}°</span>
          </div>
        </Card>

        {/* 番茄钟：现在是受控组件，状态由 App 管理 */}
        <Pomodoro 
           state={pomoState} 
           setState={setPomoState}
           userEmail={settings.emailAddress} // 用于提示用户将发送邮件到哪里
        />
      </div>

      {/* --- 中间列：信息类 --- */}
      <div className="space-y-6">
         {/* 新增：每日一言 */}
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