import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, Zap } from 'lucide-react';
// 修正引用路径，显式添加 .jsx 后缀以确保解析正确
import { Card } from './ui/Card.jsx';

// ==========================================
// 1. 事件相机鼠标流特效 (Event Stream Cursor)
// 模拟 DVS (Dynamic Vision Sensor) 的输出：
// 仅在发生变化（移动）时产生 ON(绿)/OFF(红) 事件
// ==========================================
export const EventStreamCursor = () => {
  const canvasRef = useRef(null);
  const lastPos = useRef({ x: 0, y: 0 });
  const particles = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    // 调整画布大小
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);
    handleResize();

    // 粒子类
    class EventPixel {
      constructor(x, y, polarity) {
        this.x = x;
        this.y = y;
        this.polarity = polarity; // 1 for ON (Green), -1 for OFF (Red)
        this.life = 1.0; // 生命周期
        this.size = Math.random() * 4 + 2; // 像素块大小
      }

      update() {
        this.life -= 0.05; // 衰减速度 (模拟高时间分辨率)
      }

      draw(ctx) {
        ctx.fillStyle = this.polarity > 0 
          ? `rgba(74, 222, 128, ${this.life})` // Tailwind green-400
          : `rgba(248, 113, 113, ${this.life})`; // Tailwind red-400
        
        // 绘制方形像素，符合 DVS 视觉风格
        ctx.fillRect(this.x, this.y, this.size, this.size);
      }
    }

    const handleMouseMove = (e) => {
      const currentX = e.clientX;
      const currentY = e.clientY;
      
      // 计算距离（变化量）
      const dx = currentX - lastPos.current.x;
      const dy = currentY - lastPos.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // 只有当变化超过阈值时才产生事件 (模拟 DVS 阈值)
      if (dist > 5) {
        // 在路径上插值生成粒子，防止断层
        const steps = Math.floor(dist / 5);
        for (let i = 0; i < steps; i++) {
          const x = lastPos.current.x + (dx / steps) * i + (Math.random() - 0.5) * 10;
          const y = lastPos.current.y + (dy / steps) * i + (Math.random() - 0.5) * 10;
          
          // 随机极性，或者基于方向决定极性
          const polarity = Math.random() > 0.5 ? 1 : -1;
          particles.current.push(new EventPixel(x, y, polarity));
        }
      }

      lastPos.current = { x: currentX, y: currentY };
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 渲染循环
    const render = () => {
      if (!canvas) return;
      
      // 使用拖尾效果：不完全清除画布，而是覆盖一层半透明背景
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';

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

  // 使用 Portal 渲染到 body 层级
  return createPortal(
    <canvas 
      ref={canvasRef} 
      className="fixed inset-0 z-[9999] pointer-events-none"
    />,
    document.body
  );
};

// ==========================================
// 2. LIF 神经元交互卡片 (LIF Neuron Widget)
// 模拟 Leaky Integrate-and-Fire 模型
// V(t) = V(t-1) * decay + Input
// ==========================================
export const LIFNeuronCard = () => {
  const [potential, setPotential] = useState(0);
  const [spikeCount, setSpikeCount] = useState(0);
  const [isSpiking, setIsSpiking] = useState(false);
  
  const canvasRef = useRef(null);
  const historyRef = useRef(new Array(100).fill(0)); // 历史电位数据
  const animationRef = useRef();

  // LIF 参数
  const V_th = 100; // 阈值
  const V_rest = 0; // 静息电位
  const decay = 0.95; // 漏电系数 (Leakage)
  const currentPot = useRef(0); // 当前电位 (ref 用于动画循环)

  // 注入电流
  const injectCurrent = (amount) => {
    currentPot.current += amount;
    // 限制最大值防止溢出屏幕太多
    if (currentPot.current > V_th + 20) currentPot.current = V_th + 20;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const draw = () => {
      // 1. 物理模拟
      if (currentPot.current >= V_th) {
        // 发放脉冲 (Fire)
        setIsSpiking(true);
        setSpikeCount(prev => prev + 1);
        
        // 绝对不应期/重置
        currentPot.current = V_rest; 
        
        // 视觉效果：脉冲瞬间画一个高值
        historyRef.current.push(V_th + 50); 
        setTimeout(() => setIsSpiking(false), 100); // UI 状态延迟复位
      } else {
        // 漏电 (Leak)
        currentPot.current = currentPot.current * decay;
        historyRef.current.push(currentPot.current);
      }

      // 保持历史数组长度
      if (historyRef.current.length > canvas.width / 2) {
        historyRef.current.shift();
      }

      // 更新 React 状态用于 UI 显示数字 (降频更新以优化性能)
      if (Math.random() > 0.8) {
        setPotential(currentPot.current);
      }

      // 2. 绘制波形
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制阈值线 (虚线)
      const thY = canvas.height - (V_th / 150) * canvas.height;
      ctx.beginPath();
      ctx.strokeStyle = '#9ca3af'; // gray-400
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, thY);
      ctx.lineTo(canvas.width, thY);
      ctx.stroke();
      ctx.setLineDash([]);

      // 绘制电位曲线
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = isSpiking ? '#ef4444' : '#3b82f6'; // 发放时变红，平时蓝
      
      for (let i = 0; i < historyRef.current.length; i++) {
        const x = i * 2;
        const val = historyRef.current[i];
        const y = canvas.height - (val / 150) * canvas.height; // 简单映射
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

      {/* 示波器区域 */}
      <div className="relative h-24 bg-gray-50 rounded-lg border border-gray-200 mb-3 overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={300} 
          height={100} 
          className="w-full h-full"
        />
        {isSpiking && (
          <div className="absolute inset-0 bg-red-500/20 animate-pulse pointer-events-none flex items-center justify-center">
            <span className="text-red-600 font-bold font-mono text-xl">SPIKE!</span>
          </div>
        )}
      </div>

      {/* 状态面板 */}
      <div className="flex justify-between items-end">
        <div>
          <div className="text-xs text-gray-400 mb-1">Membrane Potential ($V_{mem}$)</div>
          <div className="text-2xl font-mono font-bold text-blue-600">
            {potential.toFixed(1)} <span className="text-sm text-gray-400">mV</span>
          </div>
        </div>

        {/* 交互按钮：注入电流 */}
        <button 
          onClick={() => injectCurrent(30)} // 每次点击注入 30mV
          className="active:scale-95 transition-transform bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg shadow-blue-200"
          title="Inject Current (Input Spike)"
        >
          <Zap size={20} fill="currentColor" />
        </button>
      </div>
      
      <div className="text-[10px] text-gray-400 mt-2 text-center">
        Tip: 快速点击按钮以达到阈值发放脉冲
      </div>
    </Card>
  );
};