import React, { useEffect, useRef, useState } from 'react';
import { Aperture, Activity, Zap } from 'lucide-react';
import { Card } from './ui/Card';

/**
 * DVS (Dynamic Vision Sensor) 仿真
 * * 核心逻辑：
 * 1. 物理层：模拟一个在视场中高速运动的物体（白色球体），这是测试 DVS 时间分辨率的经典场景。
 * 2. 传感器层：计算像素亮度的对数变化 (Log Intensity Change)，超过阈值触发事件。
 * 3. SNN 层：下方展示脉冲栅格图 (Spike Raster Plot)，可视化事件流转换成的神经脉冲。
 */
const EventSimWidget = () => {
  const canvasRef = useRef(null);
  const rasterRef = useRef(null); // 用于绘制脉冲图
  const [eventRate, setEventRate] = useState(0);
  
  // 仿真参数
  const WIDTH = 80;
  const HEIGHT = 60;
  const THRESHOLD = 20; 

  useEffect(() => {
    const canvas = canvasRef.current;
    const rasterCanvas = rasterRef.current;
    if (!canvas || !rasterCanvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const rasterCtx = rasterCanvas.getContext('2d');
    
    // 设置画布大小
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    rasterCanvas.width = 300; // 栅格图宽度
    rasterCanvas.height = 40; // 栅格图高度

    let animationFrame;
    
    // 物理世界状态
    let ball = { x: WIDTH/2, y: HEIGHT/2, vx: 2.5, vy: 1.8, r: 6 };
    
    // 存储上一帧亮度
    let lastFrameData = new Uint8Array(WIDTH * HEIGHT);
    
    // 显示缓冲区
    const displayImage = ctx.createImageData(WIDTH, HEIGHT);
    
    // 脉冲历史 (用于 Raster Plot)
    // 存储最近几帧的事件总数，用于画简单的曲线或条纹
    let spikeHistory = new Array(rasterCanvas.width).fill(0);

    const render = () => {
      // --- 1. 物理场景渲染 (Ground Truth) ---
      const memCanvas = document.createElement('canvas');
      memCanvas.width = WIDTH;
      memCanvas.height = HEIGHT;
      const memCtx = memCanvas.getContext('2d');

      // 黑色背景
      memCtx.fillStyle = '#000000';
      memCtx.fillRect(0, 0, WIDTH, HEIGHT);

      // 绘制高对比度白球
      memCtx.beginPath();
      memCtx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2);
      memCtx.fillStyle = '#FFFFFF';
      memCtx.fill();
      
      // 物理更新
      ball.x += ball.vx;
      ball.y += ball.vy;
      if (ball.x + ball.r > WIDTH || ball.x - ball.r < 0) ball.vx *= -1;
      if (ball.y + ball.r > HEIGHT || ball.y - ball.r < 0) ball.vy *= -1;

      // --- 2. DVS 模拟 (Frame Difference) ---
      const currentFrameData = memCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
      const outputData = displayImage.data;
      let eventsCount = 0;

      // 这是一个 "Time Surface" 风格的衰减，让旧事件慢慢消失，形成拖影
      for (let i = 0; i < outputData.length; i += 4) {
        outputData[i+3] = Math.max(0, outputData[i+3] - 20); // Alpha channel decay
      }

      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        const currentLuma = currentFrameData[i * 4]; // R channel as luma
        const lastLuma = lastFrameData[i];
        const diff = currentLuma - lastLuma;

        if (Math.abs(diff) > THRESHOLD) {
          eventsCount++;
          const idx = i * 4;
          
          // 极性可视化
          outputData[idx + 3] = 255; // Alpha full
          if (diff > 0) {
            // ON Event: Green (Standard DVS color scheme often uses Green/Red or Blue/Red)
            outputData[idx] = 52; outputData[idx+1] = 211; outputData[idx+2] = 153; 
          } else {
            // OFF Event: Red
            outputData[idx] = 248; outputData[idx+1] = 113; outputData[idx+2] = 113;
          }
          
          lastFrameData[i] = currentLuma; // Update reference
        }
        // 注意：DVS 只有在触发事件时才更新基准，但简单模拟每帧更新也可
        lastFrameData[i] = currentLuma;
      }

      ctx.putImageData(displayImage, 0, 0);

      // --- 3. SNN Spike Raster Plot (下方脉冲图) ---
      // 更新历史数据
      spikeHistory.shift();
      spikeHistory.push(eventsCount);

      // 绘制 Raster Plot
      rasterCtx.fillStyle = '#111827'; // bg-gray-900
      rasterCtx.fillRect(0, 0, rasterCanvas.width, rasterCanvas.height);
      
      rasterCtx.lineWidth = 1;
      rasterCtx.strokeStyle = '#60A5FA'; // blue-400
      rasterCtx.beginPath();
      
      // 画成类似神经元发放的竖线 (Raster Plot)
      for (let i = 0; i < spikeHistory.length; i++) {
        if (spikeHistory[i] > 5) { // 只有当有足够事件时才画线，模拟稀疏性
           const intensity = Math.min(spikeHistory[i] / 50, 1); // 归一化
           rasterCtx.fillStyle = `rgba(96, 165, 250, ${intensity})`;
           // 随机画一些点或者短线来模拟 spikes
           const height = spikeHistory[i] > 20 ? 15 : 5; 
           rasterCtx.fillRect(i, (rasterCanvas.height - height) / 2, 1, height);
        }
      }
      rasterCtx.stroke();

      setEventRate(prev => Math.floor(prev * 0.9 + eventsCount * 0.1));
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <Card className="bg-black border-gray-800 text-white h-full min-h-[240px] flex flex-col relative overflow-hidden group">
      {/* 标题栏 */}
      <div className="flex justify-between items-center mb-3 z-10 border-b border-gray-800 pb-2">
        <h3 className="font-bold text-gray-300 flex items-center gap-2 text-xs uppercase tracking-wider">
          <Aperture size={14} className="text-green-400" /> 
          DVS Output <span className="text-gray-600">|</span> SNN Input
        </h3>
        <div className="flex items-center gap-2">
           <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
           <span className="text-xs font-mono text-green-400">{eventRate} eps</span>
        </div>
      </div>

      {/* DVS 视图区 */}
      <div className="flex-1 flex items-center justify-center relative bg-gray-900/30 rounded-md border border-gray-800 overflow-hidden">
        {/* 网格线装饰 */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{
               backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
               backgroundSize: '10px 10px'
             }}>
        </div>
        
        {/* 仿真画布 */}
        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-contain pixelated"
          style={{ imageRendering: 'pixelated' }}
        />
        
        {/* 极性图例 */}
        <div className="absolute bottom-2 left-2 flex gap-2 text-[9px] font-mono text-gray-500 bg-black/50 px-1 rounded backdrop-blur-sm">
           <span className="text-green-400">ON(+1)</span>
           <span className="text-red-400">OFF(-1)</span>
        </div>
      </div>
      
      {/* SNN 脉冲栅格图 (Raster Plot) */}
      <div className="mt-2 h-10 border-t border-gray-800 relative">
         <canvas ref={rasterRef} className="w-full h-full block" />
         <div className="absolute top-0 left-1 text-[8px] text-gray-500 font-mono bg-black/60 px-1">
            Spike Raster Plot
         </div>
      </div>
    </Card>
  );
};

export default EventSimWidget;