import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Info, Radio } from 'lucide-react';

const WORD = [1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0];
const TRACE_N = 160;
const W = 280;
const H = 72;

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export const MudPulseSimulator: React.FC = () => {
  const [noisePsi, setNoisePsi] = useState(18);
  const [bps, setBps] = useState(1.5);
  const [bitIdx, setBitIdx] = useState(0);
  const [decoded, setDecoded] = useState<number[]>([]);
  const [errors, setErrors] = useState(0);
  const [total, setTotal] = useState(0);
  const trace = useRef<number[]>(Array.from({ length: TRACE_N }, () => 0));
  const [, setTick] = useState(0);
  const phase = useRef(0);

  const pulseHeight = 90;

  useEffect(() => {
    const ms = 1000 / Math.max(0.4, bps);
    const id = window.setInterval(() => {
      setBitIdx((i) => {
        const bit = WORD[i % WORD.length];
        const noise = (Math.random() - 0.5) * 2 * noisePsi;
        const threshold = pulseHeight * 0.45;
        const observed = (bit ? pulseHeight : 0) + noise;
        const guess = observed > threshold ? 1 : 0;
        setDecoded((d) => [...d.slice(-11), guess]);
        setTotal((n) => n + 1);
        if (guess !== bit) setErrors((e) => e + 1);
        return i + 1;
      });
    }, ms);
    return () => window.clearInterval(id);
  }, [bps, noisePsi]);

  useEffect(() => {
    const id = window.setInterval(() => {
      phase.current += 0.18;
      const bit = WORD[bitIdx % WORD.length];
      const pump = Math.sin(phase.current * 2.4) * noisePsi * 0.35;
      const jitter = (Math.random() - 0.5) * noisePsi * 0.55;
      const pulse = bit ? pulseHeight * (0.75 + 0.25 * Math.sin(phase.current * 8)) : 0;
      const next = trace.current.slice(1);
      next.push(clamp(pulse + pump + jitter, -40, 140));
      trace.current = next;
      setTick((n) => n + 1);
    }, 40);
    return () => window.clearInterval(id);
  }, [bitIdx, noisePsi]);

  const path = useMemo(() => {
    return trace.current
      .map((v, i) => {
        const x = (i / (TRACE_N - 1)) * W;
        const y = H - ((v + 40) / 180) * (H - 8) - 4;
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
  }, [bitIdx, noisePsi]);

  const ber = total ? (errors / total) * 100 : 0;
  const ok = ber < 8;
  const word = decoded.map(String).join('') || '············';

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Radio size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Mud Pulse Telemetry</h3>
            <p className="instrument-subtitle">Positive pulse · standpipe ΔP</p>
          </div>
        </div>
        <span className={`instrument-chip ${ok ? 'text-emerald-400' : 'text-red-400'}`}>
          BER {ber.toFixed(0)}%
        </span>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#07080a] p-2">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20">
          <line x1="0" x2={W} y1={H * 0.62} y2={H * 0.62} stroke="rgba(255,255,255,0.08)" />
          <path d={path} fill="none" stroke="#10b981" strokeWidth="1.6" />
        </svg>
        <p className="text-[9px] text-zinc-500 font-mono px-1">Standpipe pressure · poppet close = up-going pulse</p>
      </div>

      <div className="rounded-lg border border-white/10 bg-black/40 px-3 py-2 font-mono text-sm tracking-[0.18em] text-emerald-400 overflow-hidden">
        {word.padEnd(12, '·')}
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-3">
          <span className="label-caps w-14 shrink-0">Noise</span>
          <input
            type="range"
            min={0}
            max={80}
            value={noisePsi}
            onChange={(e) => {
              setNoisePsi(Number(e.target.value));
              setErrors(0);
              setTotal(0);
            }}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="w-12 text-right text-[11px] font-mono text-zinc-300">{noisePsi} psi</span>
        </label>
        <label className="flex items-center gap-3">
          <span className="label-caps w-14 shrink-0">Rate</span>
          <input
            type="range"
            min={0.5}
            max={4}
            step={0.5}
            value={bps}
            onChange={(e) => setBps(Number(e.target.value))}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <span className="w-12 text-right text-[11px] font-mono text-zinc-300">{bps.toFixed(1)} bps</span>
        </label>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          {ok
            ? 'Pulses clear the noise floor. A real survey word is sync + inclination + azimuth + toolface, a few bits per second — not Wi-Fi.'
            : 'Pump noise is burying the poppet. Slow the baud, check the orifice, or wait for a quieter pump rate. Raising rate into noise only raises bit errors.'}
        </p>
      </div>
    </div>
  );
};
