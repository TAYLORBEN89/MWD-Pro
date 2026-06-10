import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Battery, Cpu, Radio, Activity, Shield, Zap } from 'lucide-react';

const components = [
  {
    id: 'pulser',
    name: 'Telemetry / Pulser',
    icon: Radio,
    description: 'Converts digital data into pressure pulses in the mud. This is the "voice" of the tool.',
    details: [
      'Positive, Negative, or Continuous Wave',
      'Mud-driven or Motor-driven',
      'Erosion-resistant materials'
    ],
    color: 'bg-blue-500'
  },
  {
    id: 'sensors',
    name: 'Sensor Package',
    icon: Activity,
    description: 'The "eyes" of the tool. Contains accelerometers and magnetometers.',
    details: [
      '3-axis Accelerometers (Inclination)',
      '3-axis Magnetometers (Azimuth)',
      'Gamma Ray detector (Lithology)'
    ],
    color: 'bg-emerald-500'
  },
  {
    id: 'electronics',
    name: 'Control Electronics',
    icon: Cpu,
    description: 'The "brain" of the tool. Processes sensor data and manages telemetry.',
    details: [
      'High-temperature rated components',
      'Memory for data storage',
      'Power regulation and distribution'
    ],
    color: 'bg-purple-500'
  },
  {
    id: 'power',
    name: 'Power System',
    icon: Battery,
    description: 'Provides electrical energy to the entire tool string.',
    details: [
      'Lithium Battery Packs (Long life)',
      'Mud Turbine (Continuous power)',
      'Hybrid systems'
    ],
    color: 'bg-amber-500'
  }
];

export const ToolArchitecture: React.FC = () => {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl overflow-hidden">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Tool Diagram */}
        <div className="flex-1 flex flex-col items-center justify-center py-8">
          <div className="relative w-full max-w-[120px] h-[400px] bg-zinc-800 rounded-full border-4 border-zinc-700 shadow-inner flex flex-col p-2 gap-2">
            {components.map((comp) => (
              <motion.button
                key={comp.id}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelectedId(comp.id)}
                className={`flex-1 rounded-full transition-all flex items-center justify-center relative group ${
                  selectedId === comp.id 
                    ? `${comp.color} shadow-[0_0_20px_rgba(0,0,0,0.5)] z-10` 
                    : 'bg-zinc-700 hover:bg-zinc-600'
                }`}
              >
                <comp.icon 
                  size={24} 
                  className={selectedId === comp.id ? 'text-white' : 'text-zinc-500 group-hover:text-zinc-300'} 
                />
                
                {/* Connector Line */}
                {selectedId === comp.id && (
                  <motion.div 
                    layoutId="connector"
                    className="absolute left-full w-8 h-1 bg-white/20"
                  />
                )}
              </motion.button>
            ))}
            
            {/* Outer Shell Labels */}
            <div className="absolute -left-16 top-0 bottom-0 flex flex-col justify-around text-[10px] font-bold text-zinc-600 uppercase tracking-widest [writing-mode:vertical-rl] rotate-180">
              <span>Pressure Barrel</span>
              <span>Non-Magnetic Collar</span>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="flex-1 min-h-[300px] flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {selectedId ? (
              <motion.div
                key={selectedId}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {(() => {
                  const comp = components.find(c => c.id === selectedId)!;
                  return (
                    <>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-2xl ${comp.color}`}>
                          <comp.icon size={32} className="text-white" />
                        </div>
                        <div>
                          <h3 className="text-2xl font-bold text-white font-display">{comp.name}</h3>
                          <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-tighter">
                            <Shield size={12} />
                            <span>Ruggedized Component</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-zinc-400 leading-relaxed">
                        {comp.description}
                      </p>

                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Key Features</h4>
                        <ul className="space-y-2">
                          {comp.details.map((detail, i) => (
                            <li key={i} className="flex items-center gap-3 text-sm text-zinc-300">
                              <Zap size={14} className="text-emerald-500" />
                              {detail}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center space-y-4"
              >
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center text-zinc-600 mx-auto">
                  <Activity size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Interactive Tool Explorer</h3>
                  <p className="text-zinc-500 text-sm">Click on any section of the MWD tool to explore its internal architecture and function.</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
