import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Activity, Zap, Info, ChevronDown } from 'lucide-react';

export const FormationLog: React.FC = () => {
  const [depth, setDepth] = useState(10000);
  const [gammaRay, setGammaRay] = useState(45);
  const [isDrilling, setIsDrilling] = useState(false);
  const [logData, setLogData] = useState<{ depth: number; gamma: number; lith: string }[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Formation definitions
  const formations = [
    { name: 'Sandstone', gamma: [20, 60], color: 'bg-amber-400' },
    { name: 'Shale', gamma: [70, 150], color: 'bg-zinc-600' },
    { name: 'Limestone', gamma: [10, 40], color: 'bg-zinc-200' },
    { name: 'Siltstone', gamma: [60, 90], color: 'bg-amber-700' }
  ];

  const getCurrentFormation = (d: number) => {
    const idx = Math.floor(d / 100) % formations.length;
    return formations[idx];
  };

  useEffect(() => {
    if (isDrilling) {
      const interval = setInterval(() => {
        setDepth(prev => prev + 0.1);
        const formation = getCurrentFormation(depth);
        const [min, max] = formation.gamma;
        const newGamma = Math.max(min, Math.min(max, gammaRay + (Math.random() - 0.5) * 10));
        setGammaRay(newGamma);
        
        setLogData(prev => [...prev.slice(-100), { depth, gamma: newGamma, lith: formation.color }]);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isDrilling, depth, gammaRay]);

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <Layers className="text-emerald-500" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-display">Real-Time Formation Evaluation</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Gamma Ray & Lithology Log</p>
          </div>
        </div>
        <button 
          onClick={() => setIsDrilling(!isDrilling)}
          className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            isDrilling ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-emerald-500 text-zinc-900'
          }`}
        >
          {isDrilling ? 'Stop Drilling' : 'Start Drilling'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[400px]">
        {/* Log Track */}
        <div className="md:col-span-3 bg-black/40 rounded-2xl border border-zinc-800 p-4 relative overflow-hidden flex flex-col">
          <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2 mb-2">
            <span>Gamma Ray (API)</span>
            <div className="flex gap-10">
              <span>0</span>
              <span>75</span>
              <span>150</span>
            </div>
          </div>
          
          <div className="flex-1 relative overflow-hidden flex">
            {/* Grid lines */}
            <div className="absolute inset-0 flex justify-between pointer-events-none opacity-20">
              <div className="w-px bg-zinc-700 h-full" />
              <div className="w-px bg-zinc-700 h-full" />
              <div className="w-px bg-zinc-700 h-full" />
            </div>

            {/* Log Curve */}
            <svg className="absolute inset-0 w-full h-full">
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                points={logData.map((d, i) => `${(d.gamma / 150) * 100}%,${(i / logData.length) * 100}%`).join(' ')}
              />
            </svg>

            {/* Lithology Track */}
            <div className="absolute right-0 top-0 bottom-0 w-8 border-l border-zinc-800">
              {logData.map((d, i) => (
                <div 
                  key={i} 
                  className={`w-full ${d.lith}`} 
                  style={{ height: `${100 / logData.length}%` }}
                />
              ))}
            </div>
          </div>

          {/* Current Depth Indicator */}
          <div className="absolute bottom-4 left-4 bg-zinc-900/90 border border-zinc-700 px-3 py-1 rounded-lg">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mr-2">Depth:</span>
            <span className="text-xs font-mono text-white">{depth.toFixed(1)} ft</span>
          </div>
        </div>

        {/* Stats Column */}
        <div className="space-y-4">
          <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/30 space-y-4">
            <div className="flex items-center gap-2 text-zinc-400">
              <Activity size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">Current Sensor</span>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Gamma Ray</span>
              <div className="text-2xl font-mono text-emerald-500">{gammaRay.toFixed(1)} <span className="text-xs text-zinc-500">API</span></div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Formation</span>
              <div className="text-sm font-bold text-white">{getCurrentFormation(depth).name}</div>
            </div>
          </div>

          <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/30 space-y-2">
            <div className="flex items-center gap-2 text-zinc-400">
              <Info size={16} />
              <span className="text-xs font-bold uppercase tracking-wider">MWD Insight</span>
            </div>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Gamma Ray sensors measure natural radioactivity. High readings (75+ API) typically indicate <span className="text-zinc-300">Shale</span>, while low readings indicate <span className="text-zinc-300">Sandstone</span> or <span className="text-zinc-300">Limestone</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
