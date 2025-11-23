import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Zap } from 'lucide-react';
import { Card } from './ui/Card';

// ==========================================
// 1. 事件相机鼠标流特效 (Event Stream Cursor)
// ==========================================
export const EventStreamCursor = () => {
  const canvasRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const particles = useRef([]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    lastPos.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    class EventPixel {
      constructor(x, y, polarity) {
        this.x = x;
        this.y = y;
        this.polarity = polarity; 
        this.life = 1.0;
        this.size = Math.random() * 3 + 2;
      }

      update() {
        this.life -= 0.04;
      }

      draw(ctx) {
        ctx.fillStyle = this.polarity > 0 
          ? `rgba(74, 222, 128, ${this.life})` // Green
          : `rgba(248, 113, 113, ${this.life})`; // Red
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    const handleMouseMove = (e) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      const dx = currentX - lastPos.current.x;
      const dy = currentY - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 4) {
        const steps = Math.min(Math.floor(dist / 4), 20); 
        for (let i = 0; i < steps; i++) {
          const x = lastPos.current.x + (dx / steps) * i + (Math.random() - 0.5) * 10;
          const y = lastPos.current.y + (dy / steps) * i + (Math.random() - 0.5) * 10;
          const polarity = Math.random() > 0.5 ? 1 : -1;
          particles.current.push(new EventPixel(x, y, polarity));
        }
      }
      lastPos.current = { x: currentX, y: currentY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const render = () => {
      if (!canvas) return;
      
      // 关键修复：清除整个画布，确保背景透明，防止白屏遮挡
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < particles.current.length; i++) {
        const p = particles.current[i];
        p.update();
        p.draw(ctx);
        if (p.life <= 0) {
          particles.current.splice(i, 1);
          i--;
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <canvas 
      ref={canvasRef} 
      style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        pointerEvents: 'none', // 关键：允许鼠标穿透画布点击下方内容
        zIndex: 9999,
        background: 'transparent' // 关键：透明背景
      }}
    />,
    document.body
  );
};

// ==========================================
// 2. LIF 神经元交互卡片 (LIF Neuron Widget)
// ==========================================
export const LIFNeuronCard = () => {
  const [potential, setPotential] = useState(0);
  const [spikeCount, setSpikeCount] = useState(0);
  const [isSpiking, setIsSpiking] = useState(false);
  
  const canvasRef = useRef(null);
  const historyRef = useRef(new Array(60).fill(0)); 
  const animationRef = useRef();

  const V_th = 100; 
  const V_rest = 0; 
  const decay = 0.95; 
  const currentPot = useRef(0); 

  const injectCurrent = (amount) => {
    currentPot.current += amount;
    if (currentPot.current > V_th + 20) currentPot.current = V_th + 20;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const dpr = window.devicePixelRatio || 1;
    // 简单的尺寸初始化
    const width = canvas.clientWidth || 300;
    const height = canvas.clientHeight || 100;
    
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      // 物理模拟
      if (currentPot.current >= V_th) {
        setIsSpiking(true);
        setSpikeCount(prev => prev + 1);
        currentPot.current = V_rest; 
        historyRef.current.push(V_th + 50); 
        setTimeout(() => setIsSpiking(false), 100);
      } else {
        currentPot.current = currentPot.current * decay;
        historyRef.current.push(currentPot.current);
      }

      if (historyRef.current.length > 60) {
        historyRef.current.shift();
      }

      if (Math.random() > 0.8) {
        setPotential(currentPot.current);
      }

      // 绘图
      ctx.clearRect(0, 0, width, height);
      
      // 阈值线
      const thY = height - (V_th / 150) * height;
      ctx.beginPath();
      ctx.strokeStyle = '#9ca3af'; 
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, thY);
      ctx.lineTo(width, thY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 曲线
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSpiking ? '#ef4444' : '#3b82f6';
      
      const stepX = width / 60;
      for (let i = 0; i < historyRef.current.length; i++) {
        const x = i * stepX;
        const val = historyRef.current[i];
        const y = height - (val / 150) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <Card className="relative overflow-hidden group border border-blue-100">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
          <Activity size={18} className="text-blue-500" /> 
          LIF 神经元仿真
        </h3>
        <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
          Spikes: {spikeCount}
        </span>
      </div>

      <div className="relative h-24 bg-gray-50 rounded-lg border border-gray-200 mb-3 overflow-hidden">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
        />
        {isSpiking && (
          <div className="absolute inset-0 bg-red-500/10 pointer-events-none flex items-center justify-center">
            <span className="text-red-500 font-bold font-mono text-xl animate-ping">SPIKE!</span>
          </div>
        )}
      </div>

      <div className="flex justify-between items-end">
        <div>
          {/* 修复点：使用字符串包裹特殊字符，防止 JSX 错误解析 */}
          <div className="text-xs text-gray-400 mb-1">{'Membrane Potential ($V_{mem}$)'}</div>
          <div className="text-2xl font-mono font-bold text-blue-600">
            {potential.toFixed(1)} <span className="text-sm text-gray-400">mV</span>
          </div>
        </div>

        <button 
          onClick={() => injectCurrent(30)}
          className="active:scale-95 transition-transform bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg shadow-blue-200"
          title="注入脉冲电流"
        >
          <Zap size={20} fill="currentColor" />
        </button>
      </div>
    </Card>
  );
};