import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Zap, AlertTriangle, ShieldCheck } from 'lucide-react';

export const VibrationMonitor: React.FC = () => {
  const [axialVib, setAxialVib] = useState(0);
  const [lateralVib, setLateralVib] = useState(0);
  const [torsionalVib, setTorsionalVib] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setAxialVib(prev => Math.max(0, Math.min(10, prev + (Math.random() - 0.5) * 2)));
      setLateralVib(prev => Math.max(0, Math.min(10, prev + (Math.random() - 0.5) * 2)));
      setTorsionalVib(prev => Math.max(0, Math.min(10, prev + (Math.random() - 0.5) * 2)));
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating]);

  const getStatus = (val: number) => {
    if (val > 8) return { color: 'text-red-500', bg: 'bg-red-500', label: 'Critical' };
    if (val > 5) return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Warning' };
    return { color: 'text-emerald-500', bg: 'bg-emerald-500', label: 'Safe' };
  };

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Activity className="text-emerald-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">Real-Time Vibration Monitor</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Downhole Dynamics Simulation</p>
            </div>
          </div>
          <button 
            onClick={() => setIsSimulating(!isSimulating)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              isSimulating ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-emerald-500 text-zinc-900'
            }`}
          >
            {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { label: 'Axial (Bit Bounce)', value: axialVib, setter: setAxialVib },
            { label: 'Lateral (Whirl)', value: lateralVib, setter: setLateralVib },
            { label: 'Torsional (Stick-Slip)', value: torsionalVib, setter: setTorsionalVib }
          ].map((vib, i) => {
            const status = getStatus(vib.value);
            return (
              <div key={i} className="bg-zinc-800/50 rounded-2xl p-4 border border-zinc-700/50 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{vib.label}</span>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${status.color}`}>{status.label}</span>
                </div>
                
                <div className="flex items-end gap-1 h-12">
                  {[...Array(15)].map((_, j) => (
                    <motion.div 
                      key={j}
                      animate={{ 
                        height: isSimulating ? `${Math.random() * vib.value * 10}%` : '10%',
                        backgroundColor: status.bg
                      }}
                      className="flex-1 rounded-t-sm opacity-50"
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-zinc-500">Magnitude</span>
                    <span className="text-white">{vib.value.toFixed(1)} G</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="10" 
                    step="0.1" 
                    value={vib.value}
                    onChange={(e) => vib.setter(parseFloat(e.target.value))}
                    className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-700/30 flex items-center gap-4">
          <div className="p-2 bg-zinc-800 rounded-xl">
            <ShieldCheck className="text-zinc-500" size={20} />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-white font-bold">MWD Pro Tip:</span> High lateral vibration often indicates BHA whirl. Reducing RPM or increasing WOB can sometimes stabilize the BHA and protect the tool electronics.
          </p>
        </div>
      </div>
    </div>
  );
};
