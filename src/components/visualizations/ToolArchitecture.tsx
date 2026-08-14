import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type ModuleId = 'bit' | 'motor' | 'pulser' | 'battery' | 'directional' | 'gamma' | 'nmdc';
type Spacing = 'standard' | 'short';

const ORDER: ModuleId[] = ['nmdc', 'gamma', 'directional', 'battery', 'pulser', 'motor', 'bit'];

const COLOR: Record<ModuleId, string> = {
  nmdc: '#e7e5e4',
  gamma: '#c084fc',
  directional: '#60a5fa',
  battery: '#fbbf24',
  pulser: '#2dd4bf',
  motor: '#fb923c',
  bit: '#d4d4d8',
};

const META: Record<ModuleId, { name: string; short: string; od: string; lede: string; body: string }> = {
  bit: {
    name: 'PDC bit',
    short: 'Bit',
    od: '8½ in',
    lede: 'The only thing that cuts rock.',
    body: 'Not a sensor. Every survey and gamma sample sits above this face. Sensor-to-bit is what you subtract from the driller’s bit depth before you land a curve or pick a bed.',
  },
  motor: {
    name: 'Mud motor',
    short: 'Motor',
    od: '6¾ in',
    lede: 'Twenty-eight feet of steel under the magnets.',
    body: 'PDM with a bent housing. Slide points the bend; rotate averages it. This is the interferer. Magnetometers cannot sit against it — that is why the NMDC exists.',
  },
  pulser: {
    name: 'Positive pulser',
    short: 'Pulser',
    od: '6¾ in',
    lede: 'The tool’s voice in the standpipe.',
    body: 'A poppet closes the bore for a few milliseconds. Surface should see a 70–120 psi tick at 0.5–3 bit/s. After a long abrasive run, weak pulses are a worn orifice, not a decoder bug.',
  },
  battery: {
    name: 'Lithium pack',
    short: 'Battery',
    od: '6¾ in',
    lede: 'Power for the board and the solenoid.',
    body: 'Primary cells. The pulser solenoid is the hog. Above ~150 °C life falls off a cliff. Voltage sag shows up as slow or missing pulses before anything else dies.',
  },
  directional: {
    name: 'Directional package',
    short: 'Dir',
    od: '6¾ in',
    lede: 'Gravity and magnetic field, six axes.',
    body: 'Three accelerometers give inclination and gravity toolface. Three fluxgates give azimuth and magnetic toolface. Use MTF near vertical; switch to GTF once you leave the vertical. Must live in non-mag metal.',
  },
  gamma: {
    name: 'Gamma detector',
    short: 'GR',
    od: '6¾ in',
    lede: 'API counts, a stand behind the bit.',
    body: 'Scintillation crystal and photomultiplier. Shale typically 80–150 API; clean sand and lime sit much lower. The crystal is looking at rock you drilled a stand ago — correlate on TVD, never raw bit depth.',
  },
  nmdc: {
    name: 'Non-magnetic collar',
    short: 'NMDC',
    od: '6¾ in',
    lede: 'The only reason azimuth is honest.',
    body: 'Monel or non-mag steel. Length above the magnets keeps Btot on the IGRF. Short it to save BHA length and the first rotating survey fails. Gravity will still pass. Magnetic will not.',
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
  const stroke = COLOR[kind];
  const glow = on ? `drop-shadow(0 0 7px ${stroke})` : 'none';
  const opacity = on ? 1 : 0.42;
  const top = first ? 10 : 2;
  const bot = last ? 88 : 98;

  return (
    <span className="relative block h-full w-full" style={{ opacity }}>
      <svg viewBox="0 0 56 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke={stroke} strokeWidth="1.7" style={{ filter: glow }}>
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
  const color = COLOR[id];

  const laid = useMemo(
    () =>
      ORDER.map((key) => ({
        key,
        len: ft[key],
        px: Math.max(key === id ? 168 : 72, ft[key] * 12),
      })),
    [ft, id]
  );

  const body =
    !magOk && (id === 'nmdc' || id === 'directional')
      ? 'You shorted the NMDC to save BHA length. Gravity will still pass. Magnetic will not. The first rotating survey is already dead.'
      : selected.body;

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
          const c = COLOR[row.key];
          return (
            <button
              key={row.key}
              type="button"
              onClick={() => setId(row.key)}
              className="flex w-full items-stretch text-left"
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

              <span className="relative min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  {on && (
                    <motion.span
                      key={row.key}
                      className="absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <svg
                        className="absolute inset-0 h-full w-full"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        aria-hidden
                      >
                        <motion.path
                          d="M 0 50 H 14 V 10 H 58 V 26"
                          fill="none"
                          stroke={c}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          style={{ filter: `drop-shadow(0 0 5px ${c})` }}
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          exit={{ pathLength: 0 }}
                          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </svg>
                      <motion.span
                        className="absolute left-[46%] right-0 top-[28%]"
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ delay: 0.42, duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <span className="block text-[13px] font-semibold" style={{ color: c }}>
                          {selected.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-zinc-400">
                          {selected.od} · {selectedFt} ft · {fromBit(id, ft).toFixed(0)} ft from bit
                        </span>
                        <span className="mt-1 block text-[11px] font-medium text-zinc-200">
                          {selected.lede}
                        </span>
                        <span className="mt-1 block text-[12px] leading-relaxed text-zinc-400">
                          {body}
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
