import React, { useMemo, useState } from 'react';
import { Info } from 'lucide-react';

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

  const laid = useMemo(
    () =>
      ORDER.map((key) => {
        const len = ft[key];
        return { key, len, px: Math.max(72, len * 12) };
      }),
    [ft]
  );

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
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="instrument-title">Tool Architecture</h3>
          <p className="instrument-subtitle">6¾ in motor string · {total.toFixed(0)} ft BHA</p>
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

      <p className="font-mono text-[12px] tabular-nums text-zinc-300">
        Dir {dirStb.toFixed(0)} ft
        <span className="text-zinc-600"> · </span>
        GR {grStb.toFixed(0)} ft
        <span className="text-zinc-600"> · </span>
        <span className={magOk ? '' : 'text-red-400'}>NMDC {ft.nmdc} ft</span>
      </p>

      <div>
        <p className="text-sm font-semibold text-zinc-50">{selected.name}</p>
        <p className="font-mono text-[11px] tabular-nums text-zinc-500">
          {selected.od} · {selectedFt} ft · {fromBit(id, ft).toFixed(0)} ft from bit
        </p>
      </div>

      <div>
        <p className="mb-1 font-mono text-[10px] text-zinc-600">Uphole</p>
        {laid.map((row, i) => {
          const on = row.key === id;
          const monel = row.key === 'nmdc';
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setId(row.key)}
              className="flex w-full items-stretch gap-3"
              style={{ height: row.px }}
            >
              <span className="relative w-16 shrink-0">
                <span
                  className="absolute inset-y-0 left-1/2 w-[3.15rem] -translate-x-1/2"
                  style={{
                    borderRadius:
                      i === 0 ? '12px 12px 2px 2px' : i === laid.length - 1 ? '2px 2px 14px 14px' : 2,
                    background: monel
                      ? 'linear-gradient(90deg,#57534e 0%,#d6d3d1 28%,#78716c 55%,#1c1917 100%)'
                      : row.key === 'bit'
                        ? 'linear-gradient(90deg,#52525b 0%,#a1a1aa 35%,#3f3f46 100%)'
                        : 'linear-gradient(90deg,#3f3f46 0%,#a1a1aa 22%,#52525b 50%,#18181b 100%)',
                    boxShadow: on ? '0 0 0 2px #34d399' : 'inset 5px 0 7px rgba(255,255,255,0.1)',
                  }}
                />
                <span
                  className="pointer-events-none absolute inset-y-2 left-1/2 w-2.5 -translate-x-1/2 rounded-full"
                  style={{ background: 'linear-gradient(90deg,#09090b,#27272a,#09090b)', opacity: 0.55 }}
                />
                {row.key === 'pulser' && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 h-1.5 w-8 -translate-x-1/2 -translate-y-1/2 rounded-sm bg-black/80" />
                )}
                {row.key === 'directional' && (
                  <span className="pointer-events-none absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                  </span>
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col justify-center text-left">
                <span className={`text-[13px] font-semibold ${on ? 'text-emerald-300' : 'text-zinc-100'}`}>
                  {META[row.key].short}
                </span>
                <span className="font-mono text-[11px] text-zinc-500">{row.len} ft</span>
              </span>
            </button>
          );
        })}
        <p className="mt-1 font-mono text-[10px] text-zinc-600">Bit</p>
      </div>

      <p className="flex items-start gap-2 pb-2 text-xs leading-relaxed text-zinc-400">
        <Info size={14} className="mt-0.5 shrink-0 text-zinc-500" />
        {tip}
      </p>
    </div>
  );
};
