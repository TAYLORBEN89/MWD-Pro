import React, { useMemo, useState } from 'react';
import { Gauge, Info } from 'lucide-react';

const B_REF = 52140;
const DIP_REF = 66.4;
const G_REF = 1;

function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}
function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function field(inc: number, azi: number, bAxial: number, bCross: number) {
  const I = toRad(inc);
  const A = toRad(azi);
  const dip = toRad(DIP_REF);
  const Bn = B_REF * Math.cos(dip);
  const Bd = B_REF * Math.sin(dip);

  let Bx = Bn * Math.cos(I) * Math.cos(A) - Bd * Math.sin(I);
  let By = -Bn * Math.sin(A);
  let Bz = Bn * Math.sin(I) * Math.cos(A) + Bd * Math.cos(I);

  Bz += bAxial;
  Bx += bCross;

  const btot = Math.hypot(Bx, By, Bz);
  const Gx = Math.sin(I);
  const Gz = Math.cos(I);
  const aziMeas = toDeg(Math.atan2(-By, Bx * Gz + Bz * Gx));
  const aziNorm = ((aziMeas % 360) + 360) % 360;
  const cosMagInc = clamp((Gx * Bx + Gz * Bz) / (G_REF * btot), -1, 1);
  const dipMeas = 90 - toDeg(Math.acos(cosMagInc));

  return {
    btot,
    dip: dipMeas,
    azi: aziNorm,
    dB: btot - B_REF,
    dDip: dipMeas - DIP_REF,
    dAzi: ((aziNorm - azi + 540) % 360) - 180,
  };
}

function status(dB: number, dDip: number) {
  if (Math.abs(dB) > 400 || Math.abs(dDip) > 0.6) {
    return { label: 'Reject', cls: 'text-red-400', bar: '#ef4444' };
  }
  if (Math.abs(dB) > 200 || Math.abs(dDip) > 0.3) {
    return { label: 'Watch', cls: 'text-amber-400', bar: '#f59e0b' };
  }
  return { label: 'Pass', cls: 'text-emerald-400', bar: '#10b981' };
}

export const MagneticInterference: React.FC = () => {
  const [inc, setInc] = useState(72);
  const [azi, setAzi] = useState(135);
  const [bAxial, setBAxial] = useState(0);
  const [bCross, setBCross] = useState(0);

  const m = useMemo(() => field(inc, azi, bAxial, bCross), [inc, azi, bAxial, bCross]);
  const st = status(m.dB, m.dDip);

  const scale = 42 / B_REF;
  const trueX = (B_REF * Math.cos(toRad(DIP_REF))) * scale;
  const trueY = -(B_REF * Math.sin(toRad(DIP_REF))) * scale;
  const measX = trueX + bCross * scale * 0.9;
  const measY = trueY - bAxial * scale * 0.35;

  const tip =
    Math.abs(m.dAzi) < 0.2 && st.label === 'Pass'
      ? 'Clean field. Btot and dip sit on the IGRF reference. This is the station you keep.'
      : bAxial > 400
        ? 'Axial steel (motor, collars) is adding field along the tool. At high inclination that rotates azimuth. Add NMDC or apply MSA — do not “nudge” the azimuth by hand.'
        : bCross > 150
          ? 'Cross-axial hotspot (stab, junk, magnetized collar). Btot moves and the horizontal field tilts. Rotate the pipe and retake; if it walks, the steel is too close.'
          : 'You are in the watch band. One more station. If Btot stays off, the BHA spacing is wrong.';

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Gauge size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Magnetic Interference</h3>
            <p className="instrument-subtitle">
              Ref {B_REF.toLocaleString()} nT · dip {DIP_REF}°
            </p>
          </div>
        </div>
        <span className={`instrument-chip ${st.cls}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.bar }} />
          {st.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-[#07080a] p-2 flex items-center justify-center">
          <svg viewBox="-50 -50 100 100" className="w-full h-36">
            <circle r="46" fill="none" stroke="#27272a" />
            <line x1="-46" x2="46" y1="0" y2="0" stroke="#27272a" />
            <line x1="0" x2="0" y1="-46" y2="46" stroke="#27272a" />
            <line x1="0" y1="0" x2={trueX} y2={trueY} stroke="#10b981" strokeWidth="2" />
            <line x1="0" y1="0" x2={measX} y2={measY} stroke="#ef4444" strokeWidth="2" />
            <text x="0" y="-40" textAnchor="middle" fill="#71717a" fontSize="7">
              vertical
            </text>
          </svg>
        </div>
        <div className="grid grid-cols-1 gap-1.5">
          {[
            { l: 'Btot', v: `${Math.round(m.btot)} nT`, d: `${m.dB >= 0 ? '+' : ''}${m.dB.toFixed(0)}` },
            { l: 'Dip', v: `${m.dip.toFixed(2)}°`, d: `${m.dDip >= 0 ? '+' : ''}${m.dDip.toFixed(2)}°` },
            { l: 'Azi error', v: `${m.dAzi >= 0 ? '+' : ''}${m.dAzi.toFixed(2)}°`, d: 'vs plan' },
          ].map((row) => (
            <div key={row.l} className="rounded-lg border border-white/10 bg-[#07080a] px-2 py-1.5">
              <p className="label-caps">{row.l}</p>
              <p className="text-sm font-mono text-zinc-100 tabular-nums leading-tight">{row.v}</p>
              <p className="text-[10px] text-zinc-500 font-mono">{row.d}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        {[
          { l: 'Inc', v: inc, min: 0, max: 90, set: setInc, fmt: `${inc}°` },
          { l: 'Azi', v: azi, min: 0, max: 359, set: setAzi, fmt: `${azi}°` },
          { l: 'Axial', v: bAxial, min: 0, max: 2500, set: setBAxial, fmt: `${bAxial} nT` },
          { l: 'X-ax', v: bCross, min: 0, max: 800, set: setBCross, fmt: `${bCross} nT` },
        ].map((s) => (
          <label key={s.l} className="flex items-center gap-3">
            <span className="label-caps w-10 shrink-0">{s.l}</span>
            <input
              type="range"
              min={s.min}
              max={s.max}
              value={s.v}
              onChange={(e) => s.set(Number(e.target.value))}
              className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
            <span className="w-16 text-right text-[11px] font-mono text-zinc-300 tabular-nums">{s.fmt}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3 text-[10px] text-zinc-500">
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 bg-emerald-500" /> Earth field
        </span>
        <span className="flex items-center gap-1">
          <span className="h-1.5 w-3 bg-red-500" /> Measured
        </span>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>{tip}</p>
      </div>
    </div>
  );
};
