import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'run' | 'debrief';
type Mode = 'slide' | 'rotate';
type LevelId = 1 | 2 | 3;
type LithId = 'limestone' | 'washout' | 'interbed';
type Dysfunction = 'quiet' | 'bounce' | 'whirl' | 'stick';

interface Sample {
  axial: number;
  lateral: number;
  torsional: number;
}

interface Survey {
  md: number;
  axial: number;
  lateral: number;
  torsional: number;
  ssr: number;
  pulse: number;
  pass: boolean;
}

interface Level {
  id: LevelId;
  well: string;
  name: string;
  brief: string;
  startMd: number;
  endMd: number;
  surveyEvery: number;
  rpm: number;
  wob: number;
  gpm: number;
  mode: Mode;
  lith: LithId;
}

const LEVELS: Level[] = [
  {
    id: 1,
    well: 'Mustang 14-23H',
    name: 'Kill bounce',
    brief: '12¼″ surface in hard limestone. Night tour left 42 klb and 80 RPM. Kill the bounce and take a clean survey before the pulser beats itself apart.',
    startMd: 820,
    endMd: 980,
    surveyEvery: 90,
    rpm: 80,
    wob: 42,
    gpm: 360,
    mode: 'rotate',
    lith: 'limestone',
  },
  {
    id: 2,
    well: 'Mustang 14-23H',
    name: 'Kill whirl',
    brief: 'Curve at 38°. Light WOB, 178 RPM, washed sand. Lateral Gs are eating the MWD. Kill whirl without sliding into stick-slip.',
    startMd: 1480,
    endMd: 1660,
    surveyEvery: 90,
    rpm: 178,
    wob: 12,
    gpm: 540,
    mode: 'rotate',
    lith: 'washout',
  },
  {
    id: 3,
    well: 'Cedar Camp 9-4H',
    name: 'Hold the face',
    brief: 'Sliding interbed. Motor stalling, TF swinging, pulses dropping. 36 RPM / 40 klb. Get the face holdable and take a station without a twist-off.',
    startMd: 1520,
    endMd: 1700,
    surveyEvery: 120,
    rpm: 36,
    wob: 40,
    gpm: 290,
    mode: 'slide',
    lith: 'interbed',
  },
];

const TRACE_N = 96;
const TRACE_W = 240;
const TRACE_H = 36;

const LITH: Record<LithId, { label: string; axial: number; lateral: number; torsional: number; rop: number; gr: number }> = {
  limestone: { label: 'Hard limestone', axial: 1.28, lateral: 0.68, torsional: 0.82, rop: 0.72, gr: 28 },
  washout: { label: 'Washed sand', axial: 0.7, lateral: 1.38, torsional: 0.74, rop: 1.18, gr: 42 },
  interbed: { label: 'Sand / shale interbed', axial: 0.92, lateral: 0.86, torsional: 1.42, rop: 0.84, gr: 78 },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function severity(g: number) {
  if (g >= 8) return { label: 'Critical', cls: 'text-red-400', bar: '#ef4444' };
  if (g >= 5) return { label: 'Warning', cls: 'text-amber-400', bar: '#f59e0b' };
  return { label: 'Safe', cls: 'text-emerald-400', bar: '#10b981' };
}

function classify(s: Sample): Dysfunction {
  const w = Math.max(s.axial, s.lateral, s.torsional);
  if (w < 5) return 'quiet';
  if (s.lateral >= w) return 'whirl';
  if (s.torsional >= w) return 'stick';
  return 'bounce';
}

function targets(rpm: number, wob: number, gpm: number, mode: Mode, lith: LithId): Sample {
  const r = rpm / 200;
  const w = wob / 50;
  const q = gpm / 500;
  const m = LITH[lith];
  const rotary = mode === 'rotate' ? 1 : 0.22;
  const slide = mode === 'slide' ? 1.28 : 1;
  return {
    axial: clamp(w * 6.6 * (0.48 + (1 - r) * 0.72) * m.axial + (w > 0.74 ? 2.5 : 0), 0.2, 10),
    lateral: clamp(
      r * 9.1 * (1.22 - w) * m.lateral * rotary + (r > 0.78 && w < 0.3 ? 2.7 : 0) + (q > 1.08 ? 0.7 : 0),
      0.2,
      10
    ),
    torsional: clamp(
      (1 - r) * w * 10.1 * m.torsional * slide + (r < 0.24 && w > 0.56 ? 2.4 : 0) - (q - 0.78) * 1.15,
      0.2,
      10
    ),
  };
}

function nextSample(t: number, rpm: number, wob: number, gpm: number, mode: Mode, lith: LithId): Sample {
  const tgt = targets(rpm, wob, gpm, mode, lith);
  const bounce = 0.42 + 0.58 * Math.sin(t * 38);
  const whirl = Math.sin(t * 72) * 0.55 + Math.sin(t * 19) * 0.35;
  const stickPhase = (t * 1.7) % 1;
  const slip = stickPhase < 0.72 ? (stickPhase / 0.72) * 0.22 : 0.22 + ((stickPhase - 0.72) / 0.28) * 0.78;
  const noise = () => (Math.random() - 0.5) * 0.32;
  return {
    axial: clamp(tgt.axial * (0.34 + 0.66 * bounce) + noise(), 0, 10),
    lateral: clamp(tgt.lateral * (0.48 + 0.52 * Math.abs(whirl)) + noise(), 0, 10),
    torsional: clamp(tgt.torsional * slip + noise() * 0.38, 0, 10),
  };
}

function stickSlipRatio(s: Sample, rpm: number) {
  const amp = s.torsional / 4.1;
  return clamp(amp * (rpm < 70 ? 1.15 : 1), 0, 2);
}

function bitRpm(surf: number, s: Sample, t: number) {
  const phase = (t * 1.7) % 1;
  const slip = phase < 0.72 ? 0.12 + (s.torsional / 40) : 1.15 + s.torsional / 9;
  return clamp(surf * slip, 0, 420);
}

function pulseQuality(s: Sample) {
  return clamp(100 - s.axial * 4.2 - s.torsional * 6.4 - Math.max(0, s.lateral - 5) * 2.2, 0, 100);
}

function tfWander(s: Sample) {
  return s.lateral * 3.1 + s.torsional * 5.2;
}

function toPath(values: number[]) {
  if (!values.length) return '';
  return values
    .map((v, i) => {
      const x = (i / (TRACE_N - 1)) * TRACE_W;
      const y = TRACE_H - (v / 10) * (TRACE_H - 4) - 2;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function scoreRun(
  safeFrac: number,
  peak: number,
  health: number,
  pulseMean: number,
  surveys: Survey[],
  killed: boolean
) {
  const safePts = clamp(safeFrac * 25, 0, 25);
  const peakPts = peak <= 7 ? 20 : peak <= 9 ? 10 : 0;
  const healthPts = clamp((health / 100) * 15, 0, 15);
  const pulsePts = clamp((pulseMean / 100) * 15, 0, 15);
  const taken = surveys.length;
  const passed = surveys.filter((s) => s.pass).length;
  const surveyPts = taken === 0 ? 0 : clamp((passed / taken) * 15, 0, 15);
  const processPts = killed ? 0 : 10;
  const total = Math.round(safePts + peakPts + healthPts + pulsePts + surveyPts + processPts);
  return { safePts, peakPts, healthPts, pulsePts, surveyPts, processPts, total, passed, taken };
}

function notesFor(
  level: Level,
  peak: Sample,
  ssrMax: number,
  shocks: number,
  surveys: Survey[],
  health: number,
  killed: 'ok' | 'electronics' | 'stall' | 'twist',
  counts: Record<Dysfunction, number>
): string[] {
  const out: string[] = [];
  const ticks = Math.max(1, counts.quiet + counts.bounce + counts.whirl + counts.stick);
  const worstDys = (['bounce', 'whirl', 'stick'] as Dysfunction[]).sort((a, b) => counts[b] - counts[a])[0];
  if (killed === 'electronics') {
    out.push(`Tool electronics died at ${health.toFixed(0)}%. Peak ${Math.max(peak.axial, peak.lateral, peak.torsional).toFixed(1)} G. That is a POOH.`);
  }
  if (killed === 'stall') {
    out.push('Motor stall. High WOB and low RPM on a slide stacked torque until the bit stopped. Ease WOB or add rotary.');
  }
  if (killed === 'twist') {
    out.push(`Twist-off risk. Peak stick-slip ratio ${ssrMax.toFixed(2)}. Bit RPM was cycling several times surface RPM.`);
  }
  if (counts[worstDys] / ticks > 0.35) {
    const fix =
      worstDys === 'bounce'
        ? 'Ease WOB and pick RPM up off the bounce window.'
        : worstDys === 'whirl'
          ? 'Drop RPM and add WOB. Light and fast walks the BHA.'
          : 'Raise RPM, ease WOB, add flow. The motor is stalling then snapping.';
    out.push(
      `${worstDys === 'bounce' ? 'Bit bounce' : worstDys === 'whirl' ? 'Whirl' : 'Stick-slip'} owned ${((counts[worstDys] / ticks) * 100).toFixed(0)}% of the stand. ${fix}`
    );
  }
  if (peak.axial >= 8) out.push(`Peak axial ${peak.axial.toFixed(1)} G. Pulser valves and battery connections take those hits.`);
  if (peak.lateral >= 8) out.push(`Peak lateral ${peak.lateral.toFixed(1)} G. Electronics and gamma go noisy. That is whirl.`);
  if (peak.torsional >= 8) out.push(`Peak torsional ${peak.torsional.toFixed(1)} G. Toolface cannot hold and pulses drop.`);
  const failed = surveys.filter((s) => !s.pass).length;
  if (failed) {
    out.push(`${failed} of ${surveys.length} station${surveys.length === 1 ? '' : 's'} failed QC. Survey only when all three channels are under 5 G and pulse is above 55%.`);
  }
  if (shocks > 40) out.push(`${shocks} shock counts this stand. That is how tools come back dead.`);
  if (!out.length) {
    out.push(
      `Quiet enough to send. Peak ${Math.max(peak.axial, peak.lateral, peak.torsional).toFixed(1)} G, SSR ${ssrMax.toFixed(2)}, electronics ${health.toFixed(0)}%.`
    );
  }
  return out;
}

export const VibrationMonitor: React.FC = () => {
  const first = LEVELS[0];
  const [levelId, setLevelId] = useState<LevelId>(1);
  const level = LEVELS[levelId - 1];
  const [phase, setPhase] = useState<Phase>('run');
  const [playing, setPlaying] = useState(true);
  const [mode, setMode] = useState<Mode>(first.mode);
  const [rpm, setRpm] = useState(first.rpm);
  const [wob, setWob] = useState(first.wob);
  const [gpm, setGpm] = useState(first.gpm);
  const [md, setMd] = useState(first.startMd);
  const [health, setHealth] = useState(100);
  const [live, setLive] = useState<Sample>({ axial: 3.2, lateral: 1.4, torsional: 1.1 });
  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [stationFlash, setStationFlash] = useState(false);
  const [peak, setPeak] = useState<Sample>({ axial: 0, lateral: 0, torsional: 0 });
  const [ssrMax, setSsrMax] = useState(0);
  const [shocks, setShocks] = useState(0);
  const [safeTicks, setSafeTicks] = useState(0);
  const [ticks, setTicks] = useState(0);
  const [pulseAcc, setPulseAcc] = useState(0);
  const [counts, setCounts] = useState<Record<Dysfunction, number>>({
    quiet: 0,
    bounce: 0,
    whirl: 0,
    stick: 0,
  });
  const [killed, setKilled] = useState<'ok' | 'electronics' | 'stall' | 'twist'>('ok');
  const [grLive, setGrLive] = useState(LITH[first.lith].gr);

  const history = useRef<Sample[]>(Array.from({ length: TRACE_N }, () => ({ axial: 1, lateral: 1, torsional: 0.8 })));
  const tRef = useRef(0);
  const rpmR = useRef(rpm);
  const wobR = useRef(wob);
  const gpmR = useRef(gpm);
  const modeR = useRef<Mode>(mode);
  const mdR = useRef(md);
  const nextSurvey = useRef(first.startMd + first.surveyEvery);
  const stallR = useRef(0);
  const twistR = useRef(0);
  const flashTimer = useRef(0);
  const healthR = useRef(100);

  rpmR.current = rpm;
  wobR.current = wob;
  gpmR.current = gpm;
  modeR.current = mode;
  mdR.current = md;
  healthR.current = health;

  const loadWell = (id: LevelId, autoplay: boolean) => {
    const lvl = LEVELS[id - 1];
    setLevelId(id);
    setPhase('run');
    setPlaying(autoplay);
    setMode(lvl.mode);
    setRpm(lvl.rpm);
    setWob(lvl.wob);
    setGpm(lvl.gpm);
    setMd(lvl.startMd);
    setHealth(100);
    setLive({ axial: 2.4, lateral: 1.2, torsional: 1 });
    setSurveys([]);
    setStationFlash(false);
    setPeak({ axial: 0, lateral: 0, torsional: 0 });
    setSsrMax(0);
    setShocks(0);
    setSafeTicks(0);
    setTicks(0);
    setPulseAcc(0);
    setCounts({ quiet: 0, bounce: 0, whirl: 0, stick: 0 });
    setKilled('ok');
    setGrLive(LITH[lvl.lith].gr);
    history.current = Array.from({ length: TRACE_N }, () => ({ axial: 1, lateral: 1, torsional: 0.8 }));
    tRef.current = 0;
    mdR.current = lvl.startMd;
    nextSurvey.current = lvl.startMd + lvl.surveyEvery;
    stallR.current = 0;
    twistR.current = 0;
    healthR.current = 100;
  };

  const takeSurvey = (s: Sample, atMd: number, pulse: number, ssr: number) => {
    const pass = Math.max(s.axial, s.lateral, s.torsional) < 5 && pulse >= 55;
    const row: Survey = { md: atMd, axial: s.axial, lateral: s.lateral, torsional: s.torsional, ssr, pulse, pass };
    setSurveys((prev) => [...prev, row]);
    setStationFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setStationFlash(false), 2200);
  };

  useEffect(() => {
    if (phase !== 'run' || !playing) return;
    const id = window.setInterval(() => {
      const lvl = LEVELS[levelId - 1];
      tRef.current += 0.08;
      const sample = nextSample(tRef.current, rpmR.current, wobR.current, gpmR.current, modeR.current, lvl.lith);
      const nextHist = history.current.slice(1);
      nextHist.push(sample);
      history.current = nextHist;
      setLive(sample);

      const worst = Math.max(sample.axial, sample.lateral, sample.torsional);
      const ssr = stickSlipRatio(sample, rpmR.current);
      const pulse = pulseQuality(sample);
      const dys = classify(sample);

      setPeak((p) => ({
        axial: Math.max(p.axial, sample.axial),
        lateral: Math.max(p.lateral, sample.lateral),
        torsional: Math.max(p.torsional, sample.torsional),
      }));
      setSsrMax((v) => Math.max(v, ssr));
      if (worst >= 8) setShocks((n) => n + 1);
      setTicks((n) => n + 1);
      if (worst < 5) setSafeTicks((n) => n + 1);
      setPulseAcc((a) => a + pulse);
      setCounts((c) => ({ ...c, [dys]: c[dys] + 1 }));
      setGrLive(LITH[lvl.lith].gr + (worst - 1) * 4.2 + (Math.random() - 0.5) * 6);

      const hit =
        Math.max(0, sample.axial - 6) * 0.32 +
        Math.max(0, sample.lateral - 5) * 0.52 +
        Math.max(0, sample.torsional - 6) * 0.38;
      const recover = hit > 0 ? 0 : 0.28;
      const nextHealth = clamp(healthR.current - hit + recover, 0, 100);
      healthR.current = nextHealth;
      setHealth(nextHealth);

      if (modeR.current === 'slide' && wobR.current > 36 && rpmR.current < 45 && sample.torsional > 7) {
        stallR.current += 1;
      } else {
        stallR.current = Math.max(0, stallR.current - 1);
      }
      if (ssr > 1.12) twistR.current += 1;
      else twistR.current = Math.max(0, twistR.current - 1);

      const lith = LITH[lvl.lith];
      const rop = (0.7 + (wobR.current / 50) * 1.3 + (rpmR.current / 200) * 0.5) * lith.rop * (1 - worst / 22);
      const dmd = 0.42 + clamp(rop, 0.3, 2.2) * 0.38;
      const nextMd = mdR.current + dmd;
      mdR.current = nextMd;
      setMd(nextMd);

      if (nextMd >= nextSurvey.current && nextMd < lvl.endMd) {
        nextSurvey.current += lvl.surveyEvery;
        takeSurvey(sample, nextMd, pulse, ssr);
      }

      if (nextHealth <= 4) {
        setKilled('electronics');
        setPlaying(false);
        setPhase('debrief');
        return;
      }
      if (stallR.current > 28) {
        setKilled('stall');
        setPlaying(false);
        setPhase('debrief');
        return;
      }
      if (twistR.current > 36) {
        setKilled('twist');
        setPlaying(false);
        setPhase('debrief');
        return;
      }
      if (nextMd >= lvl.endMd) {
        setPlaying(false);
        setPhase('debrief');
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, levelId, playing]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const pulseNow = pulseQuality(live);
  const ssrNow = stickSlipRatio(live, rpm);
  const bitNow = bitRpm(rpm, live, tRef.current);
  const wander = tfWander(live);
  const worst = Math.max(live.axial, live.lateral, live.torsional);
  const overall = severity(worst);
  const lith = LITH[level.lith];
  const pulseMean = ticks ? pulseAcc / ticks : pulseNow;
  const sc = useMemo(
    () => scoreRun(ticks ? safeTicks / ticks : 0, Math.max(peak.axial, peak.lateral, peak.torsional), health, pulseMean, surveys, killed !== 'ok'),
    [ticks, safeTicks, peak, health, pulseMean, surveys, killed]
  );
  const debriefNotes = useMemo(
    () => notesFor(level, peak, ssrMax, shocks, surveys, health, killed, counts),
    [level, peak, ssrMax, shocks, surveys, health, killed, counts]
  );

  const channels = [
    { key: 'axial', name: 'Axial', sub: 'Bit bounce', value: live.axial, path: toPath(history.current.map((s) => s.axial)) },
    { key: 'lateral', name: 'Lateral', sub: 'Whirl', value: live.lateral, path: toPath(history.current.map((s) => s.lateral)) },
    { key: 'torsional', name: 'Torsional', sub: 'Stick-slip', value: live.torsional, path: toPath(history.current.map((s) => s.torsional)) },
  ];

  const shakeX = clamp((live.lateral - 1) * 0.28, -2.1, 2.1);
  const shakeY = clamp((live.axial - 1) * 0.22, -2.1, 2.1);
  const spin = 18 + live.torsional * 16;
  const healthColor = health < 35 ? '#ef4444' : health < 65 ? '#f59e0b' : '#10b981';
  const lastSurvey = surveys[surveys.length - 1];
  const mdSpan = Math.max(1, level.endMd - level.startMd);
  const mdPct = clamp(((md - level.startMd) / mdSpan) * 100, 0, 100);

  const chip =
    killed === 'electronics'
      ? { label: 'Dead tool', cls: 'text-red-400', bar: '#ef4444' }
      : killed === 'stall'
        ? { label: 'Motor stall', cls: 'text-red-400', bar: '#ef4444' }
        : killed === 'twist'
          ? { label: 'Twist-off', cls: 'text-red-400', bar: '#ef4444' }
          : phase === 'debrief'
            ? sc.total >= 75
              ? { label: 'Send', cls: 'text-emerald-400', bar: '#34d399' }
              : { label: 'Miss', cls: 'text-amber-400', bar: '#f59e0b' }
            : stationFlash
              ? { label: lastSurvey?.pass ? 'Survey OK' : 'Survey fail', cls: lastSurvey?.pass ? 'text-emerald-400' : 'text-red-400', bar: lastSurvey?.pass ? '#34d399' : '#ef4444' }
              : !playing
                ? { label: 'Paused', cls: 'text-zinc-300', bar: '#a1a1aa' }
                : { label: overall.label, cls: overall.cls, bar: overall.bar };

  const coach = (() => {
    if (phase === 'debrief') return debriefNotes[0];
    if (killed !== 'ok') return debriefNotes[0];
    const dys = classify(live);
    if (dys === 'whirl') return `Whirl. ${rpm} RPM and ${wob} klb in ${lith.label}. Lateral ${live.lateral.toFixed(1)} G. Drop RPM or add weight.`;
    if (dys === 'stick') return `Stick-slip. SSR ${ssrNow.toFixed(2)}. Bit ${bitNow.toFixed(0)} vs surface ${rpm}. Face wander ±${wander.toFixed(0)}°. Raise RPM or ease WOB.`;
    if (dys === 'bounce') return `Bit bounce. Axial ${live.axial.toFixed(1)} G at ${wob} klb. Pulser and batteries take the jackhammer. Ease WOB.`;
    return `Quiet hole in ${lith.label}. Pulse ${pulseNow.toFixed(0)}%. This is the window to take a station.`;
  })();

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-zinc-500">Sim lab</p>
          <h3 className="instrument-title mt-1">Vibration Monitor</h3>
          <p className="mt-1 min-h-[3.25rem] text-[12px] leading-relaxed text-zinc-400">{level.brief}</p>
        </div>
        <span className={`instrument-chip w-[6.6rem] shrink-0 justify-center whitespace-nowrap ${chip.cls}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.bar }} />
          {chip.label}
        </span>
      </div>

      <div className="flex gap-1">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => loadWell(lvl.id, true)}
            className={`instrument-btn flex-1 px-1.5 ${levelId === lvl.id ? 'is-active' : ''}`}
          >
            {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex gap-2 overflow-hidden rounded-xl border border-white/10 bg-[#07080a] p-2">
        <svg viewBox="0 0 72 148" className="h-[148px] w-16 shrink-0 overflow-hidden" aria-hidden="true">
          <rect x="18" y="6" width="36" height="136" rx="18" fill="#111827" stroke="#27272a" />
          <rect x="22" y="10" width="28" height="128" rx="14" fill="#09090b" />
          <g transform={`translate(${shakeX.toFixed(1)} ${shakeY.toFixed(1)})`}>
            <rect x="30" y="16" width="12" height="18" rx="2" fill="#52525b" />
            <rect x="28" y="36" width="16" height="28" rx="3" fill="#10b981" opacity="0.85" />
            <rect x="30" y="66" width="12" height="22" rx="2" fill="#3f3f46" />
            <g transform={`rotate(${((tRef.current * spin) % 360).toFixed(1)} 36 108)`}>
              <circle cx="36" cy="108" r="11" fill="#a1a1aa" />
              <path d="M36 98 L39 108 L36 118 L33 108 Z" fill="#18181b" />
            </g>
          </g>
          <text x="36" y="144" textAnchor="middle" fill="#52525b" fontSize="7">
            BHA
          </text>
        </svg>

        <div className="min-w-0 flex-1 space-y-1">
          {channels.map((ch) => {
            const sev = severity(ch.value);
            return (
              <div key={ch.key} className="flex items-center gap-2">
                <div className="w-[4.6rem] shrink-0">
                  <p className="text-[10px] font-semibold leading-none text-zinc-200">{ch.name}</p>
                  <p className="text-[9px] text-zinc-500">{ch.sub}</p>
                </div>
                <svg viewBox={`0 0 ${TRACE_W} ${TRACE_H}`} className="h-9 flex-1 overflow-hidden" preserveAspectRatio="none">
                  <line x1="0" x2={TRACE_W} y1={TRACE_H * 0.5} y2={TRACE_H * 0.5} stroke="rgba(255,255,255,0.06)" />
                  <path d={ch.path} fill="none" stroke={sev.bar} strokeWidth="1.7" strokeLinejoin="round" />
                </svg>
                <div className="w-12 shrink-0 text-right">
                  <p className="font-mono text-[12px] font-semibold leading-none tabular-nums text-zinc-100">
                    {ch.value.toFixed(1)}
                  </p>
                  <p className={`text-[9px] font-medium ${sev.cls}`}>{sev.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-emerald-500/80" style={{ width: `${mdPct}%` }} />
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-zinc-300">
        <span>MD {md.toFixed(0)}</span>
        <span>Bit {bitNow.toFixed(0)}</span>
        <span className={ssrNow >= 1 ? 'text-amber-400' : ''}>SSR {ssrNow.toFixed(2)}</span>
        <span className={pulseNow < 55 ? 'text-amber-400' : ''}>Pulse {pulseNow.toFixed(0)}%</span>
        <span>Shk {shocks}</span>
        <span>TF ±{wander.toFixed(0)}°</span>
        <span>GR {grLive.toFixed(0)}</span>
        <span style={{ color: healthColor }}>El {Math.round(health)}%</span>
      </div>

      <div className="flex gap-1">
        {(['slide', 'rotate'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`instrument-btn flex-1 capitalize ${mode === m ? 'is-active' : ''}`}
          >
            {m}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <span className="label-caps w-8">RPM</span>
        <input
          type="range"
          min={20}
          max={200}
          value={rpm}
          onChange={(e) => setRpm(Number(e.target.value))}
          className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
        />
        <span className="w-8 text-right font-mono text-[11px] text-zinc-300">{rpm}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="label-caps w-8">WOB</span>
        <input
          type="range"
          min={5}
          max={50}
          value={wob}
          onChange={(e) => setWob(Number(e.target.value))}
          className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
        />
        <span className="w-8 text-right font-mono text-[11px] text-zinc-300">{wob}</span>
      </label>
      <label className="flex items-center gap-2">
        <span className="label-caps w-8">GPM</span>
        <input
          type="range"
          min={220}
          max={620}
          step={10}
          value={gpm}
          onChange={(e) => setGpm(Number(e.target.value))}
          className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
        />
        <span className="w-8 text-right font-mono text-[11px] text-zinc-300">{gpm}</span>
      </label>

      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => (phase === 'debrief' ? loadWell(levelId, true) : setPlaying((p) => !p))}
          className="instrument-btn is-active flex-1"
        >
          {phase === 'debrief' ? (
            <>
              <Play size={12} /> Drill again
            </>
          ) : playing ? (
            <>
              <Pause size={12} /> Pause
            </>
          ) : (
            <>
              <Play size={12} /> Drill
            </>
          )}
        </button>
        <button
          type="button"
          disabled={phase !== 'run'}
          onClick={() => takeSurvey(live, md, pulseNow, ssrNow)}
          className="instrument-btn flex-1"
        >
          Take survey
        </button>
        <button type="button" onClick={() => loadWell(levelId, true)} className="instrument-btn" aria-label="Reset stand">
          <RotateCcw size={12} />
        </button>
      </div>

      <p
        className={`min-h-[1.15rem] font-mono text-[11px] tabular-nums ${
          lastSurvey?.pass ? 'text-emerald-300' : 'text-amber-300'
        } ${stationFlash && lastSurvey ? 'visible' : 'invisible'}`}
      >
        {lastSurvey
          ? `Station ${lastSurvey.md.toFixed(0)} · Ax ${lastSurvey.axial.toFixed(1)} Lat ${lastSurvey.lateral.toFixed(1)} Tor ${lastSurvey.torsional.toFixed(1)} · ${lastSurvey.pass ? 'QC pass' : 'QC fail'}`
          : 'Station'}
      </p>

      <p className="min-h-[2.75rem] text-[12px] leading-relaxed text-zinc-400">{coach}</p>

      {phase === 'debrief' && (
        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-zinc-50">
            Score {sc.total}
            <span className="text-zinc-500"> / 100</span>
          </p>
          {[
            { l: 'Time in safe window', v: `${ticks ? ((safeTicks / ticks) * 100).toFixed(0) : 0}% < 5 G`, p: sc.safePts, max: 25 },
            { l: 'Peak G', v: `${Math.max(peak.axial, peak.lateral, peak.torsional).toFixed(1)} G`, p: sc.peakPts, max: 20 },
            { l: 'Electronics', v: `${Math.round(health)}%`, p: sc.healthPts, max: 15 },
            { l: 'Pulse uptime', v: `${pulseMean.toFixed(0)}%`, p: sc.pulsePts, max: 15 },
            { l: 'Surveys', v: `${sc.passed}/${sc.taken} pass`, p: sc.surveyPts, max: 15 },
            { l: 'Hole / tool', v: killed === 'ok' ? 'Open hole' : killed, p: sc.processPts, max: 10 },
          ].map((row) => (
            <div key={row.l} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-zinc-400">{row.l}</span>
              <span className="font-mono tabular-nums text-zinc-200">
                {row.v}
                <span className="ml-2 text-zinc-500">
                  {Math.round(row.p)}/{row.max}
                </span>
              </span>
            </div>
          ))}
          {debriefNotes.slice(1).map((n) => (
            <p key={n} className="text-[12px] leading-relaxed text-zinc-400">
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
