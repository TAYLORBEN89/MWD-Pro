import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Activity, Zap, Droplets, Thermometer, ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';

const logTypes = [
  {
    id: 'gamma',
    title: 'Gamma Ray',
    description: 'Measures natural radioactivity to identify lithology (shale vs. sand).',
    unit: 'API',
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    icon: Activity,
    typicalValues: { shale: '150+', sand: '0-50' }
  },
  {
    id: 'resistivity',
    title: 'Resistivity',
    description: 'Measures formation fluid content. Hydrocarbons are resistive; saltwater is conductive.',
    unit: 'Ohm-m',
    color: 'text-amber-500',
    bg: 'bg-amber-500/10',
    icon: Zap,
    typicalValues: { oil: '100+', water: '< 1' }
  },
  {
    id: 'density',
    title: 'Density',
    description: 'Measures formation bulk density to calculate porosity and identify rock type.',
    unit: 'g/cc',
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    icon: Layers,
    typicalValues: { sandstone: '2.65', shale: '2.72' }
  },
  {
    id: 'neutron',
    title: 'Neutron Porosity',
    description: 'Measures hydrogen index to estimate porosity. Often used with density for gas detection.',
    unit: '%',
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    icon: Droplets,
    typicalValues: { reservoir: '15-30%', tight: '< 5%' }
  }
];

export const AdvancedLogs: React.FC = () => {
  const [activeLog, setActiveLog] = useState(0);
  const [showInterpretation, setShowInterpretation] = useState(false);

  const currentLog = logTypes[activeLog];

  return (
    <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl overflow-hidden relative">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Layers className="text-blue-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">Advanced Formation Evaluation</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">LWD Multi-Sensor Interpretation</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowInterpretation(!showInterpretation)}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all border ${
                showInterpretation ? 'bg-blue-500 text-white border-blue-500' : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:border-zinc-500'
              }`}
            >
              {showInterpretation ? 'Hide Interpretation' : 'Show Interpretation'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-4 space-y-2">
            {logTypes.map((log, i) => (
              <button
                key={log.id}
                onClick={() => setActiveLog(i)}
                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 border ${
                  activeLog === i 
                    ? 'bg-white border-white text-zinc-900 shadow-lg' 
                    : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:bg-zinc-700 hover:text-zinc-300'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeLog === i ? log.bg : 'bg-zinc-900'}`}>
                  <log.icon size={20} className={activeLog === i ? log.color : 'text-zinc-600'} />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Sensor Type</p>
                  <p className="font-bold">{log.title}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 bg-zinc-800/50 rounded-3xl p-6 border border-zinc-700/50">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeLog}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <h4 className="text-xl font-bold text-white">{currentLog.title}</h4>
                    <p className="text-sm text-zinc-400 leading-relaxed">{currentLog.description}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Unit</p>
                    <p className="text-2xl font-mono text-white">{currentLog.unit}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(currentLog.typicalValues).map(([key, value]) => (
                    <div key={key} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 space-y-1">
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{key}</p>
                      <p className="text-lg font-mono text-white">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Simulated Log Chart */}
                <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800 h-40 relative overflow-hidden">
                  <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path 
                      d={`M ${[...Array(40)].map((_, i) => `${i * 10},${50 + (Math.random() - 0.5) * 40}`).join(' L ')}`}
                      fill="none"
                      stroke={currentLog.id === 'gamma' ? '#10b981' : currentLog.id === 'resistivity' ? '#f59e0b' : '#3b82f6'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="opacity-50"
                    />
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1 }}
                      d={`M ${[...Array(40)].map((_, i) => `${i * 10},${50 + (Math.random() - 0.5) * 40}`).join(' L ')}`}
                      fill="none"
                      stroke={currentLog.id === 'gamma' ? '#10b981' : currentLog.id === 'resistivity' ? '#f59e0b' : '#3b82f6'}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <div className="absolute top-2 right-2 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Real-Time Sensor Stream</div>
                </div>

                {showInterpretation && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20 flex items-center gap-3 text-blue-400"
                  >
                    <ShieldCheck size={20} />
                    <p className="text-xs font-medium leading-relaxed">
                      <span className="text-white font-bold">Interpretation:</span> {
                        currentLog.id === 'resistivity' 
                          ? 'High resistivity in a low gamma zone indicates potential hydrocarbons. Low resistivity indicates saltwater.'
                          : currentLog.id === 'density'
                          ? 'Density-Neutron "crossover" is a classic indicator of gas-bearing formations.'
                          : 'Gamma ray is your primary lithology indicator, used to correlate all other LWD measurements.'
                      }
                    </p>
                  </motion.div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-700/30 flex items-center gap-4">
          <div className="p-2 bg-zinc-800 rounded-xl">
            <AlertTriangle className="text-zinc-500" size={20} />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-white font-bold">MWD Pro Tip:</span> Advanced LWD sensors like Density and Neutron require specific mud properties and tool rotation for accurate readings. Always check your sensor QC channels.
          </p>
        </div>
      </div>
    </div>
  );
};
