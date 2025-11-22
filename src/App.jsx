import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  limit,
  doc,
  setDoc,
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Sun, 
  CloudRain, 
  Calendar, 
  Bell, 
  Info, 
  LogOut, 
  LogIn, 
  Plus, 
  Trash2,
  Settings,
  Thermometer,
  Save,
  X,
  MapPin
} from 'lucide-react';

// --- 城市数据配置 ---
const CITIES = [
  { name: "北京 (Beijing)", value: "Beijing", lat: 39.9042, lon: 116.4074 },
  { name: "上海 (Shanghai)", value: "Shanghai", lat: 31.2304, lon: 121.4737 },
  { name: "广州 (Guangzhou)", value: "Guangzhou", lat: 23.1291, lon: 113.2644 },
  { name: "深圳 (Shenzhen)", value: "Shenzhen", lat: 22.5431, lon: 114.0579 },
  { name: "杭州 (Hangzhou)", value: "Hangzhou", lat: 30.2748, lon: 120.1551 },
  { name: "成都 (Chengdu)", value: "Chengdu", lat: 30.5728, lon: 104.0668 },
  { name: "武汉 (Wuhan)", value: "Wuhan", lat: 30.5928, lon: 114.3055 },
  { name: "西安 (Xi'an)", value: "Xian", lat: 34.3416, lon: 108.9398 },
  { name: "南京 (Nanjing)", value: "Nanjing", lat: 32.0603, lon: 118.7969 },
  { name: "重庆 (Chongqing)", value: "Chongqing", lat: 29.5628, lon: 106.5528 },
  { name: "香港 (Hong Kong)", value: "HongKong", lat: 22.3193, lon: 114.1694 },
  { name: "台北 (Taipei)", value: "Taipei", lat: 25.0330, lon: 121.5654 },
  { name: "伦敦 (London)", value: "London", lat: 51.5074, lon: -0.1278 },
  { name: "纽约 (New York)", value: "NewYork", lat: 40.7128, lon: -74.0060 },
  { name: "东京 (Tokyo)", value: "Tokyo", lat: 35.6762, lon: 139.6503 },
];

// --- 配置部分 ---
const firebaseConfig = {
  apiKey: "AIzaSyDkRBknBGFNGZ-QLWKvbPf9nJZy2dxN45I",
  authDomain: "my-dashboard-c434c.firebaseapp.com",
  projectId: "my-dashboard-c434c",
  storageBucket: "my-dashboard-c434c.firebasestorage.app",
  messagingSenderId: "183916835818",
  appId: "1:183916835818:web:8eeefa146fe87e44a27893"
};

// --- 初始化 Firebase ---
let auth, db;
try {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.warn("Firebase 初始化失败");
}

// --- 辅助组件 ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white/80 backdrop-blur-md rounded-2xl shadow-lg border border-white/20 p-6 ${className}`}>
    {children}
  </div>
);

const Button = ({ onClick, children, variant = "primary", className = "", disabled = false }) => {
  const baseStyle = "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center gap-2 active:scale-95 justify-center";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200 shadow-md",
    secondary: "bg-gray-100 text-gray-700 hover:bg-gray-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    ghost: "hover:bg-gray-100 text-gray-600",
    icon: "p-2 bg-transparent hover:bg-gray-100 text-gray-500 rounded-full"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

// --- 子页面组件 ---

const Dashboard = ({ weather, settings, announcements, user, onDelete, onPost, newAnnouncement, setNewAnnouncement,onLogin }) => {
  // 计算倒数日函数
  const calculateDaysLeft = (dateStr) => {
    if (!dateStr) return 0;
    const diff = new Date(dateStr) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
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

        {/* 倒数日卡片列表 - 支持多个 */}
        {settings.events && settings.events.length > 0 ? (
          settings.events.map((event, index) => (
            <Card key={index} className="bg-gradient-to-br from-purple-500 to-pink-600 text-white border-none relative overflow-hidden group">
              <div className="flex justify-between items-center relative z-10">
                <h3 className="text-purple-100 font-medium flex items-center gap-2">
                  <Calendar size={18} /> {event.name}
                </h3>
                <span className="text-xs bg-white/20 px-2 py-1 rounded text-white">
                  {event.date}
                </span>
              </div>
              <div className="mt-4 text-center relative z-10">
                <span className="text-5xl font-bold">{calculateDaysLeft(event.date)}</span>
                <span className="ml-2 text-purple-200">天</span>
              </div>
            </Card>
          ))
        ) : (
          <Card className="bg-white text-gray-400 border-dashed border-2 flex flex-col items-center justify-center py-8">
             <Calendar size={32} className="mb-2 opacity-50"/>
             <p>暂无倒数日</p>
             <p className="text-xs">请前往设置添加</p>
          </Card>
        )}
      </div>

      {/* 公告栏 (保持不变) */}
      <div className="md:col-span-2">
        <Card className="h-full flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Bell className="text-blue-500" /> 公告栏
            </h2>
            {user && (
              <span className="text-xs text-gray-400">作为 {user.displayName} 登录</span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 min-h-[300px] max-h-[500px]">
            {announcements.map((ann) => (
              <div key={ann.id} className="group p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colorsRv border border-gray-100">
                <div className="flex justify-between items-start">
                  <p className="text-gray-700 whitespace-pre-wrap break-words">{ann.text}</p>
                  {user && ann.uid === user.uid && (
                    <button 
                      onClick={() => onDelete(ann.id)}
                      className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity ml-2"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-xs text-gray-400">
                    {ann.createdAt?.seconds ? new Date(ann.createdAt.seconds * 1000).toLocaleDateString() : '刚刚'}
                  </span>
                  {ann.author && <span className="text-xs font-medium text-blue-500">@{ann.author}</span>}
                </div>
              </div>
            ))}
            {announcements.length === 0 && (
              <div className="text-center text-gray-400 py-10">暂无公告</div>
            )}
          </div>

          {user ? (
            <div className="mt-6 pt-4 border-t border-gray-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newAnnouncement}
                  onChange={(e) => setNewAnnouncement(e.target.value)}
                  placeholder="发布新动态..."
                  className="flex-1 bg-gray-100 border-none rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && onPost()}
                />
                <Button onClick={onPost}>
                  <Plus size={20} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 pt-4 border-t border-gray-100 text-center">
              <Button variant="secondary" onClick={onLogin} className="w-full justify-center">
                登录以发布公告
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

const SettingsPage = ({ user, onLogin, settings, setSettings, onSave, loading }) => {
  const [tempEvent, setTempEvent] = useState({ name: "", date: "" });

  // 添加新事件
  const handleAddEvent = () => {
    if (!tempEvent.name || !tempEvent.date) return;
    const newEvents = [...(settings.events || []), tempEvent];
    setSettings({ ...settings, events: newEvents });
    setTempEvent({ name: "", date: "" });
  };

  // 删除事件
  const handleDeleteEvent = (index) => {
    const newEvents = settings.events.filter((_, i) => i !== index);
    setSettings({ ...settings, events: newEvents });
  };

  // 处理城市变更
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
           <Button onClick={onLogin} className="mx-auto">立即登录</Button>
         </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-700 flex gap-2">
            <Info className="shrink-0" size={18} />
            此处保存的设置将用于 GitHub Actions 每日邮件推送。
          </div>

          {/* 基本信息 */}
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
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  ▼
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-1">这将决定首页显示的天气区域</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">接收邮箱</label>
              <input 
                type="email" 
                value={settings.emailAddress}
                placeholder="example@gmail.com"
                onChange={(e) => setSettings({...settings, emailAddress: e.target.value})}
                className="w-full p-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          {/* 阈值设置 */}
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Thermometer size={18} /> 温度预警阈值
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div>
                  <label className="block text-sm text-gray-600 mb-1">高温提醒 (&gt; X°C)</label>
                  <input 
                    type="number" 
                    value={settings.tempHighThreshold}
                    onChange={(e) => setSettings({...settings, tempHighThreshold: parseInt(e.target.value) || 0})}
                    className="w-full p-2 rounded-lg border border-gray-300"
                  />
               </div>
               <div>
                  <label className="block text-sm text-gray-600 mb-1">低温提醒 (&lt; X°C)</label>
                  <input 
                    type="number" 
                    value={settings.tempLowThreshold}
                    onChange={(e) => setSettings({...settings, tempLowThreshold: parseInt(e.target.value) || 0})}
                    className="w-full p-2 rounded-lg border border-gray-300"
                  />
               </div>
            </div>
          </div>

           {/* 多倒数日设置 */}
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
              {(!settings.events || settings.events.length === 0) && (
                <div className="text-sm text-gray-400 text-center py-2">暂无事件，请添加</div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 bg-gray-50 p-3 rounded-xl">
               <div className="md:col-span-2">
                  <input 
                    type="text" 
                    placeholder="事件名称 (如: 新年)"
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

const AboutPage = () => (
  <div className="max-w-2xl mx-auto animate-fade-in">
    <Card>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">关于本站</h1>
      <div className="prose text-gray-600 space-y-4">
        <p>
          这是一个基于 <strong>React + Firebase + GitHub Pages</strong> 构建的个人智能仪表盘。
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>前端使用 React 构建，界面采用 Tailwind CSS 设计。</li>
          <li>数据存储在 Google Firebase (Firestore) 中，实现实时同步。</li>
          <li>
            <strong>GitHub Actions 自动化：</strong> 
            后台每天会自动运行脚本，读取你的设置。如果明天气温超过你在设置页面设定的阈值，或者距离倒数日还有3天，系统会自动向你的邮箱发送提醒。
          </li>
        </ul>
      </div>
    </Card>
  </div>
);

// --- 主应用组件 ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [weather, setWeather] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  
  // 默认设置
  const [settings, setSettings] = useState({
    city: "Beijing",
    latitude: 39.9042,
    longitude: 116.4074,
    tempHighThreshold: 30,
    tempLowThreshold: 10,
    emailAlerts: true,
    emailAddress: "",
    events: [
      { name: "新年", date: "2025-01-01" }
    ]
  });
  
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [bgImage, setBgImage] = useState("");

  // 1. 初始化随机背景 (使用 picsum 提供的随机风景图)
  useEffect(() => {
    // 使用时间戳防止缓存，获取一张 1920x1080 的自然风景图
    const randomBg = `https://picsum.photos/1920/1080?random=${Date.now()}`;
    setBgImage(randomBg);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchUserSettings(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(posts);
    }, (error) => {
      // Fallback content
      setAnnouncements([
        { id: 1, text: "欢迎来到你的个人仪表盘！请配置 Firebase 以启用实时功能。", createdAt: { seconds: Date.now() / 1000 } }
      ]);
    });
    return () => unsubscribe();
  }, []);

  // 2. 根据设置的经纬度获取天气
  useEffect(() => {
    const fetchWeather = async () => {
      const { latitude, longitude } = settings;
      // 如果设置里没有经纬度（旧数据），尝试从CITIES查找默认值
      let lat = latitude;
      let lon = longitude;
      
      if (!lat || !lon) {
        const cityObj = CITIES.find(c => c.value === settings.city) || CITIES[0];
        lat = cityObj.lat;
        lon = cityObj.lon;
      }

      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        const data = await res.json();
        setWeather(data);
      } catch (e) {
        console.error("天气获取失败", e);
      }
    };
    fetchWeather();
  }, [settings.city, settings.latitude, settings.longitude]);

  const handleLogin = async () => {
    if (!auth) { alert("请先在代码中配置 Firebase!"); return; }
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("登录失败", error);
    }
  };

  const handleLogout = () => auth && signOut(auth);

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim() || !db) return;
    try {
      await addDoc(collection(db, "announcements"), {
        text: newAnnouncement,
        author: user.displayName,
        uid: user.uid,
        createdAt: new Date()
      });
      setNewAnnouncement("");
    } catch (e) {
      alert("发布失败: " + e.message);
    }
  };

  const deleteAnnouncement = async (id) => {
    if (!db) return;
    try {
      await deleteDoc(doc(db, "announcements", id));
    } catch (e) {
      console.error("删除失败", e);
    }
  };

  const fetchUserSettings = async (uid) => {
    if (!db) return;
    try {
      const docRef = doc(db, "users", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        // 兼容旧数据格式：如果 events 不存在但有 targetDate，转换一下
        if (!data.events && data.targetDate) {
            data.events = [{ name: data.targetName || "目标日", date: data.targetDate }];
        }
        setSettings({ ...settings, ...data });
      }
    } catch (e) {
      console.error("获取设置失败", e);
    }
  };

  const saveSettings = async () => {
    if (!user || !db) return;
    setLoadingSettings(true);
    try {
      await setDoc(doc(db, "users", user.uid), {
        ...settings,
        updatedAt: new Date()
      });
      alert("设置已保存！");
    } catch (e) {
      alert("保存失败: " + e.message);
    } finally {
      setLoadingSettings(false);
    }
  };

  return (
    <div 
      className="min-h-screen text-gray-800 font-sans selection:bg-blue-200 bg-cover bg-center bg-fixed transition-all duration-1000"
      style={{ 
        backgroundImage: `url(${bgImage})`,
        backgroundColor: '#f3f4f6' // Fallback color
      }}
    >
      {/* 背景遮罩，确保文字可读性 */}
      <div className="min-h-screen bg-black/10 backdrop-blur-[2px] overflow-y-auto">
        
        {/* 顶部导航栏 */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-white/20 px-4 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-xl text-blue-600">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Sun size={20} className="text-blue-600" />
              </div>
              MySpace
            </div>

            <div className="hidden md:flex gap-1 bg-gray-100/80 p-1 rounded-xl backdrop-blur-sm">
              {[
                { id: 'dashboard', label: '概览', icon: Sun },
                { id: 'settings', label: '设置', icon: Settings },
                { id: 'about', label: '关于', icon: Info },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                    activeTab === tab.id 
                      ? 'bg-white text-blue-600 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>

            <div>
              {user ? (
                <div className="flex items-center gap-3">
                  <img 
                    src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} 
                    alt="Avatar" 
                    className="w-8 h-8 rounded-full border border-gray-200 shadow-sm"
                  />
                  <Button variant="ghost" onClick={handleLogout} className="!px-2 bg-white/50 hover:bg-white">
                    <LogOut size={18} />
                  </Button>
                </div>
              ) : (
                <Button onClick={handleLogin} variant="primary" className="text-sm shadow-lg">
                  <LogIn size={16} /> 登录
                </Button>
              )}
            </div>
          </div>
          
          {/* 移动端导航 */}
          <div className="md:hidden flex justify-around mt-3 pt-2 border-t border-gray-100">
            {[
                { id: 'dashboard', label: '概览' },
                { id: 'settings', label: '设置' },
                { id: 'about', label: '关于' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`text-sm font-medium ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}
                >
                  {tab.label}
                </button>
              ))}
          </div>
        </nav>

        {/* 页面内容 */}
        <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-10">
          {activeTab === 'dashboard' && <Dashboard 
            weather={weather} 
            settings={settings} 
            announcements={announcements}
            user={user}
            onDelete={deleteAnnouncement}
            onPost={postAnnouncement}
            newAnnouncement={newAnnouncement}
            setNewAnnouncement={setNewAnnouncement}
            onLogin={handleLogin}
          />}
          {activeTab === 'settings' && <SettingsPage 
            user={user}
            onLogin={handleLogin}
            settings={settings}
            setSettings={setSettings}
            onSave={saveSettings}
            loading={loadingSettings}
          />}
          {activeTab === 'about' && <AboutPage />}
        </main>
      </div>
    </div>
  );
}