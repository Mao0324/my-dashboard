import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { X, Info, User, Mail, Lock } from 'lucide-react';
import { Button } from './ui/Button';

// 需要从外部或者 props 传入 auth 对象，或者在这个文件里 import { getAuth } from 'firebase/auth' 并使用 app 实例
// 为了方便，这里假设 App.jsx 会把 auth 传进来
const AuthModal = ({ isOpen, onClose, onGoogleLogin, auth }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!auth) throw new Error("Firebase 未初始化");

      if (isRegister) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      onClose();
    } catch (err) {
      console.error("Auth Error:", err);
      let msg = "操作失败，请重试";
      if (err.code === 'auth/email-already-in-use') msg = "该邮箱已被注册";
      else if (err.code === 'auth/invalid-email') msg = "邮箱格式不正确";
      else if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') msg = "账号或密码错误";
      else if (err.code === 'auth/wrong-password') msg = "密码错误";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ... 返回 JSX (复制原 AuthModal 的 return 部分，记得使用 Button 组件) ...
  // 为节省篇幅，这里主要逻辑已列出，UI 部分直接复用原代码即可
  return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">{isRegister ? "创建账户" : "欢迎回来"}</h2>
                </div>
                <button onClick={onClose} className="text-white/80 hover:text-white"><X size={24}/></button>
            </div>
            <div className="p-8">
                {error && <div className="text-red-500 mb-4 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 输入框逻辑同上... */}
                    {isRegister && <input type="text" placeholder="昵称" className="w-full p-2 border rounded-xl" value={name} onChange={e=>setName(e.target.value)} required />}
                    <input type="email" placeholder="邮箱" className="w-full p-2 border rounded-xl" value={email} onChange={e=>setEmail(e.target.value)} required />
                    <input type="password" placeholder="密码" className="w-full p-2 border rounded-xl" value={password} onChange={e=>setPassword(e.target.value)} required />
                    <Button type="submit" className="w-full h-12" disabled={loading}>{loading ? "..." : (isRegister ? "注册" : "登录")}</Button>
                </form>
                <Button variant="secondary" onClick={onGoogleLogin} className="w-full mt-4">Google 登录</Button>
                <div className="text-center mt-4 text-sm">
                    <button onClick={() => setIsRegister(!isRegister)} className="text-blue-600 font-bold">
                        {isRegister ? "已有账号？去登录" : "没有账号？去注册"}
                    </button>
                </div>
            </div>
          </div>
      </div>
  )
};

export default AuthModal;