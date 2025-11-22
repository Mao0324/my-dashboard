import React, { useState } from 'react';
import { Settings, Info, Save, Calendar, Thermometer, X } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

// 城市数据 (和原来保持一致，或者提取到单独的常量文件)
const CITIES = [
  { name: "北京 (Beijing)", value: "Beijing", lat: 39.9042, lon: 116.4074 },
  { name: "上海 (Shanghai)", value: "Shanghai", lat: 31.2304, lon: 121.4737 },
  { name: "广州 (Guangzhou)", value: "Guangzhou", lat: 23.1291, lon: 113.2644 },
  { name: "深圳 (Shenzhen)", value: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  { name: "杭州 (Hangzhou)", value: "Hangzhou", lat: 30.2748, lon: 120.1551 },
  // ... 其他城市 ...
];

const SettingsPage = ({ user, onOpenAuth, settings, setSettings, onSave, loading }) => {
  const [tempEvent, setTempEvent] = useState({ name: "", date: "" });

  const handleAddEvent = () => {
    if (!tempEvent.name || !tempEvent.date) return;
    const newEvents = [...(settings.events || []), tempEvent];
    setSettings({ ...settings, events: newEvents });
    setTempEvent({ name: "", date: "" });
  };

  const handleDeleteEvent = (index) => {
    const newEvents = settings.events.filter((_, i) => i !== index);
    setSettings({ ...settings, events: newEvents });
  };

  const handleCityChange = (e) => {
    const selectedCity = CITIES.find(c => c.value === e.target.value);
    if (selectedCity) {
      setSettings({
        ...settings, 
        city: selectedCity.value,
        latitude: selectedCity.lat,
        longitude: selectedCity.lon
      });
    }
  };

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <Card>
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Settings className="text-blue-500" /> 自动化设置
        </h2>
        
        {!user ? (
           <div className="text-center py-10">
             <p className="text-gray-500 mb-4">请先登录以同步您的偏好设置到云端。</p>
             <Button onClick={onOpenAuth} className="mx-auto">立即登录</Button>
           </div>
        ) : (
          <div className="space-y-8">
            {/* ... 设置表单内容保持原样，只需将原来的 <button> 替换为 <Button> ... */}
            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 flex gap-2">
              <Info className="shrink-0" size={18} />
              此处保存的设置将用于 GitHub Actions 每日邮件推送。
            </div>

            {/* 城市与邮箱 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">所在城市</label>
                <div className="relative">
                  <select 
                    value={settings.city}
                    onChange={handleCityChange}
                    className="w-full p-2 pl-3 pr-8 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white"
                  >
                    {CITIES.map(city => (
                      <option key={city.value} value={city.value}>{city.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接收邮箱</label>
                <input 
                  type="email" 
                  value={settings.emailAddress}
                  onChange={(e) => setSettings({...settings, emailAddress: e.target.value})}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
            
            {/* ... 其他设置部分省略，逻辑与原 App.jsx 相同 ... */}
            {/* 倒数日设置 */}
            <div className="space-y-4 border-t border-gray-100 pt-4">
              <h3 className="font-medium text-gray-900 flex items-center gap-2">
                <Calendar size={18} /> 倒数日事件管理
              </h3>
              
              <div className="space-y-2 mb-4">
                {settings.events && settings.events.map((event, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <span className="font-medium text-gray-800">{event.name}</span>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="text-sm text-gray-500">{event.date}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteEvent(idx)}
                      className="text-gray-400 hover:text-red-500 p-1"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-gray-50 p-3 rounded-xl">
                 <div className="md:col-span-2">
                    <input 
                      type="text" 
                      placeholder="事件名称"
                      value={tempEvent.name}
                      onChange={(e) => setTempEvent({...tempEvent, name: e.target.value})}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <input 
                      type="date" 
                      value={tempEvent.date}
                      onChange={(e) => setTempEvent({...tempEvent, date: e.target.value})}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm"
                    />
                 </div>
                 <div className="md:col-span-1">
                   <Button onClick={handleAddEvent} variant="secondary" className="w-full h-full" disabled={!tempEvent.name || !tempEvent.date}>
                     添加
                   </Button>
                 </div>
              </div>
            </div>

            <div className="pt-4">
              <Button onClick={onSave} disabled={loading} className="w-full justify-center h-12 text-lg">
                {loading ? "保存中..." : "保存所有设置"} <Save size={20} />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default SettingsPage;