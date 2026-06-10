import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Activity, Zap, Thermometer, ShieldCheck, RefreshCw, CheckCircle2, XCircle } from 'lucide-react';

const failureScenarios = [
  {
    id: 'pulser-wear',
    title: 'Pulser Erosion',
    symptoms: ['Decreasing pulse amplitude', 'Erratic pulse shape', 'Increased signal noise'],
    category: 'Mechanical',
    description: 'High velocity mud flow has eroded the poppet or orifice, reducing the pressure drop.',
    correctDiagnosis: 'Mechanical Failure'
  },
  {
    id: 'vibe-out',
    title: 'Vibration Overload',
    symptoms: ['Repeated CPU resets', 'Erratic sensor readings', 'Memory corruption'],
    category: 'Environmental',
    description: 'Excessive lateral vibration (whirl) has exceeded the tool\'s design limits, causing electronics instability.',
    correctDiagnosis: 'Environmental Failure'
  },
  {
    id: 'battery-depletion',
    title: 'Power Loss',
    symptoms: ['Weakening pulse amplitude', 'Slow telemetry updates', 'Communication timeouts'],
    category: 'Electrical',
    description: 'The downhole battery pack has reached its end of life, leading to insufficient power for the pulser.',
    correctDiagnosis: 'Electrical Failure'
  },
  {
    id: 'sensor-drift',
    title: 'Thermal Drift',
    symptoms: ['Inconsistent survey data', 'Azimuth shifts', 'Temperature warnings'],
    category: 'Electrical',
    description: 'High downhole temperatures have caused the magnetometers or accelerometers to drift out of calibration.',
    correctDiagnosis: 'Electrical Failure'
  }
];

export const FailureDiagnosis: React.FC = () => {
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);

  const scenario = failureScenarios[currentScenarioIndex];

  const handleDiagnose = (diagnosis: string) => {
    setSelectedDiagnosis(diagnosis);
    setShowResult(true);
    if (diagnosis === scenario.correctDiagnosis) {
      setScore(prev => prev + 1);
    }
  };

  const nextScenario = () => {
    setSelectedDiagnosis(null);
    setShowResult(false);
    setCurrentScenarioIndex((prev) => (prev + 1) % failureScenarios.length);
  };

  return (
    <div className="bg-zinc-900 rounded-3xl p-8 border border-zinc-800 shadow-2xl overflow-hidden relative">
      {/* Background Grid Accent */}
      <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

      <div className="relative flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/10 rounded-xl">
              <AlertTriangle className="text-red-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white font-display">MWD Failure Diagnostic Lab</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Post-Run Analysis Simulator</p>
            </div>
          </div>
          <div className="bg-zinc-800 px-4 py-2 rounded-xl border border-zinc-700">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Score</p>
            <p className="text-xl font-mono text-white leading-none">{score}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Symptoms Panel */}
          <div className="space-y-6">
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-zinc-700/50 space-y-4">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-zinc-500" />
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Real-Time Symptoms</h4>
              </div>
              <div className="space-y-3">
                {scenario.symptoms.map((symptom, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-3 bg-zinc-900 p-3 rounded-xl border border-zinc-800"
                  >
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-zinc-300 font-medium">{symptom}</span>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/30 text-center">
                <Thermometer className="mx-auto mb-2 text-zinc-500" size={20} />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Temp</p>
                <p className="text-lg font-mono text-white">145°C</p>
              </div>
              <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/30 text-center">
                <Zap className="mx-auto mb-2 text-zinc-500" size={20} />
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Voltage</p>
                <p className="text-lg font-mono text-white">24.2V</p>
              </div>
            </div>
          </div>

          {/* Diagnosis Panel */}
          <div className="space-y-6">
            <div className="space-y-3">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Select Diagnosis</p>
              {['Mechanical Failure', 'Electrical Failure', 'Environmental Failure'].map((diagnosis) => (
                <button
                  key={diagnosis}
                  disabled={showResult}
                  onClick={() => handleDiagnose(diagnosis)}
                  className={`w-full p-4 rounded-2xl text-left transition-all border flex items-center justify-between ${
                    selectedDiagnosis === diagnosis
                      ? diagnosis === scenario.correctDiagnosis
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : 'bg-red-500/10 border-red-500 text-red-500'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                  }`}
                >
                  <span className="font-bold">{diagnosis}</span>
                  {selectedDiagnosis === diagnosis && (
                    diagnosis === scenario.correctDiagnosis ? <CheckCircle2 size={20} /> : <XCircle size={20} />
                  )}
                </button>
              ))}
            </div>

            <AnimatePresence>
              {showResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-zinc-800/80 p-6 rounded-2xl border border-zinc-700 space-y-4"
                >
                  <div className="space-y-2">
                    <h5 className="text-white font-bold flex items-center gap-2">
                      {selectedDiagnosis === scenario.correctDiagnosis ? (
                        <span className="text-emerald-500">Correct Diagnosis: {scenario.title}</span>
                      ) : (
                        <span className="text-red-500">Incorrect Diagnosis</span>
                      )}
                    </h5>
                    <p className="text-sm text-zinc-400 leading-relaxed">{scenario.description}</p>
                  </div>
                  <button
                    onClick={nextScenario}
                    className="w-full bg-white text-zinc-900 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-zinc-200 transition-colors flex items-center justify-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Next Case Study
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="bg-zinc-800/30 rounded-2xl p-4 border border-zinc-700/30 flex items-center gap-4">
          <div className="p-2 bg-zinc-800 rounded-xl">
            <ShieldCheck className="text-zinc-500" size={20} />
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">
            <span className="text-white font-bold">Reliability Tip:</span> Always compare real-time logs to memory data post-run. Memory data has higher resolution and can reveal intermittent failures that telemetry might miss.
          </p>
        </div>
      </div>
    </div>
  );
};
