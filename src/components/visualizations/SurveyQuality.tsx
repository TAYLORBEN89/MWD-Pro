import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Compass, Target, Navigation, ShieldCheck, AlertTriangle, CheckCircle2, RefreshCw, Eye, EyeOff, Zap } from 'lucide-react';

const surveyData = [
  { depth: 1000, inc: 0.5, az: 120, g: 1.001, b: 52000, dip: 65, status: 'Good' },
  { depth: 2000, inc: 1.2, az: 125, g: 0.998, b: 51950, dip: 64, status: 'Good' },
  { depth: 3000, inc: 5.4, az: 130, g: 1.015, b: 53500, dip: 68, status: 'Warning' },
  { depth: 4000, inc: 12.8, az: 135, g: 1.002, b: 52050, dip: 65, status: 'Good' },
  { depth: 5000, inc: 25.4, az: 140, g: 0.985, b: 50500, dip: 62, status: 'Critical' },
  { depth: 6000, inc: 45.2, az: 145, g: 1.000, b: 52000, dip: 65, status: 'Good' },
];

export const SurveyQuality: React.FC = () => {
  const [activeSurvey, setActiveSurvey] = useState(0);
  const [showCorrections, setShowCorrections] = useState(false);
  const [score, setScore] = useState(0);

  const survey = surveyData[activeSurvey];

  const handleValidate = (isValid: boolean) => {
    if (isValid === (survey.status === 'Good')) {
      setScore(prev => prev + 1);
    }
    setActiveSurvey((prev) => (prev + 1) % surveyData.length);
  };

  return (
    <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl overflow-hidden">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 rounded-xl">
              <Compass className="text-indigo-500" size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 font-display">Survey Quality Control Lab</h3>
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-bold">Validation & Error Analysis</p>
            </div>
          </div>
          <div className="bg-zinc-100 px-4 py-2 rounded-xl border border-zinc-200">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Validated</p>
            <p className="text-xl font-mono text-zinc-900 leading-none">{score}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Survey Data Panel */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-zinc-50 rounded-2xl p-6 border border-zinc-100 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Survey Parameters @ {survey.depth} ft</h4>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                  survey.status === 'Good' ? 'bg-emerald-100 text-emerald-700' : 
                  survey.status === 'Warning' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {survey.status} Data
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { label: 'Inclination', value: `${survey.inc}°`, icon: Navigation },
                  { label: 'Azimuth', value: `${survey.az}°`, icon: Compass },
                  { label: 'G-Total', value: `${survey.g} G`, icon: ShieldCheck, alert: Math.abs(survey.g - 1.0) > 0.01 },
                  { label: 'B-Total', value: `${survey.b} nT`, icon: Zap, alert: Math.abs(survey.b - 52000) > 1000 },
                  { label: 'Dip Angle', value: `${survey.dip}°`, icon: Target, alert: Math.abs(survey.dip - 65) > 2 }
                ].map((param, i) => (
                  <div key={i} className={`p-4 rounded-2xl border transition-all ${
                    param.alert ? 'bg-red-50 border-red-200' : 'bg-white border-zinc-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <param.icon size={14} className={param.alert ? 'text-red-500' : 'text-zinc-400'} />
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{param.label}</p>
                    </div>
                    <p className={`text-lg font-mono font-bold ${param.alert ? 'text-red-600' : 'text-zinc-900'}`}>{param.value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => handleValidate(true)}
                className="flex-1 bg-emerald-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
              >
                <CheckCircle2 size={20} />
                Accept Survey
              </button>
              <button 
                onClick={() => handleValidate(false)}
                className="flex-1 bg-red-500 text-white py-4 rounded-2xl font-bold uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center justify-center gap-2"
              >
                <AlertTriangle size={20} />
                Reject Survey
              </button>
            </div>
          </div>

          {/* Analysis Panel */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-zinc-900 rounded-2xl p-6 border border-zinc-800 space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Error Ellipse Analysis</h4>
                <button 
                  onClick={() => setShowCorrections(!showCorrections)}
                  className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-colors"
                >
                  {showCorrections ? 'Hide Corrections' : 'Apply Corrections'}
                </button>
              </div>

              <div className="aspect-square bg-zinc-800/50 rounded-full border-2 border-zinc-700 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-[1px] bg-zinc-700" />
                  <div className="h-full w-[1px] bg-zinc-700" />
                </div>
                
                {/* Error Ellipse */}
                <motion.div 
                  animate={{ 
                    scale: showCorrections ? 0.5 : 1,
                    opacity: showCorrections ? 0.5 : 1,
                    rotate: survey.az 
                  }}
                  className="w-40 h-24 border-2 border-red-500/50 bg-red-500/10 rounded-[100%] relative"
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1 h-1 bg-red-500 rounded-full" />
                  </div>
                </motion.div>

                {showCorrections && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="absolute w-20 h-12 border-2 border-emerald-500/50 bg-emerald-500/10 rounded-[100%]"
                  />
                )}

                <div className="absolute bottom-4 left-4 text-[8px] font-bold text-zinc-600 uppercase tracking-widest">Uncertainty Visualization</div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Correction Methods</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className={`p-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest text-center transition-all ${
                    showCorrections ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                  }`}>IFR Correction</div>
                  <div className={`p-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest text-center transition-all ${
                    showCorrections ? 'bg-indigo-500/10 border-indigo-500 text-indigo-400' : 'bg-zinc-800 border-zinc-700 text-zinc-600'
                  }`}>MSAC Analysis</div>
                </div>
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100 flex items-center gap-3">
              <ShieldCheck className="text-indigo-500" size={20} />
              <p className="text-xs text-indigo-700 leading-relaxed font-medium">
                <span className="font-bold">QC Tip:</span> G-Total should always be close to 1.000 G. Significant deviations indicate magnetic interference or tool vibration during the survey.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
