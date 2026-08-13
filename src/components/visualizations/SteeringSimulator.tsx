import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Compass, Target, Navigation, RotateCw, Play, RefreshCw, AlertTriangle } from 'lucide-react';

export const SteeringSimulator: React.FC = () => {
  const [toolface, setToolface] = useState(0);
  const [mode, setMode] = useState<'slide' | 'rotate'>('rotate');
  const [path, setPath] = useState<{ x: number, y: number }[]>([{ x: 50, y: 0 }]);
  const [isDrilling, setIsDrilling] = useState(false);
  const [targetX, setTargetX] = useState(50);
  const [dls, setDls] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isDrilling) return;

    const interval = setInterval(() => {
      setPath(prev => {
        const last = prev[prev.length - 1];
        if (last.y >= 350) {
          setIsDrilling(false);
          return prev;
        }

        let nextX = last.x;
        let nextY = last.y + 2;

        if (mode === 'slide') {
          // Calculate steering based on toolface
          // 0 = up (build), 180 = down (drop), 90 = right (turn right), 270 = left (turn left)
          const rad = (toolface - 90) * (Math.PI / 180);
          nextX += Math.cos(rad) * 1.5;
          // nextY += Math.sin(rad) * 0.5; // Vertical steering is more complex, keeping it simple
        } else {
          // Rotating tends to straighten the wellbore
          nextX += (50 - last.x) * 0.05;
        }

        // Add some noise
        nextX += (Math.random() - 0.5) * 0.2;

        return [...prev, { x: nextX, y: nextY }];
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isDrilling, mode, toolface]);

  const reset = () => {
    setPath([{ x: 50, y: 0 }]);
    setIsDrilling(false);
    setTargetX(30 + Math.random() * 40);
  };

  const lastPos = path[path.length - 1];
  const isOffTarget = Math.abs(lastPos.x - targetX) > 10;

  return (
    <div className="instrument overflow-hidden">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Navigation className="text-emerald-500" size={24} />
            </div>
            <div>
              <h3 className="instrument-title">3D Steering Simulator</h3>
              <p className="text-xs text-zinc-500 font-medium tracking-wide">Directional Control & Well Path Planning</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDrilling(!isDrilling)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center gap-2 ${
                isDrilling ? 'bg-red-500 text-white' : 'bg-elevated text-zinc-200'
              }`}
            >
              {isDrilling ? <RotateCw className="animate-spin" size={14} /> : <Play size={14} />}
              {isDrilling ? 'Stop Drilling' : 'Start Drilling'}
            </button>
            <button 
              onClick={reset}
              className="p-2 bg-elevated text-zinc-400 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="space-y-4">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Drilling Mode</p>
              <div className="flex gap-2 p-1 bg-zinc-100 rounded-xl">
                <button 
                  onClick={() => setMode('rotate')}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    mode === 'rotate' ? 'bg-emerald-500 text-zinc-950 shadow-none' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  Rotate
                </button>
                <button 
                  onClick={() => setMode('slide')}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                    mode === 'slide' ? 'bg-emerald-500 text-zinc-950 shadow-none' : 'text-zinc-500 hover:text-zinc-200'
                  }`}
                >
                  Slide
                </button>
              </div>
            </div>

            <div className={`space-y-4 transition-opacity duration-500 ${mode === 'rotate' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Toolface Orientation</p>
                <span className="text-xs font-mono font-bold text-emerald-400">{toolface}°</span>
              </div>
              
              <div className="relative aspect-square bg-black/40 rounded-full border-4 border-white/5 flex items-center justify-center p-8">
                <div className="absolute inset-4 border-2 border-dashed border-white/10 rounded-full" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="absolute top-2 text-[10px] font-bold text-zinc-400">BUILD</span>
                  <span className="absolute bottom-2 text-[10px] font-bold text-zinc-400">DROP</span>
                  <span className="absolute right-2 text-[10px] font-bold text-zinc-400">RIGHT</span>
                  <span className="absolute left-2 text-[10px] font-bold text-zinc-400">LEFT</span>
                </div>
                
                <motion.div 
                  animate={{ rotate: toolface }}
                  className="w-full h-full relative"
                >
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1 h-1/2 bg-emerald-500/100 rounded-full origin-bottom" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 w-4 h-4 bg-emerald-500/100 rounded-full flex items-center justify-center  shadow-emerald-500/20">
                    <Navigation size={10} className="text-white" />
                  </div>
                </motion.div>

                <input 
                  type="range" 
                  min="0" 
                  max="359" 
                  value={toolface}
                  onChange={(e) => setToolface(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>

            <div className="bg-emerald-500/10 p-4 rounded-xl border border-emerald-500/20 flex items-center gap-3">
              <Compass className="text-emerald-500" size={20} />
              <p className="text-xs text-emerald-300 leading-relaxed font-medium">
                <span className="font-bold">DD Tip:</span> Sliding with toolface at 90° will turn the well to the right. Rotating will tend to drop inclination or hold the current path.
              </p>
            </div>
          </div>

          {/* Visualization Panel */}
          <div className="lg:col-span-8 bg-zinc-900 rounded-xl p-6 border border-zinc-800 relative h-[450px]">
            <div className="absolute top-4 left-4 flex gap-4">
              <div className="bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700">
                <p className="instrument-metric-label">Vertical Section</p>
                <p className="text-sm font-mono text-white">{(lastPos.y * 10).toFixed(0)} ft</p>
              </div>
              <div className="bg-zinc-800/80 px-3 py-1.5 rounded-lg border border-zinc-700">
                <p className="instrument-metric-label">DLS</p>
                <p className="text-sm font-mono text-white">{(Math.abs(lastPos.x - 50) / 10).toFixed(1)}°/100ft</p>
              </div>
            </div>

            {isOffTarget && lastPos.y > 100 && (
              <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-500 px-3 py-1.5 rounded-lg border border-amber-500/20 flex items-center gap-2 animate-pulse">
                <AlertTriangle size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Off Plan</span>
              </div>
            )}

            <svg className="w-full h-full" viewBox="0 0 100 400" preserveAspectRatio="none">
              {/* Target Window */}
              <rect 
                x={targetX - 10} 
                y={300} 
                width={20} 
                height={50} 
                fill="rgba(16, 185, 129, 0.1)" 
                stroke="rgba(16, 185, 129, 0.3)" 
                strokeDasharray="4 4" 
              />
              <Target x={targetX - 5} y={320} width={10} height={10} className="text-emerald-500 opacity-50" />

              {/* Grid Lines */}
              {[...Array(8)].map((_, i) => (
                <line key={i} x1="0" y1={i * 50} x2="100" y2={i * 50} stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />
              ))}
              <line x1="50" y1="0" x2="50" y2="400" stroke="rgba(255,255,255,0.05)" strokeWidth="0.5" />

              {/* Well Path */}
              <path 
                d={`M ${path.map(p => `${p.x},${p.y}`).join(' L ')}`}
                fill="none"
                stroke="url(#pathGradient)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Bit Indicator */}
              <motion.circle 
                cx={lastPos.x} 
                cy={lastPos.y} 
                r="3" 
                fill="#6366f1" 
                className=" shadow-emerald-500/30"
              />

              <defs>
                <linearGradient id="pathGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>

            <div className="absolute bottom-4 right-4 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
              Plan View (X-Y Plane)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
