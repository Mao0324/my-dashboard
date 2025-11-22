import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, limit, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';
import { Sun, Settings, Info, LogOut, LogIn } from 'lucide-react';

// 引入拆分后的组件
import Dashboard from './components/Dashboard';
import SettingsPage from './components/SettingsPage';
import AuthModal from './components/AuthModal';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';

// --- Firebase 配置 ---
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

// --- About Page 简单组件 ---
const AboutPage = () => (
  <div className="max-w-2xl mx-auto animate-fade-in">
    <Card>
      <h1 className="text-3xl font-bold text-gray-800 mb-4">关于本站</h1>
      <div className="prose text-gray-600 space-y-4">
        <p>这是一个基于 <strong>React + Firebase</strong> 的个人智能仪表盘。</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>集成番茄钟、天气预报、倒数日管理。</li>
          <li>支持每日一言与实时公告栏。</li>
          <li>GitHub Actions 每日自动推送天气提醒。</li>
        </ul>
      </div>
    </Card>
  </div>
);

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [weather, setWeather] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [bgImage, setBgImage] = useState("");

  // 默认设置
  const [settings, setSettings] = useState({
    city: "Beijing",
    latitude: 39.9042,
    longitude: 116.4074,
    tempHighThreshold: 30,
    tempLowThreshold: 10,
    emailAlerts: true,
    emailAddress: "",
    events: [{ name: "新年", date: "2025-01-01" }]
  });

  // 初始化背景和 Firebase 监听
  useEffect(() => {
    setBgImage(`https://picsum.photos/1920/1080?random=${Date.now()}`);
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) fetchUserSettings(currentUser.uid);
    });
    return () => unsubscribe();
  }, []);

  // 监听公告
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setAnnouncements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // 获取天气
  useEffect(() => {
    const fetchWeather = async () => {
      let { latitude: lat, longitude: lon } = settings;
      if (!lat || !lon) { lat = 39.9042; lon = 116.4074; } // 默认北京
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`);
        setWeather(await res.json());
      } catch (e) { console.error("天气获取失败", e); }
    };
    fetchWeather();
  }, [settings.city, settings.latitude, settings.longitude]);

  // --- Handlers ---
  const handleGoogleLogin = async () => {
    if (!auth) return;
    try { await signInWithPopup(auth, new GoogleAuthProvider()); setShowAuthModal(false); } 
    catch (error) { console.error("Google 登录失败", error); }
  };

  const handleLogout = () => auth && signOut(auth);

  const postAnnouncement = async () => {
    if (!newAnnouncement.trim() || !db) return;
    try {
      await addDoc(collection(db, "announcements"), {
        text: newAnnouncement,
        author: user.displayName || user.email.split('@')[0],
        uid: user.uid,
        createdAt: new Date()
      });
      setNewAnnouncement("");
    } catch (e) { alert("发布失败: " + e.message); }
  };

  const deleteAnnouncement = async (id) => db && deleteDoc(doc(db, "announcements", id));

  const fetchUserSettings = async (uid) => {
    if (!db) return;
    const docSnap = await getDoc(doc(db, "users", uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      // 兼容旧数据
      if (!data.events && data.targetDate) data.events = [{ name: data.targetName || "目标日", date: data.targetDate }];
      setSettings(prev => ({ ...prev, ...data }));
    }
  };

  const saveSettings = async () => {
    if (!user || !db) return;
    setLoadingSettings(true);
    try {
      await setDoc(doc(db, "users", user.uid), { ...settings, updatedAt: new Date() });
      alert("设置已保存！");
    } catch (e) { alert("保存失败: " + e.message); } 
    finally { setLoadingSettings(false); }
  };

  return (
    <div className="min-h-screen text-gray-800 font-sans selection:bg-blue-200 bg-cover bg-center bg-fixed transition-all duration-1000"
      style={{ backgroundImage: `url(${bgImage})`, backgroundColor: '#f3f4f6' }}>
      
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} onGoogleLogin={handleGoogleLogin} auth={auth} />

      <div className="min-h-screen bg-black/10 backdrop-blur-[2px] overflow-y-auto">
        {/* 导航栏 */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-white/20 px-4 py-3 shadow-sm">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <div className="flex items-center gap-2 font-bold text-xl text-blue-600 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
              <div className="p-2 bg-blue-100 rounded-lg"><Sun size={20} className="text-blue-600" /></div>
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
                    activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
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
                  <img src={user.photoURL || "https://api.dicebear.com/7.x/avataaars/svg?seed=User"} alt="Avatar" className="w-8 h-8 rounded-full border border-gray-200 shadow-sm bg-white"/>
                  <Button variant="ghost" onClick={handleLogout} className="!px-2 bg-white/50 hover:bg-white"><LogOut size={18} /></Button>
                </div>
              ) : (
                <Button onClick={() => setShowAuthModal(true)} variant="primary" className="text-sm shadow-lg"><LogIn size={16} /> 登录</Button>
              )}
            </div>
          </div>
          
          {/* 移动端导航 */}
          <div className="md:hidden flex justify-around mt-3 pt-2 border-t border-gray-100">
            {[{ id: 'dashboard', label: '概览' }, { id: 'settings', label: '设置' }, { id: 'about', label: '关于' }].map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`text-sm font-medium ${activeTab === tab.id ? 'text-blue-600' : 'text-gray-500'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4 mb-10">
          {activeTab === 'dashboard' && <Dashboard 
            weather={weather} settings={settings} announcements={announcements}
            user={user} onDelete={deleteAnnouncement} onPost={postAnnouncement}
            newAnnouncement={newAnnouncement} setNewAnnouncement={setNewAnnouncement}
            onOpenAuth={() => setShowAuthModal(true)}
          />}
          {activeTab === 'settings' && <SettingsPage 
            user={user} onOpenAuth={() => setShowAuthModal(true)}
            settings={settings} setSettings={setSettings}
            onSave={saveSettings} loading={loadingSettings}
          />}
          {activeTab === 'about' && <AboutPage />}
        </main>
      </div>
    </div>
  );
}