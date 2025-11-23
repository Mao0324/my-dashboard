import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Stars, Cloud, Float, Sparkles } from '@react-three/drei';
import * as THREE from 'three';

// --- 子组件：雨滴系统 ---
const Rain = ({ count = 200 }) => {
  const points = useRef();
  
  // 初始化雨滴位置
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10; // x
      pos[i * 3 + 1] = Math.random() * 10;     // y
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10; // z
    }
    return pos;
  }, [count]);

  useFrame((state, delta) => {
    if (!points.current) return;
    const positions = points.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      // 让雨滴下落
      positions[i * 3 + 1] -= delta * 8; // 速度
      // 循环重置到顶部
      if (positions[i * 3 + 1] < -2) {
        positions[i * 3 + 1] = 8;
      }
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#aaaaff" transparent opacity={0.6} />
    </points>
  );
};

// --- 子组件：雪花系统 ---
const Snow = ({ count = 150 }) => {
  const points = useRef();
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 1] = Math.random() * 10;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 10;
    }
    return pos;
  }, [count]);

  useFrame((state, delta) => {
    if (!points.current) return;
    const positions = points.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      positions[i * 3 + 1] -= delta * 1.5; // 下落慢一点
      positions[i * 3] += Math.sin(state.clock.elapsedTime + i) * 0.01; // 左右飘动
      if (positions[i * 3 + 1] < -2) {
        positions[i * 3 + 1] = 8;
      }
    }
    points.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#ffffff" transparent opacity={0.8} />
    </points>
  );
};

// --- 子组件：低多边形房子 ---
const House = ({ isFocus, isNight }) => {
  // 窗户颜色：专注时亮黄，非专注时随昼夜变化
  const windowColor = isFocus 
    ? "#FFD700" // 金色 (专注)
    : isNight ? "#333" : "#87CEEB"; // 晚上关灯，白天反射蓝天

  const windowEmissive = isFocus ? "#FFA500" : "#000000";

  return (
    <group position={[0, 0.5, 0]}>
      {/* 房子主体 */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[1.2, 1, 1.2]} />
        <meshStandardMaterial color="#f5f5f5" />
      </mesh>
      
      {/* 屋顶 */}
      <mesh position={[0, 1.3, 0]} rotation={[0, Math.PI / 4, 0]}>
        <coneGeometry args={[1.0, 0.8, 4]} />
        <meshStandardMaterial color="#e74c3c" />
      </mesh>

      {/* 窗户 (会发光) */}
      <mesh position={[0, 0.6, 0.61]}>
        <planeGeometry args={[0.4, 0.4]} />
        <meshStandardMaterial color={windowColor} emissive={windowEmissive} emissiveIntensity={isFocus ? 2 : 0} />
      </mesh>
      
      {/* 门 */}
      <mesh position={[0.3, 0.3, 0.61]}>
        <planeGeometry args={[0.3, 0.6]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
    </group>
  );
};

// --- 子组件：简单的树 ---
const Tree = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.4, 0]}>
      <cylinderGeometry args={[0.1, 0.15, 0.8]} />
      <meshStandardMaterial color="#8B4513" />
    </mesh>
    <mesh position={[0, 1.0, 0]}>
      <dodecahedronGeometry args={[0.5]} />
      <meshStandardMaterial color="#228B22" />
    </mesh>
  </group>
);

// --- 主场景逻辑 ---
const SceneContent = ({ weatherCode, isDay, isFocus }) => {
  // 天气代码映射 (WMO Code)
  const isRainy = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(weatherCode);
  const isSnowy = [71, 73, 75, 77, 85, 86].includes(weatherCode);
  const isCloudy = [1, 2, 3, 45, 48].includes(weatherCode) || isRainy || isSnowy;

  // 背景颜色
  const bgColor = isFocus 
    ? "#1a1a2e" // 专注模式：深邃暗蓝
    : isDay 
      ? (isRainy ? "#8899a6" : "#87CEEB") // 白天：雨天灰/晴天蓝
      : "#0f172a"; // 晚上：深蓝灰

  // 光照强度
  const ambientIntensity = isFocus ? 0.2 : (isDay ? 0.6 : 0.2);
  const dirLightIntensity = isFocus ? 0 : (isDay ? 1 : 0.2);

  return (
    <>
      <color attach="background" args={[bgColor]} />
      
      {/* 摄像机控制: 专注时禁止旋转，保持视角固定 */}
      <OrbitControls 
        enableZoom={false} 
        enablePan={false} 
        autoRotate={!isFocus} 
        autoRotateSpeed={0.5}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 2.2}
      />

      {/* 灯光系统 */}
      <ambientLight intensity={ambientIntensity} />
      <directionalLight position={[5, 10, 5]} intensity={dirLightIntensity} castShadow />
      
      {/* 专注模式下的聚光灯 */}
      {isFocus && (
        <spotLight 
          position={[0, 5, 2]} 
          angle={0.3} 
          penumbra={0.5} 
          intensity={5} 
          castShadow 
          color="#ffd700" 
        />
      )}

      {/* 天气粒子 */}
      {isRainy && <Rain />}
      {isSnowy && <Snow />}
      {!isDay && !isFocus && <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />}
      
      {/* 浮动的小岛 */}
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group>
          {/* 地面 */}
          <mesh receiveShadow position={[0, -0.2, 0]}>
            <cylinderGeometry args={[4, 4, 0.4, 32]} />
            <meshStandardMaterial color={isSnowy ? "#eeeeee" : "#4ade80"} />
          </mesh>
          
          <House isFocus={isFocus} isNight={!isDay} />
          
          <Tree position={[-1.5, 0.2, 0.5]} />
          <Tree position={[1.8, 0.2, -1]} />
          <Tree position={[-1, 0.2, -2]} />

          {/* 专注时的粒子特效 */}
          {isFocus && (
             <Sparkles count={50} scale={4} size={4} speed={0.4} opacity={0.5} color="#FFFF00" />
          )}
        </group>
      </Float>

      {/* 云朵 (云天、雨天、专注时稍微有点氛围) */}
      {(isCloudy || isFocus) && (
        <group position={[0, 3, 0]}>
          <Cloud opacity={0.5} speed={0.4} width={5} depth={1.5} segments={10} color={isFocus ? "#333" : "#fff"} />
        </group>
      )}
    </>
  );
};

const WeatherScene3D = ({ weather, pomoState }) => {
  const isFocus = pomoState.isActive && pomoState.mode === 'focus';
  
  // 默认值处理
  const weatherCode = weather?.current?.weather_code ?? 0;
  const isDay = weather?.current?.is_day === 1;

  return (
    <div className="w-full h-full min-h-[240px] relative rounded-2xl overflow-hidden shadow-inner bg-gray-900 transition-all duration-1000">
      {/* 3D 画布 */}
      <Canvas shadows camera={{ position: [0, 2, 7], fov: 45 }}>
        <SceneContent 
          weatherCode={weatherCode} 
          isDay={isDay} 
          isFocus={isFocus} 
        />
      </Canvas>
      
      {/* UI 覆盖层 (显示气温等) */}
      <div className="absolute top-4 left-4 z-10 text-white drop-shadow-md pointer-events-none">
        <h2 className="text-3xl font-bold font-mono">
          {weather?.current?.temperature_2m ?? "--"}°
        </h2>
        <p className="text-sm opacity-90">
            {isFocus ? "正在专注..." : (weatherCode === 0 ? "晴朗" : weatherCode > 50 ? "有雨/雪" : "多云")}
        </p>
      </div>

      {isFocus && (
        <div className="absolute bottom-4 right-4 z-10 bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-yellow-300 text-xs border border-yellow-300/30">
          🔥 Focus Mode Active
        </div>
      )}
    </div>
  );
};

export default WeatherScene3D;