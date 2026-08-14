import React, { useEffect, useMemo, useState } from 'react';
import { Info, LineChart, Pause, Play, RotateCcw } from 'lucide-react';

const SAND_TOP = 8128;
const SAND_BASE = 8140;
const MD0 = 11800;
const MD1 = 12400;

function typeGr(tvd: number) {
  if (tvd < SAND_TOP) return 125 + Math.sin(tvd * 0.4) * 8;
  if (tvd <= SAND_BASE) return 34 + Math.sin(tvd * 1.2) * 4;
  return 138 + Math.sin(tvd * 0.3) * 6;
}

export const GeosteeringInterpretation: React.FC = () => {
  const [md, setMd] = useState(MD0);
  const [tvd, setTvd] = useState(8132);
  const [steer, setSteer] = useState(0);
  const [running, setRunning] = useState(false);
  const [path, setPath] = useState<{ md: number; tvd: number }[]>([{ md: MD0, tvd: 8132 }]);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setPath((p) => {
        const last = p[p.length - 1];
        if (last.md >= MD1) {
          setRunning(false);
          return p;
        }
        const nextTvd = last.tvd + steer * 0.18;
        const nextMd = last.md + 6;
        setMd(nextMd);
        setTvd(nextTvd);
        return [...p, { md: nextMd, tvd: nextTvd }];
      });
    }, 90);
    return () => window.clearInterval(id);
  }, [running, steer]);

  const gr = typeGr(tvd);
  const inZone = tvd >= SAND_TOP && tvd <= SAND_BASE;
  const W = 260;
  const H = 120;
  const tvdMin = 8110;
  const tvdMax = 8160;

  const well = useMemo(
    () =>
      path
        .map((p, i) => {
          const x = ((p.md - MD0) / (MD1 - MD0)) * (W - 16) + 8;
          const y = ((p.tvd - tvdMin) / (tvdMax - tvdMin)) * (H - 12) + 6;
          return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
        })
        .join(' '),
    [path]
  );

  const yTop = ((SAND_TOP - tvdMin) / (tvdMax - tvdMin)) * (H - 12) + 6;
  const yBase = ((SAND_BASE - tvdMin) / (tvdMax - tvdMin)) * (H - 12) + 6;

  const reset = () => {
    setRunning(false);
    setMd(MD0);
    setTvd(8132);
    setPath([{ md: MD0, tvd: 8132 }]);
    setSteer(0);
  };

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <LineChart size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Geosteering</h3>
            <p className="instrument-subtitle">12 ft sand · GR correlation</p>
          </div>
        </div>
        <span className={`instrument-chip ${inZone ? 'text-emerald-400' : 'text-amber-400'}`}>
          {inZone ? 'In zone' : tvd < SAND_TOP ? 'Above' : 'Below'}
        </span>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#07080a] p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-32">
          <rect x="8" y={yTop} width={W - 16} height={yBase - yTop} fill="rgba(16,185,129,0.12)" />
          <line x1="8" x2={W - 8} y1={yTop} y2={yTop} stroke="#10b981" strokeDasharray="3 3" />
          <line x1="8" x2={W - 8} y1={yBase} y2={yBase} stroke="#10b981" strokeDasharray="3 3" />
          <path d={well} fill="none" stroke="#e4e4e7" strokeWidth="1.8" />
          <text x="10" y={yTop - 3} fill="#6ee7b7" fontSize="7">
            sand top {SAND_TOP}
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <div className="instrument-metric">
          <p className="instrument-metric-label">MD</p>
          <p className="text-sm font-mono text-zinc-100">{md.toFixed(0)}</p>
        </div>
        <div className="instrument-metric">
          <p className="instrument-metric-label">TVD</p>
          <p className="text-sm font-mono text-zinc-100">{tvd.toFixed(1)}</p>
        </div>
        <div className="instrument-metric">
          <p className="instrument-metric-label">GR</p>
          <p className="text-sm font-mono text-zinc-100">{gr.toFixed(0)} API</p>
        </div>
      </div>

      <div className="flex gap-1">
        {[
          { l: 'Steer up', v: -1 },
          { l: 'Hold', v: 0 },
          { l: 'Steer down', v: 1 },
        ].map((b) => (
          <button
            key={b.l}
            type="button"
            onClick={() => setSteer(b.v)}
            className={`instrument-btn flex-1 ${steer === b.v ? 'is-active' : ''}`}
          >
            {b.l}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => {
            if (md >= MD1) reset();
            setRunning((v) => !v);
          }}
          className={`instrument-btn flex-1 ${running ? 'is-active' : ''}`}
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? 'Pause' : 'Drill lateral'}
        </button>
        <button type="button" onClick={reset} className="instrument-btn">
          <RotateCcw size={12} />
        </button>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          {inZone
            ? `GR ${gr.toFixed(0)} API — you are in the sand. Hold TVD. A few feet of build will put you in the roof shale.`
            : tvd < SAND_TOP
              ? 'GR climbed. That is the roof shale. Steer down and get back into the low-GR window before you drill a mile of clay.'
              : 'GR climbed from below. Floor shale. Steer up. Do not chase a false “hot sand” — this bed is only 12 ft thick.'}
        </p>
      </div>
    </div>
  );
};
