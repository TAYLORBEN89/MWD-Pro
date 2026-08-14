import React, { useMemo, useState } from 'react';
import { Box, Info } from 'lucide-react';

type ModuleId = 'bit' | 'motor' | 'pulser' | 'battery' | 'directional' | 'gamma' | 'nmdc';
type Spacing = 'standard' | 'short';

interface Joint {
  id: ModuleId;
  name: string;
  short: string;
  od: string;
  ft: number;
  note: string;
}

const ORDER: ModuleId[] = ['nmdc', 'gamma', 'directional', 'battery', 'pulser', 'motor', 'bit'];

const META: Record<ModuleId, Omit<Joint, 'ft'>> = {
  bit: {
    id: 'bit',
    name: 'PDC bit',
    short: 'Bit',
    od: '8½ in',
    note: 'Not MWD. Everything you survey or log sits above this. Sensor-to-bit is the number you subtract from bit depth.',
  },
  motor: {
    id: 'motor',
    name: 'Mud motor',
    short: 'Motor',
    od: '6¾ in',
    note: 'PDM + bent housing. Steel. This is the interferer the magnetometers have to live away from.',
  },
  pulser: {
    id: 'pulser',
    name: 'Positive pulser',
    short: 'Pulser',
    od: '6¾ in',
    note: 'Poppet restricts the bore. Standpipe sees a 70–120 psi tick. Wear here looks like “bad decode.”',
  },
  battery: {
    id: 'battery',
    name: 'Lithium pack',
    short: 'Battery',
    od: '6¾ in',
    note: 'Primary cells. Voltage and life fall off a cliff above ~150 °C. Pulser solenoid is the hog.',
  },
  directional: {
    id: 'directional',
    name: 'Directional',
    short: 'Dir',
    od: '6¾ in',
    note: 'Triaxial accel + fluxgate. Must sit in non-mag metal. GTF when you are out of vertical; MTF near 0°.',
  },
  gamma: {
    id: 'gamma',
    name: 'Gamma',
    short: 'GR',
    od: '6¾ in',
    note: 'Scintillator. API units. Correlate on TVD — this crystal is a stand behind the bit.',
  },
  nmdc: {
    id: 'nmdc',
    name: 'NMDC',
    short: 'NMDC',
    od: '6¾ in',
    note: 'Monel / non-mag. Spacing above the magnets is what keeps Btot on the IGRF. Short it and the first rotating survey dies.',
  },
};

function lengths(spacing: Spacing): Record<ModuleId, number> {
  return {
    bit: 1,
    motor: 28,
    pulser: 7,
    battery: 10,
    directional: 5,
    gamma: 4,
    nmdc: spacing === 'short' ? 8 : 24,
  };
}

function fromBit(id: ModuleId, ft: Record<ModuleId, number>) {
  const below = ['bit', 'motor', 'pulser', 'battery', 'directional', 'gamma', 'nmdc'];
  const i = below.indexOf(id);
  let md = 0;
  for (let k = 0; k < i; k++) md += ft[below[k] as ModuleId];
  return md + ft[id] / 2;
}

export const ToolArchitecture: React.FC = () => {
  const [id, setId] = useState<ModuleId>('directional');
  const [spacing, setSpacing] = useState<Spacing>('standard');

  const ft = useMemo(() => lengths(spacing), [spacing]);
  const total = ORDER.reduce((s, k) => s + ft[k], 0);
  const dirStb = fromBit('directional', ft);
  const grStb = fromBit('gamma', ft);
  const magOk = ft.nmdc >= 20;
  const st = magOk
    ? { label: 'Spacing hold', cls: 'text-emerald-400', bar: '#10b981' }
    : { label: 'Btot fail', cls: 'text-red-400', bar: '#ef4444' };

  const selected = META[id];
  const selectedFt = ft[id];

  const laid = useMemo(() => {
    let y = 8;
    return ORDER.map((key) => {
      const h = (ft[key] / total) * 196;
      const row = { key, y, h };
      y += h;
      return row;
    });
  }, [ft, total]);

  const tip = !magOk
    ? 'You shorted the NMDC to save BHA length. Gravity will still pass. Magnetic will not. The first rotating survey is already dead.'
    : id === 'directional'
      ? `Dir sits ${dirStb.toFixed(0)} ft behind the bit. Subtract that from bit depth before you land a survey or call a landing.`
      : id === 'gamma'
        ? `GR is ${grStb.toFixed(0)} ft behind the bit. The log is looking at rock you drilled a stand ago.`
        : id === 'motor'
          ? 'Twenty-eight feet of steel under the magnets. That is why the NMDC exists. Not optional decoration.'
          : id === 'pulser'
            ? 'If pulses die after 80 abrasive hours, look at the orifice before you blame the decoder.'
            : selected.note;

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Box size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Tool Architecture</h3>
            <p className="instrument-subtitle">6¾ in motor string · {total.toFixed(0)} ft BHA</p>
          </div>
        </div>
        <span className={`instrument-chip ${st.cls}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: st.bar }} />
          {st.label}
        </span>
      </div>

      <div className="flex gap-1">
        {(['standard', 'short'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSpacing(s)}
            className={`instrument-btn flex-1 ${spacing === s ? 'is-active' : ''}`}
          >
            {s === 'standard' ? 'Chart NMDC' : 'Short NMDC'}
          </button>
        ))}
      </div>

      <div className="flex gap-2 rounded-xl border border-white/10 bg-[#07080a] p-2">
        <div className="relative w-[88px] shrink-0 h-[212px]">
          <svg viewBox="0 0 88 212" className="h-full w-full">
            <defs>
              <linearGradient id="collar" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#3f3f46" />
                <stop offset="22%" stopColor="#a1a1aa" />
                <stop offset="48%" stopColor="#52525b" />
                <stop offset="100%" stopColor="#18181b" />
              </linearGradient>
              <linearGradient id="monel" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#57534e" />
                <stop offset="28%" stopColor="#d6d3d1" />
                <stop offset="55%" stopColor="#78716c" />
                <stop offset="100%" stopColor="#1c1917" />
              </linearGradient>
              <linearGradient id="bore" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#09090b" />
                <stop offset="50%" stopColor="#27272a" />
                <stop offset="100%" stopColor="#09090b" />
              </linearGradient>
            </defs>

            {laid.map((row) => {
              const on = row.key === id;
              const fill = row.key === 'nmdc' ? 'url(#monel)' : row.key === 'bit' ? '#71717a' : 'url(#collar)';
              return (
                <g key={row.key}>
                  <rect x="28" y={row.y} width="32" height={Math.max(row.h - 0.6, 1.2)} rx="3.5" fill={fill} />
                  <rect x="39" y={row.y + 0.8} width="10" height={Math.max(row.h - 2.2, 0.6)} rx="2" fill="url(#bore)" opacity="0.55" />
                  {row.key === 'bit' && (
                    <path d="M32 204 L44 210 L56 204 Z" fill="#a1a1aa" />
                  )}
                  {row.key === 'pulser' && (
                    <rect x="36" y={row.y + row.h * 0.35} width="16" height="3" rx="1" fill="#09090b" />
                  )}
                  {row.key === 'directional' && (
                    <>
                      <circle cx="44" cy={row.y + row.h * 0.35} r="2.1" fill="#10b981" />
                      <circle cx="44" cy={row.y + row.h * 0.68} r="2.1" fill="#3b82f6" />
                    </>
                  )}
                  {on && (
                    <rect
                      x="26.5"
                      y={row.y - 0.4}
                      width="35"
                      height={Math.max(row.h, 2)}
                      rx="4"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="1.4"
                    />
                  )}
                </g>
              );
            })}
            <text x="44" y="8" textAnchor="middle" fill="#52525b" fontSize="6">
              uphole
            </text>
          </svg>

          {laid.map((row) => (
            <button
              key={row.key}
              type="button"
              aria-label={META[row.key].name}
              onClick={() => setId(row.key)}
              className="absolute left-0 right-0"
              style={{
                top: `${(row.y / 212) * 100}%`,
                height: `${Math.max((row.h / 212) * 100, 9)}%`,
              }}
            />
          ))}
        </div>

        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <p className="text-[11px] font-mono text-zinc-500 tabular-nums">
              {selected.od} · {selectedFt} ft
            </p>
            <p className="text-sm font-semibold text-zinc-50 leading-tight">{selected.name}</p>
            <p className="mt-1 text-[12px] text-zinc-400 leading-relaxed">{selected.note}</p>
          </div>

          <div className="grid grid-cols-1 gap-1.5">
            {[
              { l: 'Dir → bit', v: `${dirStb.toFixed(0)} ft` },
              { l: 'GR → bit', v: `${grStb.toFixed(0)} ft` },
              { l: 'NMDC', v: `${ft.nmdc} ft`, hot: !magOk },
            ].map((row) => (
              <div
                key={row.l}
                className={`flex items-baseline justify-between rounded-lg border px-2 py-1.5 ${
                  row.hot ? 'border-red-500/35 bg-red-500/10' : 'border-white/10 bg-black/30'
                }`}
              >
                <span className="label-caps">{row.l}</span>
                <span className={`text-[13px] font-mono tabular-nums ${row.hot ? 'text-red-300' : 'text-zinc-100'}`}>
                  {row.v}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>{tip}</p>
      </div>
    </div>
  );
};
