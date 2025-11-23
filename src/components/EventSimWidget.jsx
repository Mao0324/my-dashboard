import React, { useEffect, useRef, useState } from 'react';
import { Eye, Activity, Aperture } from 'lucide-react';
import { Card } from './ui/Card.jsx';

/**
 * 模拟 Event Camera (DVS) 的原理
 * 只有当像素亮度变化超过阈值时，才产生事件 (Event)
 */
const EventSimWidget = () => {
  const canvasRef = useRef(null);
  const [eventRate, setEventRate] = useState(0);
  
  // 仿真参数
  const WIDTH = 64;  // 低分辨率模拟 DVS 传感器
  const HEIGHT = 64;
  const THRESHOLD = 15; // 亮度变化阈值

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // 设置画布 CSS 大小 (放大显示)
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let animationFrame;
    let angle = 0;
    
    // 存储上一帧的亮度数据
    let lastFrameData = new Uint8Array(WIDTH * HEIGHT);
    
    // 预先创建用于显示的 ImageData (用于直接操作像素)
    const displayImage = ctx.createImageData(WIDTH, HEIGHT);

    const render = () => {
      // 1. 在内存中绘制当前的“真实世界”场景 (一个旋转的雷达/棒)
      // 我们创建一个临时的 canvas 来计算物理场景
      const memCanvas = document.createElement('canvas');
      memCanvas.width = WIDTH;
      memCanvas.height = HEIGHT;
      const memCtx = memCanvas.getContext('2d');

      // 清空背景 (黑色)
      memCtx.fillStyle = '#000000';
      memCtx.fillRect(0, 0, WIDTH, HEIGHT);

      // 绘制旋转物体 (白色)
      memCtx.save();
      memCtx.translate(WIDTH / 2, HEIGHT / 2);
      memCtx.rotate(angle);
      memCtx.fillStyle = '#FFFFFF';
      memCtx.fillRect(-20, -2, 40, 4); // 长条
      memCtx.beginPath();
      memCtx.arc(15, 0, 4, 0, Math.PI * 2); // 头部圆点
      memCtx.fill();
      memCtx.restore();

      // 2. 获取当前帧的像素数据
      const currentFrameData = memCtx.getImageData(0, 0, WIDTH, HEIGHT).data;
      
      // 3. DVS 核心算法：差分计算
      let eventsCount = 0;
      const outputData = displayImage.data;

      // 清空显示缓冲区 (DVS 如果没有变化就是黑的)
      // 注意：真实的 DVS 是异步的，这里我们每一帧重绘来模拟那种“只看变化”的感觉
      // 为了视觉残留效果，我们可以给一个半透明的遮罩，而不是完全清空，但这会复杂化。
      // 简单起见：每帧重绘事件点。
      for (let i = 0; i < outputData.length; i++) outputData[i] = 0; // Fill transparent/black

      for (let i = 0; i < WIDTH * HEIGHT; i++) {
        // 取出 RGB 的 G 通道作为亮度 (因为是黑白，RGB一样)
        const currentLuma = currentFrameData[i * 4 + 1]; 
        const lastLuma = lastFrameData[i];
        const diff = currentLuma - lastLuma;

        if (Math.abs(diff) > THRESHOLD) {
          eventsCount++;
          // 产生事件
          const pixelIndex = i * 4;
          outputData[pixelIndex + 3] = 255; // Alpha 100%

          if (diff > 0) {
            // ON Event (亮度增加) -> 绿色
            outputData[pixelIndex] = 74;     // R
            outputData[pixelIndex + 1] = 222; // G
            outputData[pixelIndex + 2] = 128; // B
          } else {
            // OFF Event (亮度降低) -> 红色
            outputData[pixelIndex] = 248;    // R
            outputData[pixelIndex + 1] = 113; // G
            outputData[pixelIndex + 2] = 113; // B
          }
          
          // 更新记忆存储 (只有触发事件时才更新参考电平，模拟积分火)
          lastFrameData[i] = currentLuma;
        }
        // 注意：如果变化没超过阈值，lastFrameData 不更新 (或者根据具体模型更新)
        // 这里简单处理：每帧都更新基准，变成简单的帧间差分
        lastFrameData[i] = currentLuma; 
      }

      // 4. 将生成的“事件图像”绘制到屏幕
      ctx.putImageData(displayImage, 0, 0);

      // 更新状态
      angle += 0.15; // 旋转速度
      setEventRate(prev => Math.floor(prev * 0.9 + eventsCount * 0.1)); // 平滑显示的计数

      animationFrame = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrame);
  }, []);

  return (
    <Card className="bg-black border-gray-800 text-white h-full min-h-[200px] flex flex-col relative overflow-hidden">
      <div className="flex justify-between items-start mb-2 z-10">
        <h3 className="font-bold text-gray-300 flex items-center gap-2 text-sm">
          <Aperture size={16} className="text-green-400" /> 
          DVS 传感器仿真
        </h3>
        <div className="flex flex-col items-end">
           <span className="text-xs font-mono text-green-400">{eventRate} ev/frame</span>
           <span className="text-[10px] text-gray-500">64x64 Array</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-gray-900/50 rounded-lg border border-gray-800/50 relative">
        {/* 装饰性网格 */}
        <div className="absolute inset-0 opacity-10" 
             style={{backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
        </div>
        
        {/* 仿真画布 (使用了 image-rendering: pixelated 保持像素风) */}
        <canvas 
          ref={canvasRef} 
          className="w-32 h-32 md:w-40 md:h-40"
          style={{ imageRendering: 'pixelated', filter: 'drop-shadow(0 0 8px rgba(74, 222, 128, 0.2))' }}
        />
      </div>
      
      <div className="mt-2 flex gap-4 text-[10px] text-gray-500 justify-center font-mono">
         <span className="flex items-center gap-1"><div className="w-2 h-2 bg-green-400 rounded-full"></div> ON (+dV)</span>
         <span className="flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-full"></div> OFF (-dV)</span>
      </div>
    </Card>
  );
};

export default EventSimWidget;