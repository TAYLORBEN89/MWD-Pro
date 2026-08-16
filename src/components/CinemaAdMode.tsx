import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  GraduationCap,
  Zap,
  ShieldCheck,
  Activity,
  PlayCircle,
  Compass,
} from 'lucide-react';
import { mwdCurriculum } from '../data/mwdData';
import { getModuleCover } from '../data/moduleCovers';
import { getSimLabCover, simLabCatalog } from '../data/simLab';

interface Step {
  id: number;
  duration: number;
  title: string;
  subtitle: string;
  component?: React.ReactNode;
}

function PhotoCard({
  src,
  kicker,
  title,
  badge,
}: {
  src: string;
  kicker: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 aspect-[16/9] bg-black">
      <img src={src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />
      {badge && (
        <span className="absolute top-2 right-2 rounded-full bg-emerald-500 px-2 py-0.5 text-[9px] font-bold text-zinc-950">
          {badge}
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 p-3 text-left">
        <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-emerald-400">{kicker}</p>
        <p className="mt-0.5 text-[13px] font-bold leading-tight text-white">{title}</p>
      </div>
    </div>
  );
}

function LabRow({
  id,
  title,
  subtitle,
  free,
}: {
  id: string;
  title: string;
  subtitle: string;
  free: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/10 min-h-[64px]">
      <img src={getSimLabCover(id)} alt="" className="absolute inset-0 h-full w-full object-cover object-right" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/95 via-zinc-950/70 to-zinc-950/20" />
      <div className="relative z-10 flex items-center gap-3 px-3 py-2.5 text-left">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 text-emerald-400">
          <Compass size={14} />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-bold text-white">{title}</p>
            <span className={`rounded-full px-1.5 py-px text-[8px] font-bold uppercase ${free ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-300'}`}>
              {free ? 'Free' : 'Pro'}
            </span>
          </div>
          <p className="text-[10px] text-zinc-400">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

const featuredLabs = simLabCatalog.slice(0, 3);

const steps: Step[] = [
  {
    id: 1,
    duration: 3800,
    title: 'MWD PRO',
    subtitle: 'Petro Academy Training',
    component: (
      <div className="w-full max-w-sm space-y-4">
        <p className="text-sm leading-relaxed text-zinc-400">
          Master the art of <span className="font-semibold text-white">Measurement While Drilling</span> with our professional certification program.
        </p>
        <div className="rounded-xl bg-emerald-500 py-3 text-sm font-extrabold text-zinc-950">Get Started</div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-600">Version 1.11 · Professional Edition</p>
      </div>
    ),
  },
  {
    id: 2,
    duration: 4500,
    title: '15 MODULES',
    subtitle: 'Photo-card lessons. Read, lab, then pass at 80%.',
    component: (
      <div className="grid w-full max-w-sm gap-2.5">
        <PhotoCard
          src={getModuleCover('section-1')}
          kicker="Module 1"
          title={mwdCurriculum[0].title}
          badge="Free"
        />
        <PhotoCard
          src={getModuleCover('section-2')}
          kicker="Module 2"
          title={mwdCurriculum[1].title}
          badge="Free"
        />
      </div>
    ),
  },
  {
    id: 3,
    duration: 4500,
    title: 'SIM LABS',
    subtitle: 'Run every instrument. Free labs open now.',
    component: (
      <div className="flex w-full max-w-sm flex-col gap-2">
        {featuredLabs.map((lab) => (
          <LabRow
            key={lab.id}
            id={lab.id}
            title={lab.title}
            subtitle={lab.subtitle}
            free={lab.isFree}
          />
        ))}
      </div>
    ),
  },
  {
    id: 4,
    duration: 5000,
    title: 'STEER THE WELL',
    subtitle: 'Toolface Control. Slide, survey, land the curve.',
    component: (
      <div className="w-full max-w-sm space-y-3 rounded-2xl border border-white/10 bg-zinc-950/80 p-3">
        <div className="flex gap-1.5">
          <div className="flex-1 rounded border border-emerald-500 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-white">Kop Build</div>
          <div className="flex-1 rounded border border-white/15 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-zinc-500">Hold + Turn</div>
          <div className="flex-1 rounded border border-white/15 px-2 py-1 text-center text-[9px] font-bold uppercase tracking-wider text-zinc-500">Recovery</div>
        </div>
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-2">
          <div className="rounded-xl border border-white/10 bg-[#07080a] p-2">
            <svg viewBox="0 0 220 140" className="h-auto w-full" role="img" aria-label="Well profile">
              <rect width="220" height="140" fill="#07080a" />
              <line x1="28" y1="70" x2="210" y2="70" stroke="rgba(255,255,255,0.08)" />
              <line x1="118" y1="8" x2="118" y2="124" stroke="rgba(255,255,255,0.08)" />
              <path d="M36 18 C 90 40, 150 88, 204 122" fill="none" stroke="#6b7280" strokeDasharray="3 5" />
              <motion.path
                d="M36 18 C 58 28, 72 38, 86 52"
                fill="none"
                stroke="#3ecf8e"
                strokeWidth="2.2"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 2.4, ease: 'easeInOut' }}
              />
              <circle cx="36" cy="18" r="3" fill="#9ca3af" />
              <circle cx="86" cy="52" r="3.5" fill="#fff" />
              <text x="8" y="16" fill="#8a9099" fontSize="8">TVD</text>
            </svg>
            <div className="mt-1 grid grid-cols-3 text-left">
              <div>
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Inc</p>
                <p className="text-sm font-bold text-white">9.2°</p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Azi</p>
                <p className="text-sm font-bold text-white">89.4°</p>
              </div>
              <div>
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Dls</p>
                <p className="text-sm font-bold text-white">8.5</p>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-center justify-between rounded-xl border border-white/10 bg-[#07080a] p-2">
            <svg viewBox="0 0 120 120" className="h-24 w-24">
              <circle cx="60" cy="60" r="46" fill="none" stroke="#3aa8b8" strokeWidth="1.5" />
              <text x="60" y="16" textAnchor="middle" fill="#8a9099" fontSize="8">N</text>
              <text x="60" y="116" textAnchor="middle" fill="#8a9099" fontSize="8">S</text>
              <text x="8" y="64" fill="#8a9099" fontSize="8">W</text>
              <text x="104" y="64" fill="#8a9099" fontSize="8">E</text>
              <line x1="60" y1="60" x2="102" y2="60" stroke="#4d8ecf" strokeWidth="3" />
              <circle cx="60" cy="60" r="3.5" fill="#fff" />
            </svg>
            <div className="w-full rounded border border-[#c47b3a] py-1 text-center text-[9px] font-bold uppercase tracking-wider text-[#c47b3a]">
              Slide
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 5,
    duration: 4500,
    title: 'CERTIFIED',
    subtitle: 'Pass the final at 80%. Walk with the ticket.',
    component: (
      <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-900 px-5 py-6 text-center">
        <div className="mb-4 h-1.5 bg-emerald-500" />
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-400">Certificate of Completion</p>
        <p className="mt-2 text-xl font-black tracking-tight text-white">MWD PROFESSIONAL</p>
        <p className="mt-3 text-[10px] italic text-zinc-500">This is to certify that</p>
        <p className="mt-1 inline-block border-b border-white/15 px-4 pb-1 text-lg font-bold text-white">Jordan Hale</p>
        <p className="mx-auto mt-3 max-w-[240px] text-[11px] leading-relaxed text-zinc-400">
          Has completed the MWD curriculum and demonstrated mastery in dynamics, telemetry, and formation evaluation.
        </p>
        <div className="mt-5 flex items-end justify-between">
          <div className="text-left">
            <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-500">Date issued</p>
            <p className="text-xs font-bold text-white">Aug 15, 2026</p>
          </div>
          <div className="flex h-10 w-10 rotate-6 items-center justify-center rounded-xl bg-emerald-500 text-lg font-black text-zinc-950">★</div>
        </div>
        <div className="mt-4 h-1.5 bg-emerald-500" />
      </div>
    ),
  },
  {
    id: 6,
    duration: 4800,
    title: 'MWD PRO',
    subtitle: 'Train like you are on the rig.',
  },
];

export const CinemaAdMode: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;
    if (currentStep >= steps.length) {
      setIsPlaying(false);
      return;
    }
    const timer = setTimeout(() => {
      setCurrentStep((prev) => prev + 1);
    }, steps[currentStep].duration);
    return () => clearTimeout(timer);
  }, [currentStep, isPlaying]);

  const replay = () => {
    setCurrentStep(0);
    setIsPlaying(true);
  };

  if (!isPlaying || currentStep >= steps.length) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center p-8 space-y-6 text-center">
        <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-zinc-900">
          <GraduationCap size={32} />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white font-display">MWD Pro</h1>
          <p className="text-zinc-500 text-sm">Train like you&apos;re on the rig.</p>
        </div>
        <div className="space-y-3 w-full max-w-xs">
          <button
            type="button"
            onClick={replay}
            className="w-full py-4 bg-emerald-500 text-zinc-900 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
          >
            <PlayCircle size={18} /> Watch again
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-3 text-zinc-400 text-sm font-medium"
          >
            Back to Profile
          </button>
        </div>
      </div>
    );
  }

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 z-[9999] bg-[#050505] overflow-hidden flex flex-col items-center justify-center p-4">
      <button
        type="button"
        onClick={onComplete}
        className="absolute top-4 right-4 z-20 text-[11px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white"
      >
        Close
      </button>
      <div className="relative bg-black transition-all duration-700 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)] border border-white/5 aspect-[9/16] h-[90vh] max-w-md w-full">
        <AnimatePresence mode="wait">
          {step && (
            <motion.div
              key={step.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.7 }}
              className="relative w-full h-full flex flex-col items-center justify-center p-6 text-center"
            >
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,#10b98108_0%,transparent_70%)]" />
                <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_20%_0%,#ffffff08_0%,transparent_45%)]" />
              </div>

              <div className="relative z-10 space-y-5 max-w-full w-full">
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.35, duration: 0.7 }}
                  className="space-y-2"
                >
                  <h2 className="text-3xl sm:text-5xl font-black tracking-tighter text-white font-display leading-[0.85] uppercase italic px-2">
                    {step.title}
                  </h2>
                  <p className="text-emerald-500 text-[8px] sm:text-[10px] font-bold tracking-[0.22em] uppercase opacity-80 px-4">
                    {step.subtitle}
                  </p>
                </motion.div>

                {step.component && (
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.55, duration: 0.7 }}
                    className="w-full flex justify-center"
                  >
                    {step.component}
                  </motion.div>
                )}

                {currentStep === steps.length - 1 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1, type: 'spring' }}
                    className="space-y-5"
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
                  animate={{ width: '100%' }}
                  transition={{ duration: step.duration / 1000, ease: 'linear' }}
                  className="h-full bg-emerald-600 shadow-[0_0_10px_#059669]"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
