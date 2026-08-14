import React, { useMemo, useState } from 'react';
import { Info, Layers } from 'lucide-react';

type Zone = 'shale' | 'wet' | 'oil' | 'gas';

interface Sample {
  md: number;
  zone: Zone;
  gr: number;
  rt: number;
  rhob: number;
  nphi: number;
}

const ZONES: { zone: Zone; from: number; to: number }[] = [
  { zone: 'shale', from: 10400, to: 10440 },
  { zone: 'wet', from: 10440, to: 10470 },
  { zone: 'oil', from: 10470, to: 10510 },
  { zone: 'gas', from: 10510, to: 10540 },
  { zone: 'shale', from: 10540, to: 10580 },
];

const META: Record<Zone, { label: string; note: string }> = {
  shale: { label: 'Shale', note: 'High GR, low Rt, no useful porosity. Seal / source, not pay.' },
  wet: {
    label: 'Wet sand',
    note: 'Low GR, low Rt (saline water), density ≈ 2.25 and neutron tracks it. Porous, not hydrocarbon.',
  },
  oil: {
    label: 'Oil sand',
    note: 'Low GR, high Rt. Density and neutron overlay in liquid-filled pore space.',
  },
  gas: {
    label: 'Gas sand',
    note: 'Low GR, high Rt, density-neutron crossover: RHOB reads light, NPHI reads low. Classic gas effect.',
  },
};

function zoneAt(md: number): Zone {
  return ZONES.find((z) => md >= z.from && md < z.to)?.zone ?? 'shale';
}

function sample(md: number): Sample {
  const zone = zoneAt(md);
  const n = Math.sin(md * 0.5) * 0.4;
  if (zone === 'shale') return { md, zone, gr: 130 + n * 8, rt: 1.4, rhob: 2.55, nphi: 0.28 };
  if (zone === 'wet') return { md, zone, gr: 38 + n * 4, rt: 0.8, rhob: 2.28, nphi: 0.24 };
  if (zone === 'oil') return { md, zone, gr: 30 + n * 3, rt: 48, rhob: 2.22, nphi: 0.2 };
  return { md, zone, gr: 26 + n * 3, rt: 80, rhob: 2.05, nphi: 0.08 };
}

const MDS = Array.from({ length: 46 }, (_, i) => 10400 + i * 4);

export const AdvancedLogs: React.FC = () => {
  const [pick, setPick] = useState(10488);
  const log = useMemo(() => MDS.map(sample), []);
  const live = sample(pick);
  const meta = META[live.zone];

  const H = 150;
  const col = 58;
  const yOf = (md: number) => ((md - 10400) / 180) * (H - 8) + 4;

  const path = (vals: number[], min: number, max: number, x0: number) =>
    log
      .map((s, i) => {
        const t = (vals[i] - min) / (max - min);
        const x = x0 + t * (col - 8);
        return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${yOf(s.md).toFixed(1)}`;
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
            <h3 className="instrument-title">Advanced LWD Logs</h3>
            <p className="instrument-subtitle">GR · Rt · RHOB · NPHI</p>
          </div>
        </div>
        <span className="instrument-chip">{meta.label}</span>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#07080a] p-2">
        <div className="grid grid-cols-4 text-[8px] text-zinc-500 font-mono px-1 mb-1">
          <span>GR</span>
          <span>Rt</span>
          <span>RHOB</span>
          <span>NPHI</span>
        </div>
        <svg
          viewBox="0 0 240 150"
          className="w-full h-40 cursor-crosshair"
          onClick={(e) => {
            const box = e.currentTarget.getBoundingClientRect();
            const y = ((e.clientY - box.top) / box.height) * 150;
            const md = 10400 + ((y - 4) / 142) * 180;
            setPick(Math.max(10400, Math.min(10576, md)));
          }}
        >
          <path d={path(log.map((s) => s.gr), 0, 160, 2)} fill="none" stroke="#10b981" strokeWidth="1.3" />
          <path d={path(log.map((s) => Math.log10(s.rt)), -0.4, 2.1, 62)} fill="none" stroke="#f59e0b" strokeWidth="1.3" />
          <path d={path(log.map((s) => s.rhob), 1.9, 2.7, 122)} fill="none" stroke="#60a5fa" strokeWidth="1.3" />
          <path d={path(log.map((s) => s.nphi), 0, 0.4, 182)} fill="none" stroke="#c084fc" strokeWidth="1.3" />
          <line x1="0" x2="240" y1={yOf(pick)} y2={yOf(pick)} stroke="#fafafa" strokeOpacity="0.25" />
        </svg>
        <p className="text-[9px] text-zinc-500 px-1">Tap a depth. RHOB and NPHI are plotted so gas crossover is visible.</p>
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        {[
          { l: 'GR', v: `${live.gr.toFixed(0)} API` },
          { l: 'Rt', v: `${live.rt.toFixed(1)} Ω·m` },
          { l: 'RHOB', v: `${live.rhob.toFixed(2)} g/cm³` },
          { l: 'NPHI', v: `${(live.nphi * 100).toFixed(0)} pu` },
        ].map((m) => (
          <div key={m.l} className="rounded-lg border border-white/10 bg-[#07080a] px-1.5 py-1.5">
            <p className="label-caps">{m.l}</p>
            <p className="text-[11px] font-mono text-zinc-100 tabular-nums">{m.v}</p>
          </div>
        ))}
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          {live.md.toFixed(0)} ft — {meta.note}
        </p>
      </div>
    </div>
  );
};
