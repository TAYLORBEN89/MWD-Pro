import React, { useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';

const G_REF = 1.0;
const B_REF = 52140;
const DIP_REF = 66.4;
const G_WIN = 0.005;
const B_WIN = 250;
const DIP_WIN = 0.3;

interface Station {
  md: number;
  inc: number;
  azi: number;
  g: number;
  b: number;
  dip: number;
  note: string;
}

const STATIONS: Station[] = [
  { md: 1840, inc: 0.4, azi: 118.2, g: 1.001, b: 52110, dip: 66.3, note: 'Shallow, pumps-off, clean field.' },
  { md: 3120, inc: 12.6, azi: 126.4, g: 0.999, b: 52080, dip: 66.5, note: 'Build section. Still inside windows.' },
  { md: 4480, inc: 44.1, azi: 131.0, g: 1.014, b: 52190, dip: 66.6, note: 'Gtot high — pipe still moving, or sag.' },
  { md: 5960, inc: 71.8, azi: 138.7, g: 1.000, b: 54820, dip: 68.9, note: 'Btot and dip blown — steel too close.' },
  { md: 7210, inc: 88.4, azi: 140.1, g: 0.998, b: 52040, dip: 66.2, note: 'Lateral. Quiet station. Keep it.' },
  { md: 8640, inc: 89.1, azi: 141.8, g: 0.982, b: 51990, dip: 66.1, note: 'Gtot low — take it again, do not send.' },
];

function grade(s: Station) {
  const gOk = Math.abs(s.g - G_REF) <= G_WIN;
  const bOk = Math.abs(s.b - B_REF) <= B_WIN;
  const dOk = Math.abs(s.dip - DIP_REF) <= DIP_WIN;
  const pass = gOk && bOk && dOk;
  return { gOk, bOk, dOk, pass };
}

export const SurveyQuality: React.FC = () => {
  const [idx, setIdx] = useState(0);
  const [choice, setChoice] = useState<'pass' | 'fail' | null>(null);
  const [score, setScore] = useState(0);
  const [asked, setAsked] = useState(0);
  const s = STATIONS[idx];
  const g = grade(s);

  const decide = (c: 'pass' | 'fail') => {
    if (choice) return;
    setChoice(c);
    setAsked((n) => n + 1);
    const correct = c === 'pass' ? g.pass : !g.pass;
    if (correct) setScore((n) => n + 1);
  };

  const next = () => {
    setChoice(null);
    setIdx((i) => (i + 1) % STATIONS.length);
  };

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Survey Quality Control</h3>
            <p className="instrument-subtitle">
              G ±{G_WIN} g · B ±{B_WIN} nT · dip ±{DIP_WIN}°
            </p>
          </div>
        </div>
        <span className="instrument-chip">
          {score}/{asked || '—'}
        </span>
      </div>

      <p className="text-[12px] text-zinc-400">
        Station {s.md.toLocaleString()} ft MD · Inc {s.inc.toFixed(1)}° · Azi {s.azi.toFixed(1)}°
      </p>

      <div className="grid grid-cols-3 gap-1.5">
        {[
          { l: 'Gtot', v: `${s.g.toFixed(3)} g`, ok: g.gOk, ref: `${G_REF.toFixed(3)}` },
          { l: 'Btot', v: `${s.b.toLocaleString()} nT`, ok: g.bOk, ref: `${B_REF.toLocaleString()}` },
          { l: 'Dip', v: `${s.dip.toFixed(1)}°`, ok: g.dOk, ref: `${DIP_REF.toFixed(1)}°` },
        ].map((row) => (
          <div
            key={row.l}
            className={`rounded-lg border px-2 py-2 ${
              row.ok ? 'border-white/10 bg-[#07080a]' : 'border-red-500/30 bg-red-500/10'
            }`}
          >
            <p className="label-caps">{row.l}</p>
            <p className={`text-sm font-mono font-semibold tabular-nums ${row.ok ? 'text-zinc-100' : 'text-red-300'}`}>
              {row.v}
            </p>
            <p className="text-[10px] text-zinc-500 font-mono">ref {row.ref}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => decide('pass')}
          className={`instrument-btn flex-1 ${choice === 'pass' ? 'is-active' : ''}`}
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => decide('fail')}
          className={`instrument-btn flex-1 ${choice === 'fail' ? (g.pass ? '' : 'is-active') : ''}`}
        >
          Reject
        </button>
      </div>

      {choice && (
        <button type="button" onClick={next} className="instrument-btn w-full">
          Next station
        </button>
      )}

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          {choice
            ? `${choice === (g.pass ? 'pass' : 'fail') ? 'Correct.' : 'Wrong.'} ${s.note} ${
                g.pass ? 'All three scalars inside the window.' : 'A failed scalar means the azimuth is not proven.'
              }`
            : 'Accept only if Gtot, Btot, and dip all sit inside the window. One red channel is a reject.'}
        </p>
      </div>
    </div>
  );
};
