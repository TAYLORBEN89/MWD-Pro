import React, { useState } from 'react';
import { AlertTriangle, Info } from 'lucide-react';

interface Case {
  id: string;
  title: string;
  readings: { l: string; v: string; bad?: boolean }[];
  options: string[];
  answer: number;
  why: string;
}

const CASES: Case[] = [
  {
    id: 'nopulse',
    title: 'No pulses on surface',
    readings: [
      { l: 'SPP', v: '2,840 psi' },
      { l: 'ΔP pulse', v: '0 psi', bad: true },
      { l: 'Flow', v: '480 gpm' },
      { l: 'Batt', v: '28.4 V' },
    ],
    options: [
      'Decoder software crash',
      'Poppet stuck open / no restriction',
      'Gamma detector failed',
    ],
    answer: 1,
    why: 'Pumps and voltage are fine, but standpipe never ticks. The pulser is not creating a restriction. Check poppet, solenoid, and whether the tool is even powered into pulse mode.',
  },
  {
    id: 'weak',
    title: 'Pulses too small to decode',
    readings: [
      { l: 'ΔP pulse', v: '14 psi', bad: true },
      { l: 'Expected', v: '70–120 psi' },
      { l: 'Flow', v: '510 gpm' },
      { l: 'Hours', v: '86 h' },
    ],
    options: [
      'Worn orifice / eroded poppet',
      'Wrong magnetic declination',
      'Accelerometer bias',
    ],
    answer: 0,
    why: 'Amplitude died after a long abrasive run. That is mechanical wear, not a survey-math problem. Pull before you lose the word entirely.',
  },
  {
    id: 'btot',
    title: 'Surveys fail Btot',
    readings: [
      { l: 'Btot', v: '55,880 nT', bad: true },
      { l: 'Ref', v: '52,140 nT' },
      { l: 'Gtot', v: '1.001 g' },
      { l: 'Dip', v: '69.8°', bad: true },
    ],
    options: [
      'Pump noise on the decoder',
      'Steel too close to magnetometers',
      'Dead gamma crystal',
    ],
    answer: 1,
    why: 'Gravity is clean, magnetic field is not. That is BHA steel or a hotspot, not telemetry. Check NMDC spacing and MSA — do not keep the azimuth.',
  },
  {
    id: 'gamma0',
    title: 'Gamma stuck at zero',
    readings: [
      { l: 'GR', v: '0 API', bad: true },
      { l: 'Pulses', v: 'OK' },
      { l: 'Surveys', v: 'Pass' },
      { l: 'Temp', v: '118 °C' },
    ],
    options: [
      'You are in clean salt — real zero',
      'Detector / HV supply failed',
      'Declination file missing',
    ],
    answer: 1,
    why: 'Even clean sand reads a few API of background. A hard zero with good surveys is a dead scintillator or high-voltage supply.',
  },
  {
    id: 'resets',
    title: 'Tool resets every stand',
    readings: [
      { l: 'Lateral', v: '8.4 g RMS', bad: true },
      { l: 'RPM', v: '172' },
      { l: 'WOB', v: '8 klbf' },
      { l: 'Resets', v: '6 / 4 hr', bad: true },
    ],
    options: [
      'Whirl — light WOB, high RPM',
      'Battery end of life',
      'Standpipe transducer cal',
    ],
    answer: 0,
    why: 'High lateral g with fast RPM and light weight is classic whirl. Electronics brown-out and reboot. Drop RPM or add WOB before the board lets go for good.',
  },
];

export const FailureDiagnosis: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [pick, setPick] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);
  const c = CASES[idx];
  const revealed = pick !== null;

  const choose = (i: number) => {
    if (revealed) return;
    setPick(i);
    setAsked((n) => n + 1);
    if (i === c.answer) setScore((s) => s + 1);
  };

  const next = () => {
    setPick(null);
    setIdx((n) => (n + 1) % CASES.length);
  };

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <AlertTriangle size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Failure Diagnosis</h3>
            <p className="instrument-subtitle">Read the gauges, pick the cause</p>
          </div>
        </div>
        <span className="instrument-chip">
          {score}/{asked || '—'}
        </span>
      </div>

      <p className="text-sm font-semibold text-zinc-100">{c.title}</p>

      <div className="grid grid-cols-4 gap-1.5">
        {c.readings.map((r) => (
          <div
            key={r.l}
            className={`rounded-lg border px-1.5 py-1.5 ${
              r.bad ? 'border-red-500/30 bg-red-500/10' : 'border-white/10 bg-[#07080a]'
            }`}
          >
            <p className="label-caps">{r.l}</p>
            <p className={`text-[11px] font-mono font-semibold tabular-nums ${r.bad ? 'text-red-300' : 'text-zinc-100'}`}>
              {r.v}
            </p>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        {c.options.map((opt, i) => {
          let cls = 'border-white/10 bg-[#07080a] text-zinc-300';
          if (revealed && i === c.answer) cls = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
          else if (revealed && i === pick) cls = 'border-red-500/40 bg-red-500/10 text-red-300';
          return (
            <button
              key={opt}
              type="button"
              onClick={() => choose(i)}
              className={`w-full text-left rounded-lg border px-2.5 py-2 text-[12px] ${cls}`}
            >
              {opt}
            </button>
          );
        })}
      </div>

      {revealed && (
        <button type="button" onClick={next} className="instrument-btn is-active w-full">
          Next case
        </button>
      )}

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>{revealed ? c.why : 'Ignore the job title. Read which channel is actually sick.'}</p>
      </div>
    </div>
  );
};
