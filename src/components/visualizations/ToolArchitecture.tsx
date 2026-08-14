import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';

type JointId =
  | 'bit'
  | 'motor'
  | 'rss'
  | 'pulser'
  | 'em'
  | 'battery'
  | 'directional'
  | 'gamma'
  | 'resistivity'
  | 'nmdc';

type Spacing = 'standard' | 'short';
type AssemblyId = 'motor' | 'lwd' | 'rss' | 'em';

interface JointSpec {
  id: JointId;
  ft: number;
  od: string;
  name: string;
  short: string;
  color: string;
  lede: string;
  body: string;
}

interface Assembly {
  id: AssemblyId;
  label: string;
  tag: string;
  accent: string;
  purpose: string;
  goals: string;
  functions: string;
  joints: JointSpec[];
}

const ASSEMBLIES: Assembly[] = [
  {
    id: 'motor',
    label: 'Motor MWD',
    tag: 'Slide. Rotate. Pulse.',
    accent: '#fb923c',
    purpose: 'Build and hold a land well on mud with slide/rotate.',
    goals: 'Get honest surveys, hold toolface on the slide, and keep a gamma log for correlation.',
    functions: 'Positive-pulse telemetry, MTF/GTF, GR. Cheap, common, and what most curve hands still run.',
    joints: [
      {
        id: 'nmdc',
        ft: 24,
        od: '6¾ in',
        name: 'Non-magnetic collar',
        short: 'NMDC',
        color: '#e7e5e4',
        lede: 'The only reason azimuth is honest.',
        body: 'Monel or non-mag steel. Length above the magnets keeps Btot on the IGRF. Short it to save BHA length and the first rotating survey fails.',
      },
      {
        id: 'gamma',
        ft: 4,
        od: '6¾ in',
        name: 'Gamma detector',
        short: 'GR',
        color: '#c084fc',
        lede: 'API counts, a stand behind the bit.',
        body: 'Scintillation crystal and photomultiplier. Shale 80–150 API; clean sand and lime much lower. Correlate on TVD — this crystal is looking at rock you drilled a stand ago.',
      },
      {
        id: 'directional',
        ft: 5,
        od: '6¾ in',
        name: 'Directional package',
        short: 'Dir',
        color: '#60a5fa',
        lede: 'Gravity and magnetic field, six axes.',
        body: 'Accelerometers give inclination and gravity toolface. Fluxgates give azimuth and magnetic toolface. MTF near vertical; GTF once you leave it. Must sit in non-mag metal.',
      },
      {
        id: 'battery',
        ft: 10,
        od: '6¾ in',
        name: 'Lithium pack',
        short: 'Battery',
        color: '#fbbf24',
        lede: 'Power for the board and the solenoid.',
        body: 'Primary cells. The pulser solenoid is the hog. Above ~150 °C life falls off a cliff. Voltage sag shows up as slow or missing pulses first.',
      },
      {
        id: 'pulser',
        ft: 7,
        od: '6¾ in',
        name: 'Positive pulser',
        short: 'Pulser',
        color: '#2dd4bf',
        lede: 'The tool’s voice in the standpipe.',
        body: 'A poppet closes the bore for a few milliseconds. Surface should see a 70–120 psi tick at 0.5–3 bit/s. Weak pulses after a long abrasive run are a worn orifice, not a decoder bug.',
      },
      {
        id: 'motor',
        ft: 28,
        od: '6¾ in',
        name: 'Mud motor',
        short: 'Motor',
        color: '#fb923c',
        lede: 'Twenty-eight feet of steel under the magnets.',
        body: 'PDM with a bent housing. Slide points the bend; rotate averages it. This is the interferer. Magnetometers cannot sit against it.',
      },
      {
        id: 'bit',
        ft: 1,
        od: '8½ in',
        name: 'PDC bit',
        short: 'Bit',
        color: '#d4d4d8',
        lede: 'The only thing that cuts rock.',
        body: 'Not a sensor. Every survey and gamma sample sits above this face. Subtract sensor-to-bit from the driller’s bit depth before you land a curve.',
      },
    ],
  },
  {
    id: 'lwd',
    label: 'Motor + LWD',
    tag: 'Land. Stay in zone.',
    accent: '#f472b6',
    purpose: 'Land and stay in zone — lithology plus resistivity, still motor-steered.',
    goals: 'Pick bed boundaries and fluid change while you build and hold. GR alone is not enough when the sand looks like the shale on counts.',
    functions: 'Same pulse MWD as the motor string, plus a resistivity collar for Rt. Used on landings and laterals that pay on thickness.',
    joints: [
      {
        id: 'nmdc',
        ft: 24,
        od: '6¾ in',
        name: 'Non-magnetic collar',
        short: 'NMDC',
        color: '#e7e5e4',
        lede: 'Still required — LWD does not replace spacing.',
        body: 'Resistivity antennas sit in the string but they do not isolate the magnetometers. You still need non-mag metal above Dir or Btot walks.',
      },
      {
        id: 'resistivity',
        ft: 12,
        od: '6¾ in',
        name: 'Resistivity (LWD)',
        short: 'Rt',
        color: '#f472b6',
        lede: 'Phase and attenuation — deeper than GR.',
        body: 'Loop antennas measure formation resistivity while drilling. Hydrocarbon and tight rock read high; salt water reads low. This is how you tell wet sand from pay when GR looks the same.',
      },
      {
        id: 'gamma',
        ft: 4,
        od: '6¾ in',
        name: 'Gamma detector',
        short: 'GR',
        color: '#c084fc',
        lede: 'The correlation curve.',
        body: 'Same scintillator as the motor string. Use it to tie to offset wells. Use Rt to decide if the rock is worth staying in.',
      },
      {
        id: 'directional',
        ft: 5,
        od: '6¾ in',
        name: 'Directional package',
        short: 'Dir',
        color: '#60a5fa',
        lede: 'Where you are, not what you drilled.',
        body: 'Surveys and toolface. On a landing you watch TVD as closely as GR. Same six-axis package; same non-mag rule.',
      },
      {
        id: 'battery',
        ft: 10,
        od: '6¾ in',
        name: 'Lithium pack',
        short: 'Battery',
        color: '#fbbf24',
        lede: 'Now feeding MWD and LWD.',
        body: 'Resistivity electronics add draw. High temperature plus a pulser plus LWD is how packs die early. Watch voltage, not just pulse height.',
      },
      {
        id: 'pulser',
        ft: 7,
        od: '6¾ in',
        name: 'Positive pulser',
        short: 'Pulser',
        color: '#2dd4bf',
        lede: 'Now carrying GR and Rt words.',
        body: 'Same poppet. The word is longer, so effective update rate drops. If you need faster Rt, you are asking more of a 1–2 bit/s channel than it wants to give.',
      },
      {
        id: 'motor',
        ft: 28,
        od: '6¾ in',
        name: 'Mud motor',
        short: 'Motor',
        color: '#fb923c',
        lede: 'Still the steering engine.',
        body: 'LWD does not steer. You still slide and rotate. Sensor-to-bit is longer now — resistivity is farther from the face than GR.',
      },
      {
        id: 'bit',
        ft: 1,
        od: '8½ in',
        name: 'PDC bit',
        short: 'Bit',
        color: '#d4d4d8',
        lede: 'The cut is the same. The look-ahead is not.',
        body: 'You are deciding zone on logs that sit 40–70 ft behind this face. Plan the landing with that lag or you will overshoot.',
      },
    ],
  },
  {
    id: 'rss',
    label: 'RSS MWD',
    tag: 'Steer while rotating.',
    accent: '#f43f5e',
    purpose: 'Steer a 3D well while rotating — no slides.',
    goals: 'Hold a tight TVD window in the lateral and walk azimuth without orienting a bend.',
    functions: 'Rotary steerable points the bit under rotation. MWD still surveys and pulses. Used when slide ROP or hole quality will not fly.',
    joints: [
      {
        id: 'nmdc',
        ft: 24,
        od: '6¾ in',
        name: 'Non-magnetic collar',
        short: 'NMDC',
        color: '#e7e5e4',
        lede: 'RSS steel is still steel.',
        body: 'The steering unit below is ferrous. Spacing charts still apply. A pretty RSS does not excuse a short monel.',
      },
      {
        id: 'gamma',
        ft: 4,
        od: '6¾ in',
        name: 'Gamma detector',
        short: 'GR',
        color: '#c084fc',
        lede: 'Geosteer while you rotate.',
        body: 'Same crystal. The difference is you can correct TVD without laying down a slide. GR plus continuous steering is the point of this BHA.',
      },
      {
        id: 'directional',
        ft: 5,
        od: '6¾ in',
        name: 'Directional package',
        short: 'Dir',
        color: '#60a5fa',
        lede: 'Surveys plus the RSS downlink check.',
        body: 'You still QC Gtot, Btot, and dip. Toolface on an RSS is the steering command, not a motor high-side. Confirm the unit took the downlink before you drill another stand.',
      },
      {
        id: 'battery',
        ft: 10,
        od: '6¾ in',
        name: 'Lithium pack',
        short: 'Battery',
        color: '#fbbf24',
        lede: 'MWD power. RSS often has its own.',
        body: 'Many RSS units take mud-flow or their own cells. This pack is still the MWD. Treat them as two power budgets, not one.',
      },
      {
        id: 'pulser',
        ft: 7,
        od: '6¾ in',
        name: 'Positive pulser',
        short: 'Pulser',
        color: '#2dd4bf',
        lede: 'Uplink is still mud.',
        body: 'Surveys and GR still ride the standpipe. Downlink to the RSS is usually flow or RPM sequence — a different channel. Do not confuse a missed downlink with a dead pulser.',
      },
      {
        id: 'rss',
        ft: 12,
        od: '6¾ in',
        name: 'Rotary steerable',
        short: 'RSS',
        color: '#f43f5e',
        lede: 'Points the bit while the pipe turns.',
        body: 'Push-the-bit or point-the-bit. No bent housing, no slide. Steel, close to the bit. This is why Dir still needs NMDC above, not a short pup on top of the RSS.',
      },
      {
        id: 'bit',
        ft: 1,
        od: '8½ in',
        name: 'PDC bit',
        short: 'Bit',
        color: '#d4d4d8',
        lede: 'Sensor-to-bit is shorter than a motor string.',
        body: 'RSS sits closer to the face than a 28 ft motor. Directional lag shrinks. That is one reason RSS landings look tighter on TVD.',
      },
    ],
  },
  {
    id: 'em',
    label: 'EM MWD',
    tag: 'When mud cannot talk.',
    accent: '#22d3ee',
    purpose: 'Get surveys when mud pulse cannot — air, foam, LCM, or lost returns.',
    goals: 'Decode a signal at the surface stakes when there is no continuous mud column to carry a pulse.',
    functions: 'Electromagnetic telemetry through the formation. Same directional and gamma. No poppet. Used on underbalanced and some surface-hole sections.',
    joints: [
      {
        id: 'nmdc',
        ft: 24,
        od: '6¾ in',
        name: 'Non-magnetic collar',
        short: 'NMDC',
        color: '#e7e5e4',
        lede: 'Azimuth rules do not change with EM.',
        body: 'You still isolate the fluxgates. EM solves a telemetry problem, not a magnetic one.',
      },
      {
        id: 'gamma',
        ft: 4,
        od: '6¾ in',
        name: 'Gamma detector',
        short: 'GR',
        color: '#c084fc',
        lede: 'Same crystal, different uplink.',
        body: 'GR still counts API. It just rides an EM word instead of a pressure pulse. Formation conductivity that kills EM also makes the log late or missing.',
      },
      {
        id: 'directional',
        ft: 5,
        od: '6¾ in',
        name: 'Directional package',
        short: 'Dir',
        color: '#60a5fa',
        lede: 'Surveys without a standpipe tick.',
        body: 'Same six-axis package. QC is unchanged: Gtot, Btot, dip. If the word never shows, look at the EM channel and the stakes, not the accelerometers.',
      },
      {
        id: 'battery',
        ft: 10,
        od: '6¾ in',
        name: 'Lithium pack',
        short: 'Battery',
        color: '#fbbf24',
        lede: 'Now driving a transmitter, not a solenoid.',
        body: 'EM current into the formation is the hog here. Low voltage first shows as a weak surface signal, not a short pulse.',
      },
      {
        id: 'em',
        ft: 8,
        od: '6¾ in',
        name: 'EM transmitter',
        short: 'EM',
        color: '#22d3ee',
        lede: 'Gap sub and antenna — no poppet.',
        body: 'Drives current into the pipe and formation. Surface reads it on stakes or a receiver. Salt, casing, and deep conductive shale swallow the signal. That is a physics limit, not a programming error.',
      },
      {
        id: 'motor',
        ft: 28,
        od: '6¾ in',
        name: 'Mud motor',
        short: 'Motor',
        color: '#fb923c',
        lede: 'You can still slide. You just cannot pulse.',
        body: 'Air and foam wells still use motors. The telemetry changed; the steering did not. Steel below Dir is the same interferer.',
      },
      {
        id: 'bit',
        ft: 1,
        od: '8½ in',
        name: 'PDC bit',
        short: 'Bit',
        color: '#d4d4d8',
        lede: 'Same face, different voice.',
        body: 'Sensor-to-bit is still bit + motor + transmitter + battery. Do the subtraction. EM does not move the sensors closer to the rock.',
      },
    ],
  },
];

function fromBit(indexFromUphole: number, joints: { ft: number }[]) {
  let md = 0;
  for (let i = joints.length - 1; i > indexFromUphole; i--) md += joints[i].ft;
  return md + joints[indexFromUphole].ft / 2;
}

function JointIcon({
  kind,
  color,
  on,
  first,
  last,
}: {
  kind: JointId;
  color: string;
  on: boolean;
  first: boolean;
  last: boolean;
}) {
  const glow = on ? `drop-shadow(0 0 7px ${color})` : 'none';
  const opacity = on ? 1 : 0.42;
  const top = first ? 4 : 1.5;
  const bot = last ? 86 : 98.5;
  const r = 3.2;

  return (
    <span className="relative block h-full w-full" style={{ opacity }}>
      <svg viewBox="0 0 56 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden>
        <g fill="none" stroke={color} strokeWidth="1.7" style={{ filter: glow }}>
          <path
            d={`M${12 + r} ${top} H${44 - r} Q44 ${top} 44 ${top + r} V${bot - r} Q44 ${bot} ${44 - r} ${bot} H${12 + r} Q12 ${bot} 12 ${bot - r} V${top + r} Q12 ${top} ${12 + r} ${top} Z`}
            vectorEffect="non-scaling-stroke"
          />
        </g>
      </svg>
      <svg viewBox="0 0 56 100" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden>
        <g fill="none" stroke={color} strokeWidth="1.6" style={{ filter: glow }}>
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
          {kind === 'rss' && <path d="M16 42 L22 50 L16 58 M40 42 L34 50 L40 58" />}
          {kind === 'em' && (
            <>
              <circle cx="28" cy="42" r="7" />
              <circle cx="28" cy="58" r="7" />
            </>
          )}
          {kind === 'resistivity' && (
            <>
              <path d="M18 38 H38" />
              <path d="M18 50 H38" />
              <path d="M18 62 H38" />
            </>
          )}
        </g>
      </svg>
    </span>
  );
}

function MiniStack({ joints }: { joints: JointSpec[] }) {
  const max = Math.max(...joints.map((j) => j.ft));
  return (
    <span className="flex h-9 w-3.5 flex-col justify-between" aria-hidden>
      {joints.map((j, i) => (
        <span
          key={`${j.id}-${i}`}
          className="mx-auto w-full rounded-[1px]"
          style={{
            height: `${Math.max(2, (j.ft / max) * 7)}px`,
            background: j.color,
            boxShadow: `0 0 5px ${j.color}88`,
          }}
        />
      ))}
    </span>
  );
}

export const ToolArchitecture: React.FC = () => {
  const [assemblyId, setAssemblyId] = useState<AssemblyId>('motor');
  const [jointIndex, setJointIndex] = useState(2);
  const [spacing, setSpacing] = useState<Spacing>('standard');

  const assembly = ASSEMBLIES.find((a) => a.id === assemblyId)!;

  const joints = useMemo(
    () =>
      assembly.joints.map((j) =>
        j.id === 'nmdc' ? { ...j, ft: spacing === 'short' ? 8 : j.ft } : j
      ),
    [assembly, spacing]
  );

  const total = joints.reduce((s, j) => s + j.ft, 0);
  const dirIdx = joints.findIndex((j) => j.id === 'directional');
  const grIdx = joints.findIndex((j) => j.id === 'gamma');
  const nmdc = joints.find((j) => j.id === 'nmdc');
  const magOk = (nmdc?.ft ?? 0) >= 20;
  const safeIndex = Math.min(jointIndex, joints.length - 1);
  const selected = joints[safeIndex];
  const stb = fromBit(safeIndex, joints);
  const dirStb = dirIdx >= 0 ? fromBit(dirIdx, joints) : 0;
  const grStb = grIdx >= 0 ? fromBit(grIdx, joints) : 0;

  const pickAssembly = (next: AssemblyId) => {
    const a = ASSEMBLIES.find((x) => x.id === next)!;
    const dir = a.joints.findIndex((j) => j.id === 'directional');
    setAssemblyId(next);
    setJointIndex(dir >= 0 ? dir : 0);
  };

  const body =
    !magOk && (selected.id === 'nmdc' || selected.id === 'directional')
      ? 'You shorted the NMDC to save BHA length. Gravity will still pass. Magnetic will not. The first rotating survey is already dead.'
      : selected.body;

  return (
    <div className="space-y-4">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className="label-caps text-zinc-500">Sim lab</p>
        <h3 className="instrument-title mt-1">Tool Architecture</h3>
        <p className="mt-2 text-[13px] leading-relaxed text-zinc-300">
          Different BHAs serve different purposes. Here are a few to pick from.
        </p>
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-500">
          Walk the string from NMDC to bit. The notes change with the recipe — same joint,
          different reason it is there.
        </p>
      </motion.div>

      <div>
        {ASSEMBLIES.map((a, i) => {
          const on = assemblyId === a.id;
          return (
            <motion.button
              key={a.id}
              type="button"
              onClick={() => pickAssembly(a.id)}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.08 + i * 0.06, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="flex w-full items-center gap-3 py-2.5 text-left"
            >
              <MiniStack joints={a.joints} />
              <span className="min-w-0 flex-1">
                <span
                  className="block text-[13px] font-semibold"
                  style={{ color: on ? a.accent : '#fafafa' }}
                >
                  {a.label}
                </span>
                <span className={`block text-[11px] ${on ? 'text-zinc-300' : 'text-zinc-500'}`}>
                  {a.tag}
                </span>
              </span>
              {on && (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: a.accent, boxShadow: `0 0 10px ${a.accent}` }}
                />
              )}
            </motion.button>
          );
        })}
      </div>

      <div
        className="border-l-2 pl-3"
        style={{
          borderColor: assembly.accent,
          boxShadow: `-6px 0 18px ${assembly.accent}33`,
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[13px] leading-relaxed text-zinc-100">{assembly.purpose}</p>
          <span className={`instrument-chip shrink-0 ${magOk ? 'text-emerald-400' : 'text-red-400'}`}>
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
        <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
          <span className="text-zinc-500">Goal. </span>
          {assembly.goals}
        </p>
        <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">
          <span className="text-zinc-500">Does. </span>
          {assembly.functions}
        </p>
        <p className="mt-1 font-mono text-[11px] tabular-nums text-zinc-500">{total.toFixed(0)} ft BHA</p>
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
        <span className={magOk ? '' : 'text-red-400'}>NMDC {nmdc?.ft ?? 0} ft</span>
      </p>

      <p className="font-mono text-[10px] tracking-[0.18em] text-zinc-600">UPHOLE</p>

      <div>
        {joints.map((joint, i) => {
          const on = i === safeIndex;
          const px = Math.max(on ? 168 : 72, joint.ft * 12);
          return (
            <button
              key={`${assembly.id}-${joint.id}-${i}`}
              type="button"
              onClick={() => setJointIndex(i)}
              className="flex w-full items-stretch text-left"
              style={{ height: px }}
            >
              <span className="relative h-full w-20 shrink-0">
                <JointIcon
                  kind={joint.id}
                  color={joint.color}
                  on={on}
                  first={i === 0}
                  last={i === joints.length - 1}
                />
              </span>

              <span className="relative min-w-0 flex-1">
                <AnimatePresence mode="wait">
                  {on && (
                    <motion.span
                      key={`${assembly.id}-${joint.id}`}
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
                          stroke={joint.color}
                          strokeWidth="1.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                          style={{ filter: `drop-shadow(0 0 5px ${joint.color})` }}
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
                        <span className="block text-[13px] font-semibold" style={{ color: joint.color }}>
                          {selected.name}
                        </span>
                        <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-zinc-400">
                          {selected.od} · {selected.ft} ft · {stb.toFixed(0)} ft from bit
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
