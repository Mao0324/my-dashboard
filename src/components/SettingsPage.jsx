import React, { useState } from 'react';
import { Settings, Info, Save, Calendar, Thermometer, X } from 'lucide-react';
import { Card } from './ui/Card.jsx';
import { Button } from './ui/Button.jsx';

// 扩充后的城市数据
const CITIES = [
  // --- 中国主要城市 ---
  { name: "北京 (Beijing)", value: "Beijing", lat: 39.9042, lon: 116.4074 },
  { name: "上海 (Shanghai)", value: "Shanghai", lat: 31.2304, lon: 121.4737 },
  { name: "广州 (Guangzhou)", value: "Guangzhou", lat: 23.1291, lon: 113.2644 },
  { name: "深圳 (Shenzhen)", value: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  { name: "杭州 (Hangzhou)", value: "Hangzhou", lat: 30.2748, lon: 120.1551 },
  { name: "成都 (Chengdu)", value: "Chengdu", lat: 30.5728, lon: 104.0668 },
  { name: "武汉 (Wuhan)", value: "Wuhan", lat: 30.5928, lon: 114.3055 },
  { name: "西安 (Xi'an)", value: "Xian", lat: 34.3416, lon: 108.9398 },
  { name: "南京 (Nanjing)", value: "Nanjing", lat: 32.0603, lon: 118.7969 },
  { name: "重庆 (Chongqing)", value: "Chongqing", lat: 29.5630, lon: 106.5516 },
  { name: "天津 (Tianjin)", value: "Tianjin", lat: 39.3434, lon: 117.3616 },
  { name: "苏州 (Suzhou)", value: "Suzhou", lat: 31.2989, lon: 120.5853 },
  { name: "香港 (Hong Kong)", value: "HongKong", lat: 22.3193, lon: 114.1694 },
  { name: "台北 (Taipei)", value: "Taipei", lat: 25.0330, lon: 121.5654 },
  
  // --- 国际大都市 ---
  { name: "东京 (Tokyo)", value: "Tokyo", lat: 35.6895, lon: 139.6917 },
  { name: "首尔 (Seoul)", value: "Seoul", lat: 37.5665, lon: 126.9780 },
  { name: "新加坡 (Singapore)", value: "Singapore", lat: 1.3521, lon: 103.8198 },
  { name: "曼谷 (Bangkok)", value: "Bangkok", lat: 13.7563, lon: 100.5018 },
  { name: "伦敦 (London)", value: "London", lat: 51.5074, lon: -0.1278 },
  { name: "巴黎 (Paris)", value: "Paris", lat: 48.8566, lon: 2.3522 },
  { name: "柏林 (Berlin)", value: "Berlin", lat: 52.5200, lon: 13.4050 },
  { name: "纽约 (New York)", value: "NewYork", lat: 40.7128, lon: -74.0060 },
  { name: "旧金山 (San Francisco)", value: "SanFrancisco", lat: 37.7749, lon: -122.4194 },
  { name: "洛杉矶 (Los Angeles)", value: "LosAngeles", lat: 34.0522, lon: -118.2437 },
  { name: "多伦多 (Toronto)", value: "Toronto", lat: 43.6532, lon: -79.3832 },
  { name: "悉尼 (Sydney)", value: "Sydney", lat: -33.8688, lon: 151.2093 },
  { name: "墨尔本 (Melbourne)", value: "Melbourne", lat: -37.8136, lon: 144.9631 },
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

  // 确保当前设置的城市在列表中显示，如果不在（比如旧数据），可以显示为自定义或添加到列表末尾
  const currentCityInList = CITIES.find(c => c.value === settings.city);

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
            <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 flex gap-2">
              <Info className="shrink-0" size={18} />
              此处保存的设置将用于 GitHub Actions 每日邮件推送和天气展示。
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
                    {!currentCityInList && settings.city && (
                       <option value={settings.city}>{settings.city} (自定义/旧数据)</option>
                    )}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">接收邮箱</label>
                <input 
                  type="email" 
                  value={settings.emailAddress}
                  onChange={(e) => setSettings({...settings, emailAddress: e.target.value})}
                  className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="your-email@example.com"
                />
              </div>
            </div>
            
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
                      className="text-gray-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
                {(!settings.events || settings.events.length === 0) && (
                    <div className="text-sm text-gray-400 text-center py-2">暂无事件</div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-gray-50 p-3 rounded-xl">
                 <div className="md:col-span-2">
                    <input 
                      type="text" 
                      placeholder="事件名称 (如: 考研)"
                      value={tempEvent.name}
                      onChange={(e) => setTempEvent({...tempEvent, name: e.target.value})}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
                    />
                 </div>
                 <div className="md:col-span-2">
                    <input 
                      type="date" 
                      value={tempEvent.date}
                      onChange={(e) => setTempEvent({...tempEvent, date: e.target.value})}
                      className="w-full p-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
                    />
                 </div>
                 <div className="md:col-span-1">
                   <Button onClick={handleAddEvent} variant="secondary" className="w-full h-full justify-center" disabled={!tempEvent.name || !tempEvent.date}>
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