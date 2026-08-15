import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'run' | 'debrief';
type PlotView = 'profile' | 'plan' | 'iso';
type WellPhase = 'vertical' | 'build' | 'turn' | 'hold' | 'lateral';
type LevelId = 1 | 2 | 3;

interface SurveyPoint {
  md: number;
  inc: number;
  azi: number;
  tvd: number;
  north: number;
  east: number;
  vs: number;
  dls: number;
}

interface Level {
  id: LevelId;
  well: string;
  name: string;
  brief: string;
  wellType: 'vertical' | 'build' | 'turn';
  mdMax: number;
  surveyEvery: number;
  kop?: number;
  eob?: number;
  turnStart?: number;
  calls: WellPhase[];
}

const LEVELS: Level[] = [
  {
    id: 1,
    well: 'Mustang 14-23H',
    name: 'Hold vertical',
    brief: 'Pilot hole. Inc stays 0°. TVD tracks MD. There is no KOP. Call vertical the whole stand.',
    wellType: 'vertical',
    mdMax: 2200,
    surveyEvery: 90,
    calls: ['vertical'],
  },
  {
    id: 2,
    well: 'Mustang 14-23H',
    name: 'Land the curve',
    brief: 'KOP 1,100 ft. 8°/100 ft to 90°. Mark KOP, then call build, then lateral when TVD goes flat.',
    wellType: 'build',
    mdMax: 2800,
    surveyEvery: 90,
    kop: 1100,
    eob: 2225,
    calls: ['vertical', 'build', 'lateral'],
  },
  {
    id: 3,
    well: 'Cedar Camp 9-4H',
    name: 'See the turn',
    brief: 'Build to 60°, then walk azi 120°. Profile hides the walk. Open Plan before you call turn.',
    wellType: 'turn',
    mdMax: 3400,
    surveyEvery: 90,
    kop: 900,
    eob: 1650,
    turnStart: 1800,
    calls: ['vertical', 'build', 'turn', 'hold'],
  },
];

const PHASE_META: Record<WellPhase, { label: string; color: string }> = {
  vertical: { label: 'Vertical', color: '#8a9099' },
  build: { label: 'Build', color: '#c47b3a' },
  turn: { label: 'Turn', color: '#4d8ecf' },
  hold: { label: 'Hold', color: '#3aa8b8' },
  lateral: { label: 'Lateral', color: '#3ecf8e' },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}
function toDeg(rad: number) {
  return (rad * 180) / Math.PI;
}

function designAngles(md: number, wellType: Level['wellType']) {
  if (wellType === 'vertical') return { inc: 0, azi: 0 };
  if (wellType === 'build') {
    const kop = 1100;
    const inc = md <= kop ? 0 : clamp((md - kop) * 0.08, 0, 90);
    return { inc, azi: 90 };
  }
  const kop = 900;
  const eob = 1650;
  const turnStart = 1800;
  const turnEnd = 3300;
  let inc = 0;
  if (md > kop) inc = clamp((md - kop) * 0.08, 0, 60);
  if (md > eob) inc = 60;
  let azi = 0;
  if (md > turnStart) azi = clamp(((md - turnStart) / (turnEnd - turnStart)) * 120, 0, 120);
  return { inc, azi };
}

function dogleg(i1: number, a1: number, i2: number, a2: number, dmd: number) {
  if (dmd <= 0) return 0;
  const cosDl = clamp(
    Math.cos(toRad(i1)) * Math.cos(toRad(i2)) +
      Math.sin(toRad(i1)) * Math.sin(toRad(i2)) * Math.cos(toRad(a2 - a1)),
    -1,
    1
  );
  return (toDeg(Math.acos(cosDl)) * 100) / dmd;
}

function buildSurvey(level: Level): SurveyPoint[] {
  const plannedAzi = level.wellType === 'vertical' ? 0 : level.wellType === 'build' ? 90 : 45;
  const planned = toRad(plannedAzi);
  const points: SurveyPoint[] = [{ md: 0, inc: 0, azi: 0, tvd: 0, north: 0, east: 0, vs: 0, dls: 0 }];
  const step = 25;
  for (let md = step; md <= level.mdMax; md += step) {
    const prev = points[points.length - 1];
    const { inc, azi } = designAngles(md, level.wellType);
    const dmd = md - prev.md;
    const i1 = toRad(prev.inc);
    const i2 = toRad(inc);
    const a1 = toRad(prev.azi);
    const a2 = toRad(azi);
    const cosDl = clamp(Math.cos(i1) * Math.cos(i2) + Math.sin(i1) * Math.sin(i2) * Math.cos(a2 - a1), -1, 1);
    const dl = Math.acos(cosDl);
    const rf = dl < 1e-8 ? 1 : (2 / dl) * Math.tan(dl / 2);
    const north = prev.north + (dmd / 2) * (Math.sin(i1) * Math.cos(a1) + Math.sin(i2) * Math.cos(a2)) * rf;
    const east = prev.east + (dmd / 2) * (Math.sin(i1) * Math.sin(a1) + Math.sin(i2) * Math.sin(a2)) * rf;
    const tvd = prev.tvd + (dmd / 2) * (Math.cos(i1) + Math.cos(i2)) * rf;
    points.push({
      md,
      inc,
      azi,
      tvd,
      north,
      east,
      vs: north * Math.cos(planned) + east * Math.sin(planned),
      dls: dogleg(prev.inc, prev.azi, inc, azi, dmd),
    });
  }
  return points;
}

function truthPhase(p: SurveyPoint, level: Level): WellPhase {
  if (level.wellType === 'vertical') return 'vertical';
  if (p.inc < 2) return 'vertical';
  if (level.wellType === 'build') return p.inc < 88 ? 'build' : 'lateral';
  if (p.inc < 58) return 'build';
  return p.dls > 1.5 ? 'turn' : 'hold';
}

function extent(values: number[], pad = 0.12) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 80);
  const extra = span * pad;
  return { min: min - extra, max: max + extra };
}

function mapRange(v: number, a0: number, a1: number, b0: number, b1: number) {
  if (a1 === a0) return (b0 + b1) / 2;
  return b0 + ((v - a0) / (a1 - a0)) * (b1 - b0);
}

function scoreRun(
  level: Level,
  samples: { md: number; truth: WellPhase; call: WellPhase }[],
  marks: { kind: string; md: number }[],
  usedPlanInTurn: boolean
) {
  let match = 0;
  for (const s of samples) if (s.call === s.truth) match += 1;
  const acc = samples.length ? match / samples.length : 0;
  const accPts = clamp(acc * 40, 0, 40);

  const needed: { kind: string; md: number }[] = [];
  if (level.kop) needed.push({ kind: 'kop', md: level.kop });
  if (level.eob && level.wellType === 'build') needed.push({ kind: 'eob', md: level.eob });
  if (level.turnStart) needed.push({ kind: 'turn', md: level.turnStart });
  let hits = 0;
  for (const n of needed) {
    if (marks.some((m) => m.kind === n.kind && Math.abs(m.md - n.md) <= 80)) hits += 1;
  }
  if (level.wellType === 'vertical') {
    hits = marks.some((m) => m.kind === 'kop') ? 0 : 1;
    needed.push({ kind: 'nokop', md: 0 });
  }
  const markPts = needed.length ? clamp((hits / needed.length) * 25, 0, 25) : 25;
  const viewPts = level.wellType === 'turn' ? (usedPlanInTurn ? 20 : 0) : 20;
  const fakeKop = level.wellType !== 'vertical' || !marks.some((m) => m.kind === 'kop');
  const processPts = fakeKop ? 15 : 0;
  const total = Math.round(accPts + markPts + viewPts + processPts);
  return { accPts, markPts, viewPts, processPts, total, acc, hits, need: needed.length };
}

function notesFor(level: Level, sc: ReturnType<typeof scoreRun>, bit: SurveyPoint): string[] {
  const out: string[] = [];
  if (sc.acc < 0.7) {
    out.push(
      `Phase call ${(sc.acc * 100).toFixed(0)}% . Vertical is inc < 2°. Build is DLS with rising inc. Turn is azi walking at hold inc — look at Plan.`
    );
  }
  if (level.wellType === 'vertical' && sc.processPts === 0) {
    out.push('You marked a KOP on a vertical. TVD tracked MD the whole way. There was no kickoff.');
  }
  if (level.kop && sc.hits < sc.need) {
    out.push(`Markers ${sc.hits}/${sc.need} inside 80 ft. KOP is where inc leaves 0°, not where you first thought about it.`);
  }
  if (level.wellType === 'turn' && sc.viewPts === 0) {
    out.push('You never opened Plan during the walk. Profile can look like a hold while azi is moving 120°.');
  }
  if (!out.length) {
    out.push(
      `Survey reads. Last MD ${bit.md.toFixed(0)}, inc ${bit.inc.toFixed(1)}°, TVD ${bit.tvd.toFixed(0)}, DLS ${bit.dls.toFixed(2)}°/100 ft.`
    );
  }
  return out;
}

const W = 360;
const H = 176;
const PAD = { l: 36, r: 12, t: 14, b: 22 };

export const WellboreTrajectory: React.FC = () => {
  const first = LEVELS[0];
  const [levelId, setLevelId] = useState<LevelId>(1);
  const level = LEVELS[levelId - 1];
  const [phase, setPhase] = useState<Phase>('run');
  const [playing, setPlaying] = useState(true);
  const [plotView, setPlotView] = useState<PlotView>('profile');
  const [md, setMd] = useState(200);
  const [call, setCall] = useState<WellPhase>('vertical');
  const [samples, setSamples] = useState<{ md: number; truth: WellPhase; call: WellPhase }[]>([]);
  const [marks, setMarks] = useState<{ kind: string; md: number }[]>([]);
  const [usedPlanInTurn, setUsedPlanInTurn] = useState(false);
  const [flash, setFlash] = useState(false);
  const [rop, setRop] = useState(140);

  const mdR = useRef(200);
  const callR = useRef<WellPhase>('vertical');
  const viewR = useRef<PlotView>('profile');
  const ropR = useRef(140);
  const nextSurvey = useRef(first.surveyEvery);
  const flashTimer = useRef(0);

  mdR.current = md;
  callR.current = call;
  viewR.current = plotView;
  ropR.current = rop;

  const survey = useMemo(() => buildSurvey(level), [level]);

  const loadWell = (id: LevelId, autoplay: boolean) => {
    const lvl = LEVELS[id - 1];
    setLevelId(id);
    setPhase('run');
    setPlaying(autoplay);
    setPlotView('profile');
    setMd(200);
    setCall('vertical');
    setSamples([]);
    setMarks([]);
    setUsedPlanInTurn(false);
    setFlash(false);
    setRop(140);
    mdR.current = 200;
    callR.current = 'vertical';
    viewR.current = 'profile';
    nextSurvey.current = lvl.surveyEvery;
  };

  const mark = (kind: string) => {
    setMarks((m) => [...m, { kind, md: mdR.current }]);
    setFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 1800);
  };

  useEffect(() => {
    if (phase !== 'run' || !playing) return;
    const id = window.setInterval(() => {
      const lvl = LEVELS[levelId - 1];
      const next = Math.min(lvl.mdMax, mdR.current + 8 + (ropR.current / 200) * 22);
      mdR.current = next;
      setMd(next);
      const pt = survey.find((p) => p.md >= next) ?? survey[survey.length - 1];
      const truth = truthPhase(pt, lvl);
      if (truth === 'turn' && viewR.current === 'plan') setUsedPlanInTurn(true);
      setSamples((s) => {
        const last = s[s.length - 1];
        if (last && next - last.md < 40) return s;
        return [...s, { md: next, truth, call: callR.current }];
      });
      if (next >= nextSurvey.current) {
        nextSurvey.current += lvl.surveyEvery;
        setFlash(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setFlash(false), 1600);
      }
      if (next >= lvl.mdMax) {
        setPlaying(false);
        setPhase('debrief');
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, levelId, playing, survey]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const visible = useMemo(() => survey.filter((p) => p.md <= md), [survey, md]);
  const bit = visible[visible.length - 1] ?? survey[0];
  const truth = truthPhase(bit, level);
  const sc = useMemo(
    () => scoreRun(level, samples, marks, usedPlanInTurn),
    [level, samples, marks, usedPlanInTurn]
  );
  const debriefNotes = useMemo(() => notesFor(level, sc, bit), [level, sc, bit]);

  const chip =
    phase === 'debrief'
      ? sc.total >= 75
        ? { label: 'Send', cls: 'text-[#3ecf8e]', bar: '#3ecf8e' }
        : { label: 'Miss', cls: 'text-[#d4a017]', bar: '#d4a017' }
      : flash
        ? { label: 'Station', cls: 'text-[#d4a017]', bar: '#d4a017' }
        : !playing
          ? { label: 'Paused', cls: 'text-[#8a9099]', bar: '#8a9099' }
          : call === truth
            ? { label: PHASE_META[truth].label, cls: 'text-[#3ecf8e]', bar: PHASE_META[truth].color }
            : { label: 'Off phase', cls: 'text-[#d4a017]', bar: '#d4a017' };

  const plot = useMemo(() => {
    const innerW = W - PAD.l - PAD.r;
    const innerH = H - PAD.t - PAD.b;
    const fit = survey;
    if (plotView === 'plan') {
      const nExt = extent(fit.map((p) => p.north));
      const eExt = extent(fit.map((p) => p.east));
      const span = Math.max(nExt.max - nExt.min, eExt.max - eExt.min, 200);
      const nMid = (nExt.min + nExt.max) / 2;
      const eMid = (eExt.min + eExt.max) / 2;
      const xOf = (e: number) => mapRange(e, eMid - span / 2, eMid + span / 2, PAD.l, PAD.l + innerW);
      const yOf = (n: number) => mapRange(n, nMid - span / 2, nMid + span / 2, PAD.t + innerH, PAD.t);
      return {
        xOf: (p: SurveyPoint) => xOf(p.east),
        yOf: (p: SurveyPoint) => yOf(p.north),
        xLabel: 'East (ft)',
        yLabel: 'North (ft)',
        yTicks: [nMid - span / 2, nMid, nMid + span / 2],
        xTicks: [eMid - span / 2, eMid, eMid + span / 2],
        yTickPos: (v: number) => yOf(v),
        xTickPos: (v: number) => xOf(v),
      };
    }
    if (plotView === 'iso') {
      const project = (p: SurveyPoint) => ({
        x: (p.east - p.north) * 0.866,
        y: p.tvd * 0.72 + (p.east + p.north) * 0.35,
      });
      const proj = fit.map(project);
      const xExt = extent(
        proj.map((p) => p.x),
        0.16
      );
      const yExt = extent(
        proj.map((p) => p.y),
        0.1
      );
      return {
        xOf: (p: SurveyPoint) => mapRange(project(p).x, xExt.min, xExt.max, PAD.l, PAD.l + innerW),
        yOf: (p: SurveyPoint) => mapRange(project(p).y, yExt.min, yExt.max, PAD.t, PAD.t + innerH),
        xLabel: 'N / E departure',
        yLabel: 'TVD down',
        yTicks: [] as number[],
        xTicks: [] as number[],
        yTickPos: () => 0,
        xTickPos: () => 0,
      };
    }
    const vsExt = extent(
      fit.map((p) => p.vs),
      0.08
    );
    const tvdMax = Math.max(...fit.map((p) => p.tvd), 400);
    return {
      xOf: (p: SurveyPoint) => mapRange(p.vs, vsExt.min, Math.max(vsExt.max, 120), PAD.l, PAD.l + innerW),
      yOf: (p: SurveyPoint) => mapRange(p.tvd, 0, tvdMax * 1.06, PAD.t, PAD.t + innerH),
      xLabel: 'Vertical section (ft)',
      yLabel: 'TVD (ft)',
      yTicks: [0, tvdMax / 2, tvdMax],
      xTicks: [0, (vsExt.max || 0) / 2, vsExt.max || 0].map((v) => Math.max(0, v)),
      yTickPos: (v: number) => mapRange(v, 0, tvdMax * 1.06, PAD.t, PAD.t + innerH),
      xTickPos: (v: number) => mapRange(v, vsExt.min, Math.max(vsExt.max, 120), PAD.l, PAD.l + innerW),
    };
  }, [survey, plotView]);

  const pathD = visible
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${plot.xOf(p).toFixed(1)},${plot.yOf(p).toFixed(1)}`)
    .join(' ');

  const tvdLag = bit.md - bit.tvd;
  const coach = (() => {
    if (phase === 'debrief') return debriefNotes[0];
    if (call !== truth) {
      return `Survey is ${PHASE_META[truth].label.toLowerCase()}. You have ${PHASE_META[call].label}. Inc ${bit.inc.toFixed(1)}° · DLS ${bit.dls.toFixed(1)}°/100 · azi ${bit.azi.toFixed(0)}°.`;
    }
    if (truth === 'vertical') {
      return `Vertical. TVD ${bit.tvd.toFixed(0)} vs MD ${bit.md.toFixed(0)}. They track until KOP.`;
    }
    if (truth === 'build') {
      return `Build. Inc ${bit.inc.toFixed(1)}° at ${bit.dls.toFixed(1)}°/100 ft. TVD is already ${tvdLag.toFixed(0)} ft behind MD.`;
    }
    if (truth === 'turn') {
      return `Turn. Inc is holding ~${bit.inc.toFixed(0)}° while azi walks to ${bit.azi.toFixed(0)}°. Profile looks quiet. Plan is the proof.`;
    }
    if (truth === 'lateral') {
      return `Lateral. Inc ~90°. TVD is flat. VS and departure keep growing.`;
    }
    return `Hold. Dogleg ${bit.dls.toFixed(1)}°/100 ft. Attitude is steady.`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Survey path</p>
          <h3 className="instrument-title mt-1">Wellbore Trajectory</h3>
          <p className="mt-1.5 min-h-[2.75rem] text-[12px] leading-relaxed text-[#8a9099]">{level.brief}</p>
        </div>
        <span className={`hmi-lamp w-[5.8rem] shrink-0 justify-end whitespace-nowrap ${chip.cls}`}>
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.bar }} />
          {chip.label}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.id}
            type="button"
            onClick={() => loadWell(lvl.id, true)}
            className={`hmi-key px-1.5 ${levelId === lvl.id ? 'is-on' : ''}`}
            style={levelId === lvl.id ? { borderColor: '#3ecf8e99', color: '#3ecf8e' } : undefined}
          >
            {lvl.name}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {(
          [
            ['profile', 'Profile'],
            ['plan', 'Plan'],
            ['iso', '3D'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPlotView(id)}
            className={`hmi-key flex-1 ${plotView === id ? 'is-on' : ''}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="overflow-hidden border border-[#1d2026] bg-[#07080a]">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full overflow-hidden" role="img" aria-label="Wellbore survey plot">
          <rect width={W} height={H} fill="#07080a" />
          {plot.yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line x1={PAD.l} x2={W - PAD.r} y1={plot.yTickPos(t)} y2={plot.yTickPos(t)} stroke="#1d2026" />
              <text x={PAD.l - 5} y={plot.yTickPos(t) + 3} textAnchor="end" fill="#5c636e" fontSize="8">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {plot.xTicks.map((t) => (
            <g key={`x-${t}`}>
              <line y1={PAD.t} y2={H - PAD.b} x1={plot.xTickPos(t)} x2={plot.xTickPos(t)} stroke="#1d2026" />
              <text x={plot.xTickPos(t)} y={H - 7} textAnchor="middle" fill="#5c636e" fontSize="8">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {pathD && <path d={pathD} fill="none" stroke="#3ecf8e" strokeWidth="1.45" />}
          {visible
            .filter((p) => p.md > 0 && p.md % 90 < 26)
            .map((p) => (
              <circle key={p.md} cx={plot.xOf(p)} cy={plot.yOf(p)} r="1.7" fill="#8a9099" />
            ))}
          <circle cx={plot.xOf(bit)} cy={plot.yOf(bit)} r="2.4" fill="#e6e8eb" />
          <text x={PAD.l} y={10} fill="#5c636e" fontSize="8">
            {plot.yLabel}
          </text>
          <text x={W - PAD.r} y={H - 7} textAnchor="end" fill="#5c636e" fontSize="8">
            {plot.xLabel}
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-1 border-y border-[#1d2026] py-2">
        {[
          { l: 'MD', v: bit.md.toFixed(0), u: 'ft' },
          { l: 'Inc', v: bit.inc.toFixed(1), u: '°' },
          { l: 'TVD', v: bit.tvd.toFixed(0), u: 'ft', warn: level.wellType !== 'vertical' && tvdLag > 40 },
          { l: 'DLS', v: bit.dls.toFixed(1), u: '/100', warn: bit.dls > 8 },
        ].map((row) => (
          <div key={row.l}>
            <p className="label-caps">{row.l}</p>
            <p className={`hmi-readout text-[18px] leading-none ${row.warn ? 'text-[#d4a017]' : 'text-[#e6e8eb]'}`}>
              {row.v}
              <span className="ml-0.5 text-[10px] text-[#5c636e]">{row.u}</span>
            </p>
          </div>
        ))}
      </div>

      <p className="hmi-readout text-[11px] text-[#8a9099]">
        Azi {bit.azi.toFixed(1)}°
        <span className="text-[#5c636e]"> · </span>
        VS {bit.vs.toFixed(0)}
        <span className="text-[#5c636e]"> · </span>
        {bit.north >= 0 ? `${bit.north.toFixed(0)} N` : `${(-bit.north).toFixed(0)} S`}{' '}
        {bit.east >= 0 ? `${bit.east.toFixed(0)} E` : `${(-bit.east).toFixed(0)} W`}
        <span className="text-[#5c636e]"> · </span>
        MD−TVD {tvdLag.toFixed(0)}
      </p>

      <div className="flex flex-wrap gap-1.5">
        {level.calls.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setCall(p)}
            className={`hmi-key flex-1 ${call === p ? 'is-on' : ''}`}
            style={call === p ? { borderColor: `${PHASE_META[p].color}cc`, color: PHASE_META[p].color } : undefined}
          >
            {PHASE_META[p].label}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {level.wellType !== 'vertical' && (
          <button type="button" onClick={() => mark('kop')} className="hmi-key flex-1">
            Mark KOP
          </button>
        )}
        {level.eob && level.wellType === 'build' && (
          <button type="button" onClick={() => mark('eob')} className="hmi-key flex-1">
            Mark EOB
          </button>
        )}
        {level.turnStart && (
          <button type="button" onClick={() => mark('turn')} className="hmi-key flex-1">
            Mark turn
          </button>
        )}
        {level.wellType === 'vertical' && (
          <button type="button" onClick={() => mark('kop')} className="hmi-key flex-1">
            Mark KOP
          </button>
        )}
      </div>

      <label className="flex items-center gap-2">
        <span className="label-caps w-8">ROP</span>
        <input
          type="range"
          min={40}
          max={220}
          step={5}
          value={rop}
          onChange={(e) => setRop(Number(e.target.value))}
          className="h-1 flex-1 appearance-none bg-[#1d2026] accent-[#3ecf8e]"
        />
        <span className="hmi-readout w-8 text-right text-[11px] text-[#e6e8eb]">{rop}</span>
      </label>

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => (phase === 'debrief' ? loadWell(levelId, true) : setPlaying((p) => !p))}
          className="hmi-key is-on flex-1"
          style={{ borderColor: '#3ecf8e99', color: '#3ecf8e' }}
        >
          {phase === 'debrief' ? (
            <>
              <Play size={12} /> Again
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
        <button type="button" onClick={() => loadWell(levelId, true)} className="hmi-key" aria-label="Reset well">
          <RotateCcw size={12} />
        </button>
      </div>

      <p className={`min-h-[1.15rem] hmi-readout text-[11px] text-[#d4a017] ${flash ? 'visible' : 'invisible'}`}>
        Station {bit.md.toFixed(0)} · Inc {bit.inc.toFixed(1)}° · TVD {bit.tvd.toFixed(0)} · DLS {bit.dls.toFixed(2)}
      </p>

      <p className="min-h-[2.75rem] text-[12px] leading-relaxed text-[#8a9099]">{coach}</p>

      {phase === 'debrief' && (
        <div className="space-y-2 border-t border-[#1d2026] pt-3">
          <p className="hmi-readout text-[22px] leading-none text-[#e6e8eb]">
            {sc.total}
            <span className="ml-1 text-[11px] text-[#5c636e]">/ 100</span>
          </p>
          {[
            { l: 'Phase call', v: `${(sc.acc * 100).toFixed(0)}%`, p: sc.accPts, max: 40 },
            { l: 'Markers ±80 ft', v: `${sc.hits}/${sc.need}`, p: sc.markPts, max: 25 },
            { l: 'Plan on the turn', v: level.wellType === 'turn' ? (usedPlanInTurn ? 'Used' : 'Never') : 'n/a', p: sc.viewPts, max: 20 },
            { l: 'No false KOP', v: sc.processPts ? 'Hold' : 'False KOP', p: sc.processPts, max: 15 },
          ].map((row) => (
            <div key={row.l} className="flex items-baseline justify-between gap-3 text-[12px]">
              <span className="text-[#8a9099]">{row.l}</span>
              <span className="hmi-readout text-[#e6e8eb]">
                {row.v}
                <span className="ml-2 text-[#5c636e]">
                  {Math.round(row.p)}/{row.max}
                </span>
              </span>
            </div>
          ))}
          {debriefNotes.slice(1).map((n) => (
            <p key={n} className="text-[12px] leading-relaxed text-[#8a9099]">
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};
