import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, Info } from 'lucide-react';

type Regime = 'smooth' | 'bounce' | 'whirl' | 'stick';

interface Sample {
  axial: number;
  lateral: number;
  torsional: number;
}

const TRACE_N = 96;
const TRACE_W = 240;
const TRACE_H = 36;

const REGIMES: Record<Regime, { label: string; rpm: number; wob: number }> = {
  smooth: { label: 'Smooth', rpm: 118, wob: 22 },
  bounce: { label: 'Bit bounce', rpm: 88, wob: 44 },
  whirl: { label: 'Whirl', rpm: 186, wob: 11 },
  stick: { label: 'Stick-slip', rpm: 42, wob: 38 },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function severity(g: number) {
  if (g >= 8) return { label: 'Critical', cls: 'text-red-400', bar: '#ef4444' };
  if (g >= 5) return { label: 'Warning', cls: 'text-amber-400', bar: '#f59e0b' };
  return { label: 'Safe', cls: 'text-emerald-400', bar: '#10b981' };
}

function targets(rpm: number, wob: number) {
  const r = rpm / 200;
  const w = wob / 50;
  return {
    axial: clamp(w * 7.2 * (0.45 + r) + (w > 0.75 ? 2.2 : 0), 0.2, 10),
    lateral: clamp(r * 9.4 * (1.15 - w) + (r > 0.8 && w < 0.35 ? 2.4 : 0), 0.2, 10),
    torsional: clamp((1 - r) * w * 10.5 + (r < 0.28 && w > 0.55 ? 2.1 : 0), 0.2, 10),
  };
}

function nextSample(t: number, rpm: number, wob: number): Sample {
  const tgt = targets(rpm, wob);
  const bounce = 0.5 + 0.5 * Math.sin(t * 38);
  const whirl = Math.sin(t * 72) * 0.55 + Math.sin(t * 19) * 0.35;
  const stickPhase = (t * 1.7) % 1;
  const slip = stickPhase < 0.72 ? stickPhase / 0.72 * 0.25 : 0.25 + ((stickPhase - 0.72) / 0.28) * 0.75;
  const noise = () => (Math.random() - 0.5) * 0.35;

  return {
    axial: clamp(tgt.axial * (0.35 + 0.65 * bounce) + noise(), 0, 10),
    lateral: clamp(tgt.lateral * (0.5 + 0.5 * Math.abs(whirl)) + noise(), 0, 10),
    torsional: clamp(tgt.torsional * slip + noise() * 0.4, 0, 10),
  };
}

function toPath(values: number[]) {
  if (!values.length) return '';
  return values
    .map((v, i) => {
      const x = (i / (TRACE_N - 1)) * TRACE_W;
      const y = TRACE_H - (v / 10) * (TRACE_H - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function coach(axial: number, lateral: number, torsional: number) {
  const worst = Math.max(axial, lateral, torsional);
  if (lateral >= worst && lateral >= 5) {
    return 'Whirl. High RPM and light WOB let the BHA walk the hole. Lateral Gs smash electronics and make gamma look noisy. Drop RPM or add weight.';
  }
  if (torsional >= worst && torsional >= 5) {
    return 'Stick-slip. Low RPM and heavy WOB stall the bit, then it snaps several times surface RPM. Toolface swings and pulses drop. Raise RPM or ease off WOB.';
  }
  if (axial >= worst && axial >= 5) {
    return 'Bit bounce. The string jackhammers axially. Pulser valves and battery connections take the hits, and surveys fail consistency checks. Ease WOB.';
  }
  return 'Quiet hole. Surveys can settle, toolface holds, and the pulser stays in time. This is the window you want before taking a station.';
}

export const VibrationMonitor: React.FC = () => {
  const [regime, setRegime] = useState<Regime | 'custom'>('smooth');
  const [rpm, setRpm] = useState(REGIMES.smooth.rpm);
  const [wob, setWob] = useState(REGIMES.smooth.wob);
  const [health, setHealth] = useState(100);
  const [live, setLive] = useState<Sample>({ axial: 1.2, lateral: 1.4, torsional: 0.8 });
  const history = useRef<Sample[]>(
    Array.from({ length: TRACE_N }, () => ({ axial: 1, lateral: 1, torsional: 0.8 }))
  );
  const [, setTick] = useState(0);
  const tRef = useRef(0);
  const rpmRef = useRef(rpm);
  const wobRef = useRef(wob);
  rpmRef.current = rpm;
  wobRef.current = wob;

  useEffect(() => {
    const id = window.setInterval(() => {
      tRef.current += 0.08;
      const sample = nextSample(tRef.current, rpmRef.current, wobRef.current);
      const next = history.current.slice(1);
      next.push(sample);
      history.current = next;
      setLive(sample);
      setHealth((h) => {
        const hit =
          Math.max(0, sample.axial - 6) * 0.35 +
          Math.max(0, sample.lateral - 5) * 0.55 +
          Math.max(0, sample.torsional - 6) * 0.4;
        const recover = hit > 0 ? 0 : 0.35;
        return clamp(h - hit + recover, 8, 100);
      });
      setTick((n) => n + 1);
    }, 70);
    return () => window.clearInterval(id);
  }, []);

  const applyRegime = (id: Regime) => {
    setRegime(id);
    setRpm(REGIMES[id].rpm);
    setWob(REGIMES[id].wob);
    setHealth((h) => Math.max(h, 55));
  };

  const channels = useMemo(
    () => [
      {
        key: 'axial',
        name: 'Axial',
        sub: 'Bit bounce',
        unit: 'G',
        value: live.axial,
        path: toPath(history.current.map((s) => s.axial)),
      },
      {
        key: 'lateral',
        name: 'Lateral',
        sub: 'Whirl',
        unit: 'G',
        value: live.lateral,
        path: toPath(history.current.map((s) => s.lateral)),
      },
      {
        key: 'torsional',
        name: 'Torsional',
        sub: 'Stick-slip',
        unit: 'G',
        value: live.torsional,
        path: toPath(history.current.map((s) => s.torsional)),
      },
    ],
    [live]
  );

  const worst = Math.max(live.axial, live.lateral, live.torsional);
  const overall = severity(worst);
  const shakeX = (live.lateral - 1) * 0.55;
  const shakeY = (live.axial - 1) * 0.45;
  const spin = 20 + live.torsional * 14;
  const healthColor = health < 35 ? '#ef4444' : health < 65 ? '#f59e0b' : '#10b981';

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Activity size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Vibration Monitor</h3>
            <p className="instrument-subtitle">Downhole dynamics · three-axis shock</p>
          </div>
        </div>
        <span className={`instrument-chip ${overall.cls}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: overall.bar }} />
          {overall.label}
        </span>
      </div>

      <div className="flex gap-1">
        {(Object.keys(REGIMES) as Regime[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => applyRegime(id)}
            className={`instrument-btn flex-1 px-1.5 ${regime === id ? 'is-active' : ''}`}
          >
            {REGIMES[id].label}
          </button>
        ))}
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-[#07080a] p-2">
        <svg viewBox="0 0 72 148" className="w-16 shrink-0 h-[148px]" aria-hidden="true">
          <rect x="18" y="6" width="36" height="136" rx="18" fill="#111827" stroke="#27272a" />
          <rect x="22" y="10" width="28" height="128" rx="14" fill="#09090b" />
          <g
            style={{
              transform: `translate(${shakeX.toFixed(1)}px, ${shakeY.toFixed(1)}px)`,
              transformOrigin: '36px 74px',
            }}
          >
            <rect x="30" y="16" width="12" height="18" rx="2" fill="#52525b" />
            <rect x="28" y="36" width="16" height="28" rx="3" fill="#10b981" opacity="0.85" />
            <rect x="30" y="66" width="12" height="22" rx="2" fill="#3f3f46" />
            <g
              style={{
                transform: `rotate(${(tRef.current * spin) % 360}deg)`,
                transformOrigin: '36px 108px',
              }}
            >
              <circle cx="36" cy="108" r="11" fill="#a1a1aa" />
              <path d="M36 98 L39 108 L36 118 L33 108 Z" fill="#18181b" />
            </g>
          </g>
          <text x="36" y="144" textAnchor="middle" fill="#52525b" fontSize="7">
            BHA
          </text>
        </svg>

        <div className="flex-1 min-w-0 space-y-1">
          {channels.map((ch) => {
            const sev = severity(ch.value);
            return (
              <div key={ch.key} className="flex items-center gap-2">
                <div className="w-[4.6rem] shrink-0">
                  <p className="text-[10px] font-semibold text-zinc-200 leading-none">{ch.name}</p>
                  <p className="text-[9px] text-zinc-500">{ch.sub}</p>
                </div>
                <svg
                  viewBox={`0 0 ${TRACE_W} ${TRACE_H}`}
                  className="flex-1 h-9 overflow-visible"
                  preserveAspectRatio="none"
                >
                  <line x1="0" x2={TRACE_W} y1={TRACE_H * 0.5} y2={TRACE_H * 0.5} stroke="rgba(255,255,255,0.06)" />
                  <path d={ch.path} fill="none" stroke={sev.bar} strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
                <div className="w-12 text-right shrink-0">
                  <p className="text-[12px] font-mono font-semibold text-zinc-100 tabular-nums leading-none">
                    {ch.value.toFixed(1)}
                  </p>
                  <p className={`text-[9px] font-medium ${sev.cls}`}>{sev.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3">
          <span className="label-caps w-10 shrink-0">RPM</span>
          <input
            type="range"
            min={20}
            max={200}
            value={rpm}
            onChange={(e) => {
              setRpm(Number(e.target.value));
              setRegime('custom');
            }}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="w-10 text-right text-xs font-mono text-zinc-300 tabular-nums">{rpm}</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="label-caps w-10 shrink-0">WOB</span>
          <input
            type="range"
            min={5}
            max={50}
            value={wob}
            onChange={(e) => {
              setWob(Number(e.target.value));
              setRegime('custom');
            }}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="w-10 text-right text-xs font-mono text-zinc-300 tabular-nums">{wob}k</span>
        </label>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="label-caps">Tool electronics</span>
          <span className="text-[11px] font-mono tabular-nums" style={{ color: healthColor }}>
            {Math.round(health)}%
          </span>
        </div>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${health}%`, background: healthColor }} />
        </div>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>{coach(live.axial, live.lateral, live.torsional)}</p>
      </div>
    </div>
  );
};
