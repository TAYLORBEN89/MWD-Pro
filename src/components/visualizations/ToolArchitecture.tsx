import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type ModuleId = 'bit' | 'motor' | 'pulser' | 'battery' | 'directional' | 'gamma' | 'nmdc';
type Spacing = 'standard' | 'short';

const ORDER: ModuleId[] = ['nmdc', 'gamma', 'directional', 'battery', 'pulser', 'motor', 'bit'];

const META: Record<
  ModuleId,
  { name: string; short: string; od: string; note: string }
> = {
  bit: {
    name: 'PDC bit',
    short: 'Bit',
    od: '8½ in',
    note: 'Not MWD. Everything you survey or log sits above this. Sensor-to-bit is the number you subtract from bit depth.',
  },
  motor: {
    name: 'Mud motor',
    short: 'Motor',
    od: '6¾ in',
    note: 'PDM + bent housing. Steel. This is the interferer the magnetometers have to live away from.',
  },
  pulser: {
    name: 'Positive pulser',
    short: 'Pulser',
    od: '6¾ in',
    note: 'Poppet restricts the bore. Standpipe sees a 70–120 psi tick. Wear here looks like “bad decode.”',
  },
  battery: {
    name: 'Lithium pack',
    short: 'Battery',
    od: '6¾ in',
    note: 'Primary cells. Voltage and life fall off a cliff above ~150 °C. Pulser solenoid is the hog.',
  },
  directional: {
    name: 'Directional',
    short: 'Dir',
    od: '6¾ in',
    note: 'Triaxial accel + fluxgate. Must sit in non-mag metal. GTF when you are out of vertical; MTF near 0°.',
  },
  gamma: {
    name: 'Gamma',
    short: 'GR',
    od: '6¾ in',
    note: 'Scintillator. API units. Correlate on TVD — this crystal is a stand behind the bit.',
  },
  nmdc: {
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
  const below: ModuleId[] = ['bit', 'motor', 'pulser', 'battery', 'directional', 'gamma', 'nmdc'];
  const i = below.indexOf(id);
  let md = 0;
  for (let k = 0; k < i; k++) md += ft[below[k]];
  return md + ft[id] / 2;
}

function JointIcon({
  kind,
  on,
  first,
  last,
}: {
  kind: ModuleId;
  on: boolean;
  first: boolean;
  last: boolean;
}) {
  const stroke = on ? '#34d399' : kind === 'nmdc' ? '#a8a29e' : '#71717a';
  const glow = on ? 'drop-shadow(0 0 6px rgba(52,211,153,0.75))' : 'none';
  const top = first ? 10 : 2;
  const bot = last ? 88 : 98;

  return (
    <span className="relative block h-full w-full">
      <svg viewBox="0 0 56 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke={stroke} strokeWidth="1.6" style={{ filter: glow }}>
          <path
            d={`M18 ${top} ${first ? 'Q18 2 28 2 Q38 2 38' : 'L38'} ${top} L38 ${bot} ${last ? 'Q38 98 28 98 Q18 98 18' : 'L18'} ${bot} Z`}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      <svg viewBox="0 0 56 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <g fill="none" stroke={stroke} strokeWidth="1.6" style={{ filter: glow }}>
          {kind === 'bit' && <path d="M17 78 L28 94 L39 78" />}
          {kind === 'pulser' && <rect x="21" y="46" width="14" height="8" rx="1.5" />}
          {kind === 'battery' && (
            <>
              <path d="M20 40 H36" />
              <path d="M20 50 H36" />
              <path d="M20 60 H36" />
            </>
          )}
          {kind === 'directional' && (
            <>
              <circle cx="28" cy="42" r="3.4" />
              <circle cx="28" cy="58" r="3.4" />
            </>
          )}
          {kind === 'gamma' && <ellipse cx="28" cy="50" rx="6" ry="10" />}
          {kind === 'motor' && <path d="M16 38 Q11 50 16 62" />}
        </g>
      </svg>
    </span>
  );
}

export const ToolArchitecture: React.FC = () => {
  const [id, setId] = useState<ModuleId>('directional');
  const [spacing, setSpacing] = useState<Spacing>('standard');

  const ft = useMemo(() => lengths(spacing), [spacing]);
  const total = ORDER.reduce((s, k) => s + ft[k], 0);
  const dirStb = fromBit('directional', ft);
  const grStb = fromBit('gamma', ft);
  const magOk = ft.nmdc >= 20;
  const selected = META[id];
  const selectedFt = ft[id];

  const laid = useMemo(
    () =>
      ORDER.map((key) => ({
        key,
        len: ft[key],
        px: Math.max(72, ft[key] * 12),
      })),
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
        <span className={`instrument-chip ${magOk ? 'text-emerald-400' : 'text-red-400'}`}>
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              background: magOk ? '#34d399' : '#f87171',
              boxShadow: magOk ? '0 0 8px #34d399' : '0 0 8px #f87171',
            }}
          />
          {magOk ? 'Spacing hold' : 'Btot fail'}
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

      <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-600">UPHOLE</p>

      <div>
        {laid.map((row, i) => {
          const on = row.key === id;
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setId(row.key)}
              className="flex w-full items-center gap-0 text-left"
              style={{ height: row.px }}
            >
              <span className="relative h-full w-16 shrink-0">
                <JointIcon
                  kind={row.key}
                  on={on}
                  first={i === 0}
                  last={i === laid.length - 1}
                />
              </span>

              <span className="flex min-w-0 flex-1 items-center pl-1">
                <AnimatePresence mode="wait">
                  {on && (
                    <motion.span
                      key={row.key}
                      className="flex min-w-0 flex-1 items-start"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.span
                        className="mt-2 h-px w-7 shrink-0 origin-left"
                        style={{
                          background: 'linear-gradient(90deg, #34d399, rgba(52,211,153,0.15))',
                          boxShadow: '0 0 8px rgba(52,211,153,0.8)',
                        }}
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        exit={{ scaleX: 0 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                      />
                      <motion.span
                        className="min-w-0 flex-1 pl-2"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 6 }}
                        transition={{ delay: 0.22, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="block text-[13px] font-semibold text-emerald-300">
                          {selected.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-zinc-400">
                          {selected.od} · {selectedFt} ft · {fromBit(id, ft).toFixed(0)} ft from bit
                        </span>
                        <span className="mt-1.5 block text-[12px] leading-relaxed text-zinc-300">
                          {tip}
                        </span>
                      </motion.span>
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </button>
          );
        })}
      </div>

      <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-600">BIT</p>
    </div>
  );
};
