import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Layers, Target, Navigation, AlertTriangle, CheckCircle2, RefreshCw, Eye, EyeOff } from 'lucide-react';

const formationData = [
  { depth: 8000, type: 'Shale', gamma: 140, color: 'bg-zinc-600' },
  { depth: 8050, type: 'Shale', gamma: 155, color: 'bg-zinc-700' },
  { depth: 8100, type: 'Sandstone', gamma: 45, color: 'bg-amber-200' },
  { depth: 8150, type: 'Sandstone', gamma: 35, color: 'bg-amber-300' },
  { depth: 8200, type: 'Limestone', gamma: 65, color: 'bg-zinc-200' },
  { depth: 8250, type: 'Shale', gamma: 150, color: 'bg-zinc-600' },
  { depth: 8300, type: 'Sandstone', gamma: 40, color: 'bg-amber-200' },
  { depth: 8350, type: 'Sandstone', gamma: 30, color: 'bg-amber-300' },
  { depth: 8400, type: 'Shale', gamma: 160, color: 'bg-zinc-700' },
];

export const GeosteeringInterpretation: React.FC = () => {
  const [currentDepth, setCurrentDepth] = useState(8000);
  const [realTimeLog, setRealTimeLog] = useState<{ depth: number, gamma: number }[]>([]);
  const [isDrilling, setIsDrilling] = useState(false);
  const [showOffset, setShowOffset] = useState(true);
  const [interpretation, setInterpretation] = useState<string | null>(null);

  useEffect(() => {
    if (!isDrilling) return;

    const interval = setInterval(() => {
      setCurrentDepth(prev => {
        const nextDepth = prev + 2;
        if (nextDepth >= 8400) {
          setIsDrilling(false);
          return prev;
        }

        // Find the formation for this depth
        const formation = formationData.find(f => nextDepth >= f.depth && nextDepth < f.depth + 50);
        if (formation) {
          const noise = (Math.random() - 0.5) * 10;
          setRealTimeLog(prevLog => [...prevLog, { depth: nextDepth, gamma: formation.gamma + noise }]);
        }

        return nextDepth;
      });
    }, 200);

    return () => clearInterval(interval);
  }, [isDrilling]);

  const reset = () => {
    setCurrentDepth(8000);
    setRealTimeLog([]);
    setIsDrilling(false);
    setInterpretation(null);
  };

  const currentGamma = realTimeLog.length > 0 ? realTimeLog[realTimeLog.length - 1].gamma : 0;
  const inZone = currentGamma < 60 && currentGamma > 0;

  return (
    <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl overflow-hidden">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl">
              <Layers className="text-emerald-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 font-display">Geosteering Interpretation Lab</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Real-Time Formation Correlation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsDrilling(!isDrilling)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                isDrilling ? 'bg-red-500 text-white' : 'bg-zinc-900 text-white'
              }`}
            >
              {isDrilling ? 'Stop Drilling' : 'Start Drilling'}
            </button>
            <button 
              onClick={reset}
              className="p-2 bg-zinc-100 text-zinc-500 rounded-xl hover:bg-zinc-200 transition-colors"
            >
              <RefreshCw size={20} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Log Viewer */}
          <div className="lg:col-span-8 bg-zinc-900 rounded-3xl p-6 border border-zinc-800 relative h-[500px] flex gap-4">
            {/* Offset Log (Reference) */}
            <div className={`flex-1 flex flex-col transition-opacity duration-500 ${showOffset ? 'opacity-100' : 'opacity-10'}`}>
              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4 text-center">Offset Log (Planned)</p>
              <div className="flex-1 relative border-r border-zinc-800">
                <svg className="w-full h-full" viewBox="0 0 100 400" preserveAspectRatio="none">
                  <path 
                    d={`M ${formationData.map((f, i) => `${f.gamma / 2},${i * (400 / (formationData.length - 1))}`).join(' L ')}`}
                    fill="none"
                    stroke="rgba(255,255,255,0.2)"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  {formationData.map((f, i) => (
                    <text key={i} x="5" y={i * (400 / (formationData.length - 1))} className="text-[10px] fill-zinc-600 font-mono">{f.depth}</text>
                  ))}
                </svg>
              </div>
            </div>

            {/* Real-Time Log */}
            <div className="flex-1 flex flex-col">
              <p className="text-[10px] font-bold text-white uppercase tracking-widest mb-4 text-center">Real-Time Gamma (MWD)</p>
              <div className="flex-1 relative bg-zinc-800/30 rounded-xl border border-zinc-700/50">
                <svg className="w-full h-full" viewBox="0 0 200 400" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="60" y1="0" x2="60" y2="400" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  <line x1="150" y1="0" x2="150" y2="400" stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                  
                  {/* Real-Time Path */}
                  <path 
                    d={`M ${realTimeLog.map(p => `${p.gamma},${(p.depth - 8000)}`).join(' L ')}`}
                    fill="none"
                    stroke={inZone ? "#10b981" : "#ef4444"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Current Depth Marker */}
                  <line 
                    x1="0" 
                    y1={currentDepth - 8000} 
                    x2="200" 
                    y2={currentDepth - 8000} 
                    stroke="rgba(255,255,255,0.3)" 
                    strokeWidth="1" 
                    strokeDasharray="2 2" 
                  />
                </svg>
              </div>
            </div>

            {/* Legend/Stats Overlay */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
              <div className="bg-zinc-800/90 p-3 rounded-xl border border-zinc-700 backdrop-blur-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full ${inZone ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-[10px] font-bold text-white uppercase tracking-widest">
                    {inZone ? 'In Target Reservoir' : 'Out of Zone / Shale'}
                  </span>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Depth</p>
                    <p className="text-sm font-mono text-white">{currentDepth.toFixed(0)} ft</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">Gamma</p>
                    <p className="text-sm font-mono text-white">{currentGamma.toFixed(1)} API</p>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => setShowOffset(!showOffset)}
                className="p-2 bg-zinc-800 text-zinc-400 rounded-lg hover:text-white transition-colors border border-zinc-700"
              >
                {showOffset ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Interpretation Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 space-y-4">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Geological Interpretation</h4>
              <div className="space-y-3">
                {[
                  { id: 'shale', label: 'Entering Shale Cap', condition: currentGamma > 120 },
                  { id: 'sand', label: 'Entering Target Sand', condition: currentGamma < 50 && currentGamma > 0 },
                  { id: 'fault', label: 'Possible Fault / Unconformity', condition: false }
                ].map((item) => (
                  <div 
                    key={item.id}
                    className={`p-4 rounded-xl border transition-all flex items-center gap-3 ${
                      item.condition 
                        ? 'bg-white border-zinc-900 shadow-sm' 
                        : 'bg-zinc-100 border-transparent opacity-50'
                    }`}
                  >
                    {item.condition ? <CheckCircle2 size={18} className="text-emerald-500" /> : <div className="w-[18px] h-[18px] rounded-full border-2 border-zinc-200" />}
                    <span className="text-sm font-bold text-zinc-900">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center gap-3">
              <AlertTriangle className="text-amber-500" size={20} />
              <p className="text-xs text-amber-700 leading-relaxed font-medium">
                <span className="font-bold">Geosteering Tip:</span> Gamma ray lag means the tool sees the formation several feet after the bit. Always account for the "Gamma-to-Bit" distance when making steering calls.
              </p>
            </div>

            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center gap-2">
                <Target size={16} className="text-emerald-500" />
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Steering Decision</h4>
              </div>
              <p className="text-xs text-zinc-500 leading-relaxed">Based on current Gamma trends, what is your recommendation to the Directional Driller?</p>
              <div className="grid grid-cols-2 gap-2">
                <button className="bg-zinc-800 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">Build Angle</button>
                <button className="bg-zinc-800 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">Drop Angle</button>
                <button className="bg-zinc-800 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">Hold Path</button>
                <button className="bg-zinc-800 text-white py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-zinc-700 transition-colors">Check Offset</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
