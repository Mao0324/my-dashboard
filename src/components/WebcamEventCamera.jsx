import React, { useEffect, useRef, useState } from 'react';
import { Aperture, Video, VideoOff, Camera } from 'lucide-react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';

/**
 * 实时 Event Camera 仿真器
 * 原理：前端差分算法 (Frame Difference) 模拟 DVS 传感器机制
 * 红色 = OFF Event (亮度下降), 绿色 = ON Event (亮度上升)
 */
const WebcamEventCamera = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState(null);
  
  // DVS 参数配置
  const THRESHOLD = 15; // 触发事件的亮度变化阈值
  const DOWNSAMPLE = 4; // 下采样倍率 (提高性能，模拟低分辨率传感器)

  useEffect(() => {
    let animationFrameId;
    let stream = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 320, height: 240, frameRate: { ideal: 30 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        processStream();
      } catch (err) {
        console.error("摄像头访问失败:", err);
        setError("无法访问摄像头，请检查权限");
        setIsActive(false);
      }
    };

    const stopCamera = () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };

    if (isActive) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => stopCamera();
  }, [isActive]);

  const processStream = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    
    // 初始化尺寸
    const w = 320 / DOWNSAMPLE;
    const h = 240 / DOWNSAMPLE;
    canvas.width = w;
    canvas.height = h;

    // 内存画布用于读取视频帧
    const memCanvas = document.createElement('canvas');
    memCanvas.width = w;
    memCanvas.height = h;
    const memCtx = memCanvas.getContext('2d');

    let lastFrameData = null;

    const render = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        // 1. 绘制当前视频帧到内存并缩小
        memCtx.drawImage(video, 0, 0, w, h);
        const currentFrame = memCtx.getImageData(0, 0, w, h);
        const currentData = currentFrame.data;
        
        // 2. 创建输出图像 (全透明背景)
        const outputImage = ctx.createImageData(w, h);
        const outputData = outputImage.data;

        // 3. 如果有上一帧，进行差分计算
        if (lastFrameData) {
          for (let i = 0; i < currentData.length; i += 4) {
            // 计算亮度 (简单的 RGB 平均)
            const curLum = (currentData[i] + currentData[i+1] + currentData[i+2]) / 3;
            const lastLum = (lastFrameData[i] + lastFrameData[i+1] + lastFrameData[i+2]) / 3;
            const diff = curLum - lastLum;

            // 模拟 DVS 阈值机制
            if (Math.abs(diff) > THRESHOLD) {
              outputData[i + 3] = 255; // Alpha = 255 (不透明)
              if (diff > 0) {
                // ON Event: Green (苏神绿/极客绿)
                outputData[i] = 52; outputData[i+1] = 211; outputData[i+2] = 153;
              } else {
                // OFF Event: Red
                outputData[i] = 248; outputData[i+1] = 113; outputData[i+2] = 113;
              }
            } else {
              // 无事件发生处保持全透明 (或黑色)
              outputData[i + 3] = 20; // 给一点点幽灵残影，增加视觉连贯性
            }
          }
        } else {
            // 第一帧全黑
            for(let i=0; i<outputData.length; i+=4) outputData[i+3] = 255; 
        }

        // 4. 更新上一帧缓存
        // 注意：真实的 DVS 只有在触发事件后才重置参考电压，这里为了简化直接每帧更新
        lastFrameData = new Uint8ClampedArray(currentData);

        // 5. 渲染到画布
        ctx.putImageData(outputImage, 0, 0);
      }
      
      if (isActive) {
        requestAnimationFrame(render);
      }
    };
    
    requestAnimationFrame(render);
  };

  return (
    <Card className="bg-black border-gray-800 text-white h-full min-h-[300px] flex flex-col relative overflow-hidden group shadow-green-900/20 shadow-lg">
      {/* 隐藏的 Video 元素用于抓取流 */}
      <video ref={videoRef} className="hidden" playsInline muted />

      {/* 顶部栏 */}
      <div className="flex justify-between items-center mb-4 z-10 border-b border-gray-800 pb-2">
        <h3 className="font-bold text-gray-300 flex items-center gap-2 text-xs uppercase tracking-wider">
          <Aperture size={14} className={isActive ? "text-green-400 animate-spin-slow" : "text-gray-600"} /> 
          Real-time DVS Output
        </h3>
        <div className="flex items-center gap-2">
           {isActive && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
           <span className="text-xs font-mono text-gray-500">{isActive ? "LIVE" : "OFFLINE"}</span>
        </div>
      </div>

      {/* 画布区域 */}
      <div className="flex-1 flex flex-col items-center justify-center relative bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
        {!isActive && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-3 z-20 bg-black/40 backdrop-blur-sm">
            <Camera size={48} className="opacity-50" />
            <p className="text-xs">点击开启 Event Camera 仿真</p>
            <Button onClick={() => setIsActive(true)} variant="primary" className="text-xs h-8 px-4 bg-green-600 hover:bg-green-700 border-none">
               <Video size={14} className="mr-1"/> 开启摄像头
            </Button>
          </div>
        )}

        {error && (
           <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs z-20">
             {error}
           </div>
        )}
        
        {/* 网格装饰 */}
        <div className="absolute inset-0 pointer-events-none opacity-30 z-10" 
             style={{
               backgroundImage: `linear-gradient(rgba(0, 255, 0, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 255, 0, 0.1) 1px, transparent 1px)`,
               backgroundSize: '20px 20px'
             }}>
        </div>

        <canvas 
          ref={canvasRef} 
          className="w-full h-full object-contain pixelated scale-x-[-1]" // 镜像翻转
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* 底部控制栏 */}
      <div className="mt-3 flex justify-between items-end h-8">
         <div className="text-[10px] text-gray-500 font-mono leading-tight">
            <div>RES: {320/DOWNSAMPLE}x{240/DOWNSAMPLE}</div>
            <div>THR: {THRESHOLD} | &Delta;t: 33ms</div>
         </div>
         
         {isActive && (
            <Button onClick={() => setIsActive(false)} variant="danger" className="h-7 text-[10px] px-2">
               <VideoOff size={12} className="mr-1"/> 停止
            </Button>
         )}
      </div>
    </Card>
  );
};

export default WebcamEventCamera;