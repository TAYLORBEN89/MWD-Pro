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

      <div className="overflow-hidden rounded-xl">
        {laid.map((row, i) => {
          const on = row.key === id;
          const monel = row.key === 'nmdc';
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setId(row.key)}
              className="relative flex w-full items-center"
              style={{ height: row.px }}
            >
              <span
                className="absolute inset-0"
                style={{
                  background: monel
                    ? 'linear-gradient(90deg,#44403c 0%,#d6d3d1 18%,#a8a29e 42%,#57534e 70%,#1c1917 100%)'
                    : row.key === 'bit'
                      ? 'linear-gradient(90deg,#52525b 0%,#d4d4d8 30%,#71717a 70%,#27272a 100%)'
                      : 'linear-gradient(90deg,#3f3f46 0%,#c4c4cc 16%,#71717a 45%,#3f3f46 78%,#18181b 100%)',
                  boxShadow: on ? 'inset 0 0 0 2px #34d399' : 'inset 0 1px 0 rgba(255,255,255,0.12)',
                }}
              />
              <span
                className="pointer-events-none absolute inset-y-3 left-[18%] right-[18%] rounded-sm"
                style={{ background: 'linear-gradient(90deg,#09090b,#3f3f46,#09090b)', opacity: 0.35 }}
              />
              {row.key === 'pulser' && (
                <span className="pointer-events-none absolute left-1/2 h-2.5 w-24 -translate-x-1/2 rounded-sm bg-black/70" />
              )}
              {row.key === 'directional' && (
                <span className="pointer-events-none absolute left-1/2 flex -translate-x-1/2 gap-6">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                </span>
              )}
              <span className="relative z-10 px-4 text-left">
                <span className="block text-[13px] font-semibold text-zinc-50">{META[row.key].short}</span>
                <span className="block font-mono text-[11px] text-zinc-300">{row.len} ft</span>
              </span>
              {i === 0 && (
                <span className="relative z-10 ml-auto pr-4 font-mono text-[10px] text-zinc-400">uphole</span>
              )}
              {row.key === 'bit' && (
                <span className="relative z-10 ml-auto pr-4 font-mono text-[10px] text-zinc-400">bit</span>
              )}
            </button>
          );
        })}
      </div>

      <p className="flex items-start gap-2 pb-2 text-xs leading-relaxed text-zinc-400">
        <Info size={14} className="mt-0.5 shrink-0 text-zinc-500" />
        {tip}
      </p>
    </div>
  );
};
