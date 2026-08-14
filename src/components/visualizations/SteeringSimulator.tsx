import React, { useEffect, useMemo, useState } from 'react';
import { Crosshair, Info, Pause, Play, RotateCcw } from 'lucide-react';

type Mode = 'slide' | 'rotate';

interface Pt {
  md: number;
  inc: number;
  tvd: number;
  vs: number;
}

const YIELD = 0.08;
const MD_MAX = 1800;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export const SteeringSimulator: React.FC = () => {
  const [mode, setMode] = useState<Mode>('rotate');
  const [gtf, setGtf] = useState(0);
  const [running, setRunning] = useState(false);
  const [pts, setPts] = useState<Pt[]>([{ md: 0, inc: 0, tvd: 0, vs: 0 }]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setPts((prev) => {
        const last = prev[prev.length - 1];
        if (last.md >= MD_MAX) {
          setRunning(false);
          return prev;
        }
        const dmd = 8;
        let dInc = 0;
        if (mode === 'slide') {
          dInc = YIELD * dmd * Math.cos((gtf * Math.PI) / 180);
        } else {
          dInc = -0.008 * last.inc;
        }
        const inc = clamp(last.inc + dInc, 0, 95);
        const i1 = (last.inc * Math.PI) / 180;
        const i2 = (inc * Math.PI) / 180;
        const tvd = last.tvd + (dmd / 2) * (Math.cos(i1) + Math.cos(i2));
        const vs = last.vs + (dmd / 2) * (Math.sin(i1) + Math.sin(i2));
        return [...prev, { md: last.md + dmd, inc, tvd, vs }];
      });
    }, 70);
    return () => window.clearInterval(id);
  }, [running, mode, gtf]);

  const last = pts[pts.length - 1];
  const dls = useMemo(() => {
    if (pts.length < 2) return 0;
    const a = pts[pts.length - 2];
    return (Math.abs(last.inc - a.inc) * 100) / Math.max(1, last.md - a.md);
  }, [pts, last]);

  const W = 260;
  const H = 150;
  const maxTvd = Math.max(400, last.tvd);
  const maxVs = Math.max(200, last.vs);
  const path = pts
    .map((p, i) => {
      const x = 16 + (p.vs / maxVs) * (W - 28);
      const y = 10 + (p.tvd / maxTvd) * (H - 22);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  const gtfRad = ((gtf - 90) * Math.PI) / 180;

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Crosshair size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Steering Simulator</h3>
            <p className="instrument-subtitle">Motor yield 8°/100 ft · GTF</p>
          </div>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => {
              if (last.md >= MD_MAX) {
                setPts([{ md: 0, inc: 0, tvd: 0, vs: 0 }]);
              }
              setRunning((v) => !v);
            }}
            className={`instrument-btn ${running ? 'is-active' : ''}`}
          >
            {running ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <button
            type="button"
            onClick={() => {
              setRunning(false);
              setPts([{ md: 0, inc: 0, tvd: 0, vs: 0 }]);
            }}
            className="instrument-btn"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      <div className="flex gap-1">
        {(['rotate', 'slide'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`instrument-btn flex-1 capitalize ${mode === m ? 'is-active' : ''}`}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#07080a] p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-36">
          {[0, 0.5, 1].map((t) => (
            <line
              key={t}
              x1="16"
              x2={W - 12}
              y1={10 + t * (H - 22)}
              y2={10 + t * (H - 22)}
              stroke="rgba(255,255,255,0.06)"
            />
          ))}
          <path d={path} fill="none" stroke="#10b981" strokeWidth="2" />
          <circle
            cx={16 + (last.vs / maxVs) * (W - 28)}
            cy={10 + (last.tvd / maxTvd) * (H - 22)}
            r="3"
            fill="#e4e4e7"
          />
          <text x="16" y={H - 2} fill="#52525b" fontSize="8">
            VS →
          </text>
          <text x="2" y="18" fill="#52525b" fontSize="8">
            TVD
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { l: 'MD', v: `${last.md.toFixed(0)} ft` },
          { l: 'Inc', v: `${last.inc.toFixed(1)}°` },
          { l: 'TVD', v: `${last.tvd.toFixed(0)} ft` },
          { l: 'DLS', v: `${dls.toFixed(1)}°/100` },
        ].map((m) => (
          <div key={m.l} className="rounded-lg border border-white/10 bg-[#07080a] px-1.5 py-1.5">
            <p className="label-caps">{m.l}</p>
            <p className="text-[11px] font-mono text-zinc-100 tabular-nums">{m.v}</p>
          </div>
        ))}
      </div>

      <div className={`space-y-2 ${mode === 'rotate' ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="flex items-center justify-between">
          <span className="label-caps">Gravity toolface</span>
          <span className="text-[11px] font-mono text-zinc-300">{gtf}°</span>
        </div>
        <div className="flex items-center gap-3">
          <svg viewBox="-20 -20 40 40" className="w-14 h-14 shrink-0">
            <circle r="18" fill="#09090b" stroke="#27272a" />
            <text y="-12" textAnchor="middle" fill="#71717a" fontSize="4">
              HS
            </text>
            <line
              x1="0"
              y1="0"
              x2={12 * Math.cos(gtfRad)}
              y2={12 * Math.sin(gtfRad)}
              stroke="#10b981"
              strokeWidth="2"
            />
          </svg>
          <input
            type="range"
            min={0}
            max={359}
            value={gtf}
            onChange={(e) => setGtf(Number(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          {mode === 'rotate'
            ? 'Rotating averages the bend. Inclination holds or slowly drops. Use this to drill ahead once you are on line.'
            : gtf < 30 || gtf > 330
              ? 'High-side slide. You are building. Watch DLS — 8°/100 ft is the motor, not a promise if WOB is wrong.'
              : gtf > 150 && gtf < 210
                ? 'Low-side slide. You are dropping. Fine for landing, fatal if you meant to stay in zone.'
                : 'Toolface is left/right. This well is a 2D profile, so walk is not plotted — on a 3D well this changes azimuth.'}
        </p>
      </div>
    </div>
  );
};
