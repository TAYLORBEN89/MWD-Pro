import React, { useEffect, useMemo, useState } from 'react';
import { Info, Layers, Pause, Play } from 'lucide-react';

type Lith = 'shale' | 'sand' | 'lime';

interface Bed {
  top: number;
  base: number;
  lith: Lith;
  gr: number;
}

const START = 9840;
const END = 10240;
const BEDS: Bed[] = [
  { top: 9840, base: 9900, lith: 'shale', gr: 128 },
  { top: 9900, base: 9975, lith: 'sand', gr: 32 },
  { top: 9975, base: 10020, lith: 'shale', gr: 118 },
  { top: 10020, base: 10090, lith: 'lime', gr: 18 },
  { top: 10090, base: 10170, lith: 'sand', gr: 28 },
  { top: 10170, base: 10240, lith: 'shale', gr: 142 },
];

const LITH: Record<Lith, { label: string; color: string }> = {
  shale: { label: 'Shale', color: '#52525b' },
  sand: { label: 'Sandstone', color: '#d4a017' },
  lime: { label: 'Limestone', color: '#94a3b8' },
};

function bedAt(md: number) {
  return BEDS.find((b) => md >= b.top && md < b.base) ?? BEDS[BEDS.length - 1];
}

function grAt(md: number) {
  const bed = bedAt(md);
  const wobble = Math.sin(md * 0.37) * 6 + Math.sin(md * 1.1) * 2.4;
  return Math.max(8, bed.gr + wobble);
}

export const FormationLog: React.FC = () => {
  const [md, setMd] = useState(START);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setMd((d) => {
        if (d >= END) {
          setRunning(false);
          return END;
        }
        return d + 2;
      });
    }, 80);
    return () => window.clearInterval(id);
  }, [running]);

  const samples = useMemo(() => {
    const out: { md: number; gr: number; lith: Lith }[] = [];
    for (let d = START; d <= md; d += 4) {
      out.push({ md: d, gr: grAt(d), lith: bedAt(d).lith });
    }
    return out;
  }, [md]);

  const live = samples[samples.length - 1] ?? { md: START, gr: grAt(START), lith: 'shale' as Lith };
  const lith = LITH[live.lith];
  const H = 168;
  const W = 220;
  const span = END - START;

  const grPath = samples
    .map((s, i) => {
      const x = 8 + (s.gr / 160) * (W - 36);
      const y = ((s.md - START) / span) * (H - 8) + 4;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Layers size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Formation Log</h3>
            <p className="instrument-subtitle">Near-bit gamma · API vs MD</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (md >= END) setMd(START);
            setRunning((v) => !v);
          }}
          className={`instrument-btn ${running ? 'is-active' : ''}`}
        >
          {running ? <Pause size={12} /> : <Play size={12} />}
          {running ? 'Pause' : md >= END ? 'Replay' : 'Drill'}
        </button>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#07080a] p-2">
        <div className="flex justify-between text-[9px] text-zinc-500 font-mono px-1 mb-1">
          <span>GR 0</span>
          <span>80</span>
          <span>160 API</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-44">
          {[0, 80, 160].map((g) => {
            const x = 8 + (g / 160) * (W - 36);
            return <line key={g} x1={x} x2={x} y1="0" y2={H} stroke="rgba(255,255,255,0.06)" />;
          })}
          {BEDS.map((b) => {
            const y = ((b.top - START) / span) * (H - 8) + 4;
            const h = ((b.base - b.top) / span) * (H - 8);
            return (
              <rect
                key={b.top}
                x={W - 22}
                y={y}
                width="18"
                height={h}
                fill={LITH[b.lith].color}
                opacity={md >= b.top ? 0.95 : 0.18}
              />
            );
          })}
          <path d={grPath} fill="none" stroke="#10b981" strokeWidth="1.6" />
          <line
            x1="0"
            x2={W}
            y1={((live.md - START) / span) * (H - 8) + 4}
            y2={((live.md - START) / span) * (H - 8) + 4}
            stroke="#fafafa"
            strokeOpacity="0.25"
          />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="instrument-metric">
          <p className="instrument-metric-label">MD</p>
          <p className="instrument-metric-value text-base">{live.md.toFixed(0)} ft</p>
        </div>
        <div className="instrument-metric">
          <p className="instrument-metric-label">Gamma</p>
          <p className="instrument-metric-value text-base">{live.gr.toFixed(0)} API</p>
        </div>
        <div className="instrument-metric">
          <p className="instrument-metric-label">Lithology</p>
          <p className="text-sm font-semibold text-zinc-100">{lith.label}</p>
        </div>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          {live.lith === 'shale'
            ? 'High GR — clay-bound potassium, uranium, thorium. You are in shale. Correlation marker, not pay.'
            : live.lith === 'sand'
              ? 'Low GR — clean sandstone. This is the target look. Confirm with resistivity before you call it pay.'
              : 'Very low GR — limestone / carbonate. Dense, often tight. Do not call it sand just because GR is low.'}
        </p>
      </div>
    </div>
  );
};
