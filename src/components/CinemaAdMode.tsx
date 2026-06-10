import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  GraduationCap, 
  Award, 
  Zap, 
  ShieldCheck, 
  Compass, 
  Activity,
  Play,
  ChevronRight,
  PlayCircle,
  BookOpen,
  CheckCircle2,
  Trophy,
  MousePointer2
} from 'lucide-react';
import { 
  ToolfaceDial, 
  MudPulseSimulator, 
  VibrationMonitor 
} from './visualizations';
import { mwdCurriculum } from '../data/mwdData';

interface Step {
  id: number;
  duration: number;
  title: string;
  subtitle: string;
  component?: React.ReactNode;
}

type AspectRatio = '9/16' | '16/9' | '1/1';

const steps: Step[] = [
  {
    id: 1,
    duration: 3000,
    title: "THE FUTURE OF DRILLING",
    subtitle: "Precision engineering meets digital mastery.",
  },
  {
    id: 2,
    duration: 4000,
    title: "ELITE CURRICULUM",
    subtitle: "15 targeted modules covering the entire MWD spectrum.",
    component: (
      <div className="w-full max-w-sm h-48 overflow-hidden relative rounded-2xl border border-white/10 bg-zinc-900/50">
        <motion.div 
          animate={{ y: [-10, -400] }}
          transition={{ duration: 3.5, ease: "linear" }}
          className="p-4 space-y-3"
        >
          {mwdCurriculum.map((section, i) => (
            <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold font-display">
                {i + 1}
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-white truncate w-40">{section.title}</p>
                <p className="text-[8px] text-zinc-500 uppercase tracking-widest">Section {i + 1}</p>
              </div>
            </div>
          ))}
        </motion.div>
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-zinc-900/80 via-transparent to-zinc-900/80" />
      </div>
    )
  },
  {
    id: 3,
    duration: 4500,
    title: "REAL-TIME TELEMETRY",
    subtitle: "Decode complex mud pulse signals thousands of feet down.",
    component: (
        <div className="relative">
            <div className="scale-[0.5] sm:scale-75 origin-center"><MudPulseSimulator /></div>
            <motion.div 
                animate={{ opacity: [0.2, 0.4, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="absolute inset-x-0 top-1/2 h-1 bg-emerald-500/20 blur-sm -translate-y-1/2"
            />
        </div>
    )
  },
  {
    id: 4,
    duration: 4000,
    title: "CRITICAL ASSESSMENTS",
    subtitle: "Prove your field-readiness with interactive field-quizzes.",
    component: (
      <div className="w-full max-w-sm p-6 bg-zinc-900/80 rounded-3xl border border-white/10 text-left space-y-4 shadow-2xl">
        <div className="space-y-1">
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">Question 12 of 20</p>
          <p className="text-xs font-bold text-white leading-tight">Which telemetry method uses positive pressure pulses?</p>
        </div>
        <div className="space-y-2">
          {['Mud Pulse', 'Electromagnetic', 'Wired Pipe'].map((opt, i) => (
            <motion.div 
              key={i}
              animate={i === 0 ? { 
                backgroundColor: ["rgba(255,255,255,0.05)", "rgba(16,185,129,0.2)"],
                borderColor: ["rgba(255,255,255,0.1)", "rgba(16,185,129,0.5)"]
              } : {}}
              transition={{ delay: 2, duration: 0.5 }}
              className="p-3 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-zinc-300 font-medium">{opt}</span>
                {i === 0 && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 2.2 }}
                    >
                        <CheckCircle2 size={12} className="text-emerald-500" />
                    </motion.div>
                )}
              </div>
              {i === 0 && (
                <motion.div 
                    initial={{ x: 100, opacity: 0 }}
                    animate={{ x: 60, y: 15, opacity: 1 }}
                    transition={{ delay: 1.5, duration: 0.5 }}
                    className="absolute text-emerald-500"
                >
                    <MousePointer2 size={16} fill="currentColor" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 5,
    duration: 4500,
    title: "ACHIEVE EXCELLENCE",
    subtitle: "Instantly earn badges and globally-recognized certificates.",
    component: (
      <div className="flex flex-col items-center justify-center space-y-6">
        <motion.div 
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1.2, rotate: 0 }}
            transition={{ delay: 1, type: "spring", stiffness: 200 }}
            className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-[2rem] flex items-center justify-center text-zinc-900 shadow-[0_0_50px_rgba(16,185,129,0.5)] relative"
        >
            <Trophy size={48} />
            <motion.div 
                animate={{ scale: [1, 1.5, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="absolute inset-0 border-4 border-white/50 rounded-[2rem]"
            />
        </motion.div>
        <div className="text-center">
            <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="text-xs font-display font-bold text-white tracking-[0.2em] uppercase mb-1"
            >
                Achievement Unlocked
            </motion.p>
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.7 }}
                className="text-[10px] text-emerald-500 font-medium uppercase tracking-widest"
            >
                MWD Principles Master
            </motion.p>
        </div>
      </div>
    )
  },
  {
    id: 6,
    duration: 5000,
    title: "MWD PRO",
    subtitle: "THE INDUSTRY STANDARD IN DRILLING TRAINING.",
  }
];

export const CinemaAdMode: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [ratio, setRatio] = useState<AspectRatio>('9/16');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);

  useEffect(() => {
    if (!isPlaying) return;

    if (currentStep < steps.length) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, steps[currentStep].duration);
      return () => clearTimeout(timer);
    } else {
      stopRecording();
      setIsPlaying(false);
    }
  }, [currentStep, isPlaying]);

  const startRecordingFlow = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { 
            displaySurface: 'browser',
            frameRate: 60
        },
        audio: false
      });

      chunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9'
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordingBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        setIsRecording(false);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setCurrentStep(0);
      setIsPlaying(true);
    } catch (err) {
      console.error("Recording failed:", err);
      alert("Recording permission denied or failed. Please ensure you share the 'Current Tab'.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const downloadRecording = () => {
    if (!recordingBlob) return;
    const url = URL.createObjectURL(recordingBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `MWD-Pro-Ad-${ratio.replace('/', '-')}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getRatioClass = () => {
    switch(ratio) {
      case '9/16': return 'aspect-[9/16] h-[90vh]';
      case '16/9': return 'aspect-[16/9] w-[90vw]';
      case '1/1': return 'aspect-square h-[80vh]';
    }
  };

  if (!isPlaying && !recordingBlob) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8 space-y-8 text-center overflow-auto">
        <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500 mb-4 animate-pulse">
            <GraduationCap size={32} />
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white font-display uppercase tracking-widest">AD PRODUCTION STUDIO</h1>
            <p className="text-zinc-500 text-xs max-w-xs mx-auto">
                Generate and download high-quality cinematic ads for multiple platforms.
            </p>
        </div>
        
        <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
            {(['9/16', '16/9', '1/1'] as AspectRatio[]).map((r) => (
                <button
                    key={r}
                    onClick={() => setRatio(r)}
                    className={`p-3 rounded-xl border transition-all text-[10px] font-bold uppercase tracking-widest ${ratio === r ? 'bg-emerald-500 text-zinc-900 border-emerald-500' : 'bg-transparent text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}
                >
                    {r === '9/16' ? 'Portrait' : r === '16/9' ? 'Landscape' : 'Square'}
                    <div className="mt-1 opacity-50">{r}</div>
                </button>
            ))}
        </div>

        <div className="space-y-4 w-full max-w-xs">
            <button 
                onClick={startRecordingFlow}
                className="w-full py-4 bg-emerald-500 text-zinc-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
            >
                <PlayCircle size={18} />
                Record & Export Video
            </button>
            <button 
                onClick={() => { setIsPlaying(true); setCurrentStep(0); }}
                className="w-full py-4 bg-zinc-900 text-zinc-200 rounded-2xl font-bold text-sm transition-all"
            >
                Preview Only
            </button>
            <button 
                onClick={onComplete}
                className="w-full py-2 text-zinc-600 text-[10px] uppercase font-bold tracking-widest hover:text-zinc-400"
            >
                Back to Profile
            </button>
        </div>

        <div className="pt-8 space-y-2">
            <p className="text-[9px] text-zinc-700 uppercase tracking-widest font-bold">Recommended Steps:</p>
            <ol className="text-[9px] text-zinc-600 text-left list-decimal list-inside space-y-1">
                <li>Select aspect ratio</li>
                <li>Halt browser notifications</li>
                <li>Share "This Tab" for 60FPS output</li>
            </ol>
        </div>
      </div>
    );
  }

  if (recordingBlob && !isPlaying) {
    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8 space-y-8 text-center">
            <div className="w-16 h-16 bg-emerald-500 text-zinc-900 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck size={32} />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-bold text-white font-display">AD RENDERED SUCCESSFULLY</h1>
                <p className="text-zinc-500 text-xs">Your video is ready for download.</p>
            </div>
            
            <div className="space-y-4 w-full max-w-xs">
                <button 
                    onClick={downloadRecording}
                    className="w-full py-4 bg-emerald-500 text-zinc-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all shadow-xl shadow-emerald-500/20"
                >
                    <Activity size={18} />
                    Download {ratio} Video
                </button>
                <button 
                    onClick={() => { setRecordingBlob(null); setIsPlaying(false); }}
                    className="w-full py-4 bg-zinc-900 text-zinc-200 rounded-2xl font-bold text-sm transition-all"
                >
                    Produce Another
                </button>
                <button 
                    onClick={onComplete}
                    className="w-full py-2 text-zinc-600 text-[10px] uppercase font-bold tracking-widest hover:text-zinc-400"
                >
                    Close Studio
                </button>
            </div>
        </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] overflow-hidden flex flex-col items-center justify-center p-4">
      <div className={`relative bg-black transition-all duration-700 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 ${getRatioClass()}`}>
        <AnimatePresence mode="wait">
            {step && (
            <motion.div 
                key={step.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1 }}
                className="relative w-full h-full flex flex-col items-center justify-center p-8 text-center"
            >
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#10b98108_0%,transparent_70%)]" />
                    <div className="absolute top-0 left-0 w-full h-full bg-[url('https://picsum.photos/seed/drill/1920/1080?blur=10')] bg-cover opacity-[0.03] mix-blend-overlay" />
                </div>

                <div className="relative z-10 space-y-6 sm:space-y-12 max-w-full w-full">
                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="space-y-3"
                    >
                        <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white font-display leading-[0.85] uppercase italic px-4">
                            {step.title}
                        </h2>
                        <p className="text-emerald-500 text-[8px] sm:text-[10px] font-bold tracking-[0.3em] uppercase opacity-80">
                            {step.subtitle}
                        </p>
                    </motion.div>

                    {step.component && (
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: 0.8, duration: 0.8 }}
                            className="w-full flex justify-center py-4"
                        >
                            {step.component}
                        </motion.div>
                    )}

                    {currentStep === steps.length - 1 && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 1.2, type: 'spring' }}
                            className="space-y-6"
                        >
                            <div className="w-16 h-16 sm:w-24 sm:h-24 bg-emerald-500 rounded-[1.5rem] sm:rounded-[2.5rem] flex items-center justify-center text-zinc-900 mx-auto shadow-[0_0_80px_rgba(16,185,129,0.3)]">
                                <GraduationCap size={44} />
                            </div>
                            <div className="inline-flex items-center gap-2 sm:gap-4 bg-white/5 border border-white/10 px-4 py-2 sm:px-6 sm:py-3 rounded-xl backdrop-blur-md">
                                <div className="flex gap-1 text-emerald-500">
                                    <ShieldCheck size={12} fill="currentColor" />
                                    <Zap size={12} fill="currentColor" />
                                    <Activity size={12} fill="currentColor" />
                                </div>
                                <span className="text-[7px] sm:text-[8px] text-white/60 font-bold tracking-[0.2em] uppercase italic">Pro MWD Mastery</span>
                            </div>
                        </motion.div>
                    )}
                </div>

                <div className="absolute bottom-0 left-0 w-full h-1 bg-white/5">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "100%" }}
                        transition={{ duration: step.duration / 1000, ease: "linear" }}
                        className="h-full bg-emerald-600 shadow-[0_0_10px_#059669]"
                    />
                </div>
            </motion.div>
            )}
        </AnimatePresence>
      </div>

      {isRecording && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-red-600 text-white px-4 py-2 rounded-full font-bold text-xs animate-pulse">
            <div className="w-2 h-2 bg-white rounded-full" />
            LIVE RECORDING PROCEEDING
        </div>
      )}

      <div className="mt-8 text-[9px] text-zinc-700 uppercase tracking-widest font-bold">
        Recording at 60FPS • VP9 Encoding • Professional Master
      </div>
    </div>
  );
};
