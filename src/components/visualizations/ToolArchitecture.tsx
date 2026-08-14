import React, { useState } from 'react';
import { Box, Info } from 'lucide-react';

type ModuleId = 'bit' | 'motor' | 'pulser' | 'battery' | 'directional' | 'gamma' | 'nmdc';

interface Module {
  id: ModuleId;
  name: string;
  short: string;
  od: string;
  length: string;
  y: number;
  h: number;
  fill: string;
  role: string;
  facts: string[];
}

const MODULES: Module[] = [
  {
    id: 'bit',
    name: 'Bit',
    short: 'PDC',
    od: '8½ in',
    length: '1 ft',
    y: 8,
    h: 14,
    fill: '#a1a1aa',
    role: 'Cuts the hole. Not an MWD part — it sits below the motor so you know where the sensors sit relative to the rock.',
    facts: [
      'Sensor-to-bit distance is what you subtract from bit depth to land a survey or gamma.',
      'Typical MWD directional is 30–50 ft behind the bit on a motor BHA.',
    ],
  },
  {
    id: 'motor',
    name: 'Mud motor',
    short: 'Motor',
    od: '6¾ in',
    length: '25–30 ft',
    y: 24,
    h: 36,
    fill: '#3f3f46',
    role: 'Positive-displacement motor with a bent housing. Sliding points the bend; rotating averages it out.',
    facts: [
      'Steel body is a magnetic interferer. Keep magnetometers in a non-mag collar above it.',
      'A 1.5° bend at 8°/100 ft yield is a common directional setup — not a spec sheet, a field ballpark.',
    ],
  },
  {
    id: 'pulser',
    name: 'Pulser / poppet',
    short: 'Pulse',
    od: '6¾ in',
    length: '6–8 ft',
    y: 62,
    h: 18,
    fill: '#047857',
    role: 'A poppet briefly restricts mud flow. That pressure spike travels up the standpipe as a positive pulse.',
    facts: [
      'Positive pulse is still the most common land telemetry. Typical 0.5–3 bit/s.',
      'Orifice and poppet wear down pulse height. Weak pulses are often mechanical, not “bad decoding.”',
    ],
  },
  {
    id: 'battery',
    name: 'Lithium battery',
    short: 'Batt',
    od: '6¾ in',
    length: '8–12 ft',
    y: 82,
    h: 20,
    fill: '#b45309',
    role: 'Primary lithium packs power electronics and the pulser solenoid. Voltage sags at the end of a run.',
    facts: [
      'High temperature shortens life. A 150 °C hole is harder on packs than a 90 °C hole.',
      'Turbine-powered tools exist, but battery MWD is still the default on most land wells.',
    ],
  },
  {
    id: 'directional',
    name: 'Directional package',
    short: 'Dir',
    od: '6¾ in',
    length: '4–6 ft',
    y: 104,
    h: 16,
    fill: '#2563eb',
    role: 'Three accelerometers (gravity / inclination / toolface) and three fluxgate magnetometers (azimuth).',
    facts: [
      'Gravity toolface is used when inclination is high enough. Magnetic toolface is for near-vertical.',
      'This module must sit in non-magnetic collar. Steel nearby bends Btot and azimuth.',
    ],
  },
  {
    id: 'gamma',
    name: 'Gamma detector',
    short: 'GR',
    od: '6¾ in',
    length: '3–5 ft',
    y: 122,
    h: 14,
    fill: '#7c3aed',
    role: 'Scintillation crystal and photomultiplier count natural gamma. Output is API units.',
    facts: [
      'Shale typically 80–150 API. Clean sand and lime sit much lower.',
      'Gamma is several feet behind the bit — correlate on TVD, not bit depth.',
    ],
  },
  {
    id: 'nmdc',
    name: 'Non-magnetic collar',
    short: 'NMDC',
    od: '6¾ in',
    length: '15–30 ft',
    y: 138,
    h: 22,
    fill: '#52525b',
    role: 'Monel or non-mag steel isolates the magnetometers from the steel motor and collars above.',
    facts: [
      'Spacing charts set how much NMDC you need above and below the sensors.',
      'Shorting that spacing to save BHA length is a common cause of failed Btot.',
    ],
  },
];

export const ToolArchitecture: React.FC = () => {
  const [id, setId] = useState<ModuleId>('directional');
  const selected = MODULES.find((m) => m.id === id)!;

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Box size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Tool Architecture</h3>
            <p className="instrument-subtitle">6¾ in motor MWD string · bit to NMDC</p>
          </div>
        </div>
        <span className="instrument-chip">Schematic</span>
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-[#07080a] p-2">
        <svg viewBox="0 0 88 168" className="w-[5.5rem] shrink-0 h-[168px]" aria-hidden="true">
          <rect x="28" y="6" width="32" height="156" rx="15" fill="#111827" stroke="#27272a" />
          {MODULES.map((m) => (
            <rect
              key={m.id}
              x="32"
              y={m.y}
              width="24"
              height={m.h - 1}
              rx="3"
              fill={m.id === id ? m.fill : '#27272a'}
              stroke={m.id === id ? '#e4e4e7' : 'transparent'}
              className="cursor-pointer"
              onClick={() => setId(m.id)}
            />
          ))}
          <text x="44" y="166" textAnchor="middle" fill="#52525b" fontSize="7">
            uphole →
          </text>
        </svg>

        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex flex-wrap gap-1">
            {MODULES.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setId(m.id)}
                className={`instrument-btn px-2 py-1 ${id === m.id ? 'is-active' : ''}`}
              >
                {m.short}
              </button>
            ))}
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">{selected.name}</p>
            <p className="text-[11px] font-mono text-zinc-500 tabular-nums">
              {selected.od} · {selected.length}
            </p>
          </div>
          <p className="text-xs text-zinc-400 leading-relaxed">{selected.role}</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {selected.facts.map((fact) => (
          <li key={fact} className="text-[12px] text-zinc-300 leading-relaxed pl-3 border-l border-emerald-500/40">
            {fact}
          </li>
        ))}
      </ul>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          This is a typical land motor string, not a vendor cutaway. Resistivity and density, when run, sit
          above gamma. EM and rotary-steerable BHAs change the order — the rule that does not change is
          magnetometers live in non-mag metal, away from steel.
        </p>
      </div>
    </div>
  );
};
