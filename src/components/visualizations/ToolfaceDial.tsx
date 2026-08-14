import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'brief' | 'run' | 'station' | 'debrief';
type Mode = 'slide' | 'rotate';
type TfRef = 'gtf' | 'mtf';
type LevelId = 1 | 2 | 3;
type PlotView = 'profile' | 'plan';

interface Station {
  md: number;
  inc: number;
  azi: number;
  tvd: number;
  north: number;
  east: number;
  vs: number;
  dls: number;
  mode: Mode;
}

interface Lith {
  name: string;
  gr: number;
  res: number;
  yieldMul: number;
  walkMul: number;
}

interface Level {
  id: LevelId;
  well: string;
  name: string;
  brief: string;
  goal: string;
  start: Station;
  planEnd: { md: number; inc: number; azi: number; tvd: number };
  yield: number;
  surveyEvery: number;
  lag: number;
  walk: number;
  tfNoise: number;
  planAzi: number;
  dlsLimit: number;
}

const LEVELS: Level[] = [
  {
    id: 1,
    well: 'Mustang 14-23H',
    name: 'KOP build',
    brief: '90 ft past KOP on a 1.83° motor. Inclination is 5°. Land 45° at 1,700 ft MD on 90° azimuth. High-side slide. Surveys every 90 ft.',
    goal: 'Finish inc 43–47°, TVD within 15 ft of plan, peak DLS under 10°/100 ft. Switch to GTF once inc is above ~8°.',
    start: { md: 1210, inc: 5, azi: 90, tvd: 1206, north: 0, east: 18, vs: 18, dls: 0, mode: 'slide' },
    planEnd: { md: 1700, inc: 45, azi: 90, tvd: 1578 },
    yield: 8,
    surveyEvery: 90,
    lag: 0.14,
    walk: 0.4,
    tfNoise: 1.1,
    planAzi: 90,
    dlsLimit: 10,
  },
  {
    id: 2,
    well: 'Mustang 14-23H',
    name: 'Hold and turn',
    brief: 'Tangent at 42°. Walk azimuth from 90° to 130° by 2,200 ft MD. Frontier sand walks the bit right when you rotate.',
    goal: 'Slide near 90° GTF to turn. Rotate only to hold inc. Finish azi 126–134°, inc 40–44°, DLS under 10°/100 ft.',
    start: { md: 1780, inc: 42, azi: 90, tvd: 1624, north: 12, east: 210, vs: 210, dls: 3.1, mode: 'rotate' },
    planEnd: { md: 2200, inc: 42, azi: 130, tvd: 1936 },
    yield: 7.5,
    surveyEvery: 90,
    lag: 0.1,
    walk: 1.8,
    tfNoise: 2,
    planAzi: 110,
    dlsLimit: 10,
  },
  {
    id: 3,
    well: 'Cedar Camp 9-4H',
    name: 'Off-plan recovery',
    brief: 'Night tour left you 6° under plan with 18° of toolface lag. Surveys are 120 ft apart. Sand walk is live. Do not dogleg the casing.',
    goal: 'Get back on an 8°/100 ft build. Finish inc within 3° of 50° and TVD within 25 ft. Peak DLS under 12°/100 ft.',
    start: { md: 1400, inc: 12, azi: 88, tvd: 1384, north: -4, east: 62, vs: 61, dls: 4.4, mode: 'slide' },
    planEnd: { md: 1880, inc: 50, azi: 90, tvd: 1710 },
    yield: 8.2,
    surveyEvery: 120,
    lag: 0.055,
    walk: 2.4,
    tfNoise: 3.2,
    planAzi: 90,
    dlsLimit: 12,
  },
];

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}
function toRad(d: number) {
  return (d * Math.PI) / 180;
}
function toDeg(r: number) {
  return (r * 180) / Math.PI;
}
function wrap360(d: number) {
  return ((d % 360) + 360) % 360;
}
function angDiff(a: number, b: number) {
  return ((a - b + 540) % 360) - 180;
}

function dogleg(i1: number, a1: number, i2: number, a2: number, dmd: number) {
  if (dmd <= 0) return 0;
  const c = clamp(
    Math.cos(toRad(i1)) * Math.cos(toRad(i2)) +
      Math.sin(toRad(i1)) * Math.sin(toRad(i2)) * Math.cos(toRad(a2 - a1)),
    -1,
    1
  );
  return (toDeg(Math.acos(c)) * 100) / dmd;
}

function stepMinCurv(p: Station, inc: number, azi: number, dmd: number, planAzi: number, mode: Mode): Station {
  const i1 = toRad(p.inc);
  const i2 = toRad(inc);
  const a1 = toRad(p.azi);
  const a2 = toRad(azi);
  const c = clamp(Math.cos(i1) * Math.cos(i2) + Math.sin(i1) * Math.sin(i2) * Math.cos(a2 - a1), -1, 1);
  const dl = Math.acos(c);
  const rf = dl < 1e-8 ? 1 : (2 / dl) * Math.tan(dl / 2);
  const north = p.north + (dmd / 2) * (Math.sin(i1) * Math.cos(a1) + Math.sin(i2) * Math.cos(a2)) * rf;
  const east = p.east + (dmd / 2) * (Math.sin(i1) * Math.sin(a1) + Math.sin(i2) * Math.sin(a2)) * rf;
  const tvd = p.tvd + (dmd / 2) * (Math.cos(i1) + Math.cos(i2)) * rf;
  const paz = toRad(planAzi);
  return {
    md: p.md + dmd,
    inc,
    azi: wrap360(azi),
    tvd,
    north,
    east,
    vs: north * Math.cos(paz) + east * Math.sin(paz),
    dls: dogleg(p.inc, p.azi, inc, azi, dmd),
    mode,
  };
}

function lithAt(tvd: number): Lith {
  if (tvd < 1320) return { name: 'Pierre shale', gr: 96, res: 3.8, yieldMul: 1.06, walkMul: 0.35 };
  if (tvd < 1480) return { name: 'Mancos shale', gr: 112, res: 3.1, yieldMul: 1.1, walkMul: 0.3 };
  if (tvd < 1620) return { name: 'Frontier sand', gr: 44, res: 19, yieldMul: 0.86, walkMul: 1.65 };
  return { name: 'Niobrara', gr: 74, res: 8.4, yieldMul: 0.96, walkMul: 0.95 };
}

function yieldFromWob(wob: number) {
  const x = (wob - 24) / 12;
  return clamp(1 - x * x * 0.55, 0.42, 1.06);
}

function reactiveLeft(wob: number) {
  return clamp((wob - 10) * 0.07, 0, 2.4);
}

function buildPlan(level: Level): Station[] {
  const pts: Station[] = [{ ...level.start, mode: 'slide' }];
  const span = Math.max(1, level.planEnd.md - level.start.md);
  const step = 20;
  for (let md = level.start.md + step; md <= level.planEnd.md + 0.1; md += step) {
    const t = clamp((md - level.start.md) / span, 0, 1);
    const inc = level.start.inc + t * (level.planEnd.inc - level.start.inc);
    const azi = wrap360(level.start.azi + t * angDiff(level.planEnd.azi, level.start.azi));
    const prev = pts[pts.length - 1];
    pts.push(stepMinCurv(prev, inc, azi, md - prev.md, level.planAzi, 'slide'));
  }
  return pts;
}

function planAt(plan: Station[], md: number): Station {
  if (md <= plan[0].md) return plan[0];
  for (let i = 1; i < plan.length; i++) {
    if (plan[i].md >= md) {
      const a = plan[i - 1];
      const b = plan[i];
      const t = (md - a.md) / Math.max(1e-6, b.md - a.md);
      return {
        md,
        inc: a.inc + (b.inc - a.inc) * t,
        azi: wrap360(a.azi + angDiff(b.azi, a.azi) * t),
        tvd: a.tvd + (b.tvd - a.tvd) * t,
        north: a.north + (b.north - a.north) * t,
        east: a.east + (b.east - a.east) * t,
        vs: a.vs + (b.vs - a.vs) * t,
        dls: b.dls,
        mode: 'slide',
      };
    }
  }
  return plan[plan.length - 1];
}

function scoreRun(
  level: Level,
  last: Station,
  peakDls: number,
  tfMeanErr: number,
  gtfGood: boolean,
  mtfGood: boolean,
  stuck: boolean
) {
  const incPts = clamp(25 - Math.abs(last.inc - level.planEnd.inc) * 7, 0, 25);
  const tvdPts = clamp(20 - Math.abs(last.tvd - level.planEnd.tvd) * 0.7, 0, 20);
  const aziPts = clamp(15 - Math.abs(angDiff(last.azi, level.planEnd.azi)) * 1.15, 0, 15);
  const dlsPts = peakDls <= level.dlsLimit - 2 ? 15 : peakDls <= level.dlsLimit ? 8 : 0;
  const holdPts = tfMeanErr < 16 ? 10 : tfMeanErr < 26 ? 5 : 0;
  const refPts = (gtfGood ? 6 : 0) + (mtfGood ? 4 : 0);
  const stuckPts = stuck ? 0 : 5;
  const total = Math.round(incPts + tvdPts + aziPts + dlsPts + holdPts + refPts + stuckPts);
  return { incPts, tvdPts, aziPts, dlsPts, holdPts, refPts, stuckPts, total };
}

function notesFor(
  level: Level,
  last: Station,
  peakDls: number,
  tfMeanErr: number,
  stuck: boolean,
  target: Station
): string[] {
  const out: string[] = [];
  const dInc = last.inc - target.inc;
  const dTvd = last.tvd - target.tvd;
  const dAzi = angDiff(last.azi, target.azi);
  if (stuck) {
    out.push(
      `Stuck-pipe event at ${last.md.toFixed(0)} ft MD. Long slide + high WOB packed cuttings. Score process bucket is zero.`
    );
  }
  if (Math.abs(dInc) > 3) {
    out.push(
      `Inc finished ${dInc >= 0 ? '+' : ''}${dInc.toFixed(1)}° vs plan ${target.inc.toFixed(1)}°. ${
        dInc < 0 ? 'You rotated too much or slid off high-side.' : 'You over-slid the build. Rotate to hold.'
      }`
    );
  }
  if (Math.abs(dTvd) > 12) {
    out.push(
      `TVD ${last.tvd.toFixed(0)} vs plan ${target.tvd.toFixed(0)} (${dTvd >= 0 ? '+' : ''}${dTvd.toFixed(0)} ft). Inc error integrates into TVD through min-curvature.`
    );
  }
  if (Math.abs(dAzi) > 4) {
    out.push(
      `Azimuth ${dAzi >= 0 ? '+' : ''}${dAzi.toFixed(1)}° off plan ${target.azi.toFixed(1)}°. Right turn is ~90° GTF; left is ~270°. Rotate walk is ${level.walk.toFixed(1)}°/100 ft.`
    );
  }
  if (peakDls > level.dlsLimit) {
    out.push(
      `Peak DLS ${peakDls.toFixed(1)}°/100 ft exceeds the ${level.dlsLimit}°/100 ft casing limit. That is a keyseat / slide-sheet fail.`
    );
  }
  if (tfMeanErr > 22) {
    out.push(
      `Mean |toolface error| ${tfMeanErr.toFixed(0)}°. Lead right for reactive torque. High WOB increases left walk of the face.`
    );
  }
  if (!out.length) {
    out.push(
      `Curve is sendable. Last station MD ${last.md.toFixed(0)}, DLS ${last.dls.toFixed(2)}°/100 ft, inc ${last.inc.toFixed(1)}°, TVD ${last.tvd.toFixed(0)}.`
    );
  }
  return out;
}

const PW = 360;
const PH = 168;
const PAD = { l: 34, r: 10, t: 14, b: 22 };

function mapRange(v: number, a0: number, a1: number, b0: number, b1: number) {
  if (a1 === a0) return (b0 + b1) / 2;
  return b0 + ((v - a0) / (a1 - a0)) * (b1 - b0);
}

function extent(values: number[], pad = 0.14) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, 60);
  const extra = span * pad;
  return { min: min - extra, max: max + extra };
}

function spark(values: number[], w = 72, h = 18) {
  if (values.length < 2) return '';
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 1 - ((v - lo) / Math.max(1, hi - lo)) * (h - 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const ToolfaceDial: React.FC = () => {
  const [levelId, setLevelId] = useState<LevelId>(1);
  const level = LEVELS[levelId - 1];
  const [phase, setPhase] = useState<Phase>('brief');
  const [mode, setMode] = useState<Mode>('slide');
  const [tfRefMode, setTfRefMode] = useState<TfRef>('gtf');
  const [cmdTf, setCmdTf] = useState(0);
  const [wob, setWob] = useState(24);
  const [rop, setRop] = useState(120);
  const [bit, setBit] = useState<Station>(level.start);
  const [surveys, setSurveys] = useState<Station[]>([level.start]);
  const [peakDls, setPeakDls] = useState(0);
  const [tfErrAcc, setTfErrAcc] = useState(0);
  const [tfErrN, setTfErrN] = useState(0);
  const [gtfOk, setGtfOk] = useState(false);
  const [mtfOk, setMtfOk] = useState(true);
  const [gtfLowHits, setGtfLowHits] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [stuckRisk, setStuckRisk] = useState(0);
  const [slideFt, setSlideFt] = useState(0);
  const [grHist, setGrHist] = useState<number[]>([96]);
  const [grLive, setGrLive] = useState(96);
  const [resLive, setResLive] = useState(4);
  const [contInc, setContInc] = useState(level.start.inc);
  const [contAzi, setContAzi] = useState(level.start.azi);
  const [plotView, setPlotView] = useState<PlotView>('profile');
  const [actualTf, setActualTf] = useState(0);

  const actualTfR = useRef(0);
  const cmdR = useRef(0);
  const modeR = useRef<Mode>('slide');
  const refR = useRef<TfRef>('gtf');
  const wobR = useRef(24);
  const ropR = useRef(120);
  const bitR = useRef(bit);
  const nextSurvey = useRef(level.start.md + level.surveyEvery);
  const slideFtR = useRef(0);
  const stuckR = useRef(0);

  cmdR.current = cmdTf;
  modeR.current = mode;
  refR.current = tfRefMode;
  wobR.current = wob;
  ropR.current = rop;
  bitR.current = bit;

  const plan = useMemo(() => buildPlan(level), [level]);
  const targetNow = planAt(plan, bit.md);

  const reset = (lvl: Level) => {
    setPhase('brief');
    setMode(lvl.start.mode);
    setTfRefMode(lvl.start.inc < 7 ? 'mtf' : 'gtf');
    setCmdTf(0);
    setWob(24);
    setRop(120);
    setBit(lvl.start);
    setSurveys([lvl.start]);
    setPeakDls(0);
    setTfErrAcc(0);
    setTfErrN(0);
    setGtfOk(false);
    setMtfOk(true);
    setGtfLowHits(0);
    setStuck(false);
    setStuckRisk(0);
    setSlideFt(0);
    setGrHist([lithAt(lvl.start.tvd).gr]);
    setGrLive(lithAt(lvl.start.tvd).gr);
    setResLive(lithAt(lvl.start.tvd).res);
    setContInc(lvl.start.inc);
    setContAzi(lvl.start.azi);
    setActualTf(0);
    actualTfR.current = 0;
    nextSurvey.current = lvl.start.md + lvl.surveyEvery;
    slideFtR.current = 0;
    stuckR.current = 0;
  };

  const startLevel = (id: LevelId) => {
    const lvl = LEVELS[id - 1];
    setLevelId(id);
    reset(lvl);
    setPhase('run');
  };

  useEffect(() => {
    if (phase !== 'run') return;
    const id = window.setInterval(() => {
      const lvl = LEVELS[levelId - 1];
      const prev = bitR.current;
      if (prev.md >= lvl.planEnd.md) {
        setPhase('debrief');
        return;
      }

      const dmd = 2.1 + (ropR.current / 200) * 3.4;
      const lith = lithAt(prev.tvd);
      const wobNow = wobR.current;
      const sliding = modeR.current === 'slide';
      const yEff = (lvl.yield / 100) * yieldFromWob(wobNow) * lith.yieldMul;

      const cmdGtf =
        refR.current === 'gtf' ? cmdR.current : wrap360(cmdR.current - prev.azi);

      if (sliding) {
        const gtfNoise = prev.inc < 5 ? (5 - prev.inc) * 7 + lvl.tfNoise : lvl.tfNoise;
        const err = angDiff(cmdGtf, actualTfR.current);
        actualTfR.current = wrap360(
          actualTfR.current + err * lvl.lag - reactiveLeft(wobNow) * 0.35 + (Math.random() - 0.5) * gtfNoise
        );
        setTfErrAcc((a) => a + Math.abs(err));
        setTfErrN((n) => n + 1);
        slideFtR.current += dmd;
      } else {
        actualTfR.current = wrap360(actualTfR.current + 22 + wobNow * 0.25);
        slideFtR.current = Math.max(0, slideFtR.current - dmd * 0.55);
      }
      setActualTf(actualTfR.current);

      if (refR.current === 'gtf' && prev.inc > 8) setGtfOk(true);
      if (refR.current === 'gtf' && prev.inc < 5) {
        setGtfLowHits((n) => n + 1);
        setMtfOk(false);
      }

      let inc = prev.inc;
      let azi = prev.azi;
      const gtf = actualTfR.current;
      if (sliding) {
        inc = clamp(inc + yEff * dmd * Math.cos(toRad(gtf)), 0, 95);
        const sI = Math.sin(toRad(Math.max(inc, 3)));
        azi = azi + (yEff * dmd * Math.sin(toRad(gtf))) / sI;
      } else {
        const drop = 0.004 + 0.006 * Math.sin(toRad(inc));
        inc = clamp(inc - drop * dmd, 0, 95);
        azi = azi + ((lvl.walk * lith.walkMul) / 100) * dmd;
      }

      const next = stepMinCurv(prev, inc, wrap360(azi), dmd, lvl.planAzi, modeR.current);
      setPeakDls((p) => Math.max(p, next.dls));
      setBit(next);
      setContInc(inc + (Math.random() - 0.5) * 0.18);
      setContAzi(wrap360(azi + (Math.random() - 0.5) * 0.35));

      const gr = lith.gr + (Math.random() - 0.5) * 8;
      const res = Math.max(0.8, lith.res * (1 + (Math.random() - 0.5) * 0.08));
      setGrLive(gr);
      setResLive(res);
      setGrHist((h) => [...h.slice(-47), gr]);
      setSlideFt(slideFtR.current);

      let risk = stuckR.current;
      if (sliding && slideFtR.current > 160 && wobNow > 30) {
        risk += 1.6 + (wobNow - 30) * 0.25;
      } else {
        risk = Math.max(0, risk - 1.1);
      }
      if (next.dls > 12) risk += 0.8;
      stuckR.current = risk;
      setStuckRisk(risk);
      if (risk >= 100) {
        setStuck(true);
        setSurveys((s) => [...s, next]);
        setPhase('debrief');
        return;
      }

      if (next.md >= nextSurvey.current) {
        nextSurvey.current += lvl.surveyEvery;
        setSurveys((s) => [...s, next]);
        setPhase('station');
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, levelId]);

  const tfMean = tfErrN ? tfErrAcc / tfErrN : 0;
  const gtfGood = gtfOk && gtfLowHits < 18;
  const sc = useMemo(
    () => scoreRun(level, bit, peakDls, tfMean, gtfGood, mtfOk, stuck),
    [level, bit, peakDls, tfMean, gtfGood, mtfOk, stuck]
  );
  const debriefNotes = useMemo(
    () => notesFor(level, bit, peakDls, tfMean, stuck, planAt(plan, level.planEnd.md)),
    [level, bit, peakDls, tfMean, stuck, plan]
  );

  const gtfUnreliable = bit.inc < 5 && tfRefMode === 'gtf';
  const displayTf = tfRefMode === 'gtf' ? actualTf : wrap360(actualTf + bit.azi);
  const cmdGtf = tfRefMode === 'gtf' ? cmdTf : wrap360(cmdTf - bit.azi);
  const lith = lithAt(bit.tvd);
  const dInc = bit.inc - targetNow.inc;
  const dTvd = bit.tvd - targetNow.tvd;
  const dAzi = angDiff(bit.azi, targetNow.azi);
  const tfLag = Math.abs(angDiff(cmdGtf, actualTf));

  const plot = useMemo(() => {
    const innerW = PW - PAD.l - PAD.r;
    const innerH = PH - PAD.t - PAD.b;
    const fit = [...plan, bit];
    if (plotView === 'plan') {
      const nExt = extent(fit.map((p) => p.north));
      const eExt = extent(fit.map((p) => p.east));
      const span = Math.max(nExt.max - nExt.min, eExt.max - eExt.min, 80);
      const nMid = (nExt.min + nExt.max) / 2;
      const eMid = (eExt.min + eExt.max) / 2;
      const xOf = (e: number) => mapRange(e, eMid - span / 2, eMid + span / 2, PAD.l, PAD.l + innerW);
      const yOf = (n: number) => mapRange(n, nMid - span / 2, nMid + span / 2, PAD.t + innerH, PAD.t);
      return {
        xOf: (p: Station) => xOf(p.east),
        yOf: (p: Station) => yOf(p.north),
        xLabel: 'East (ft)',
        yLabel: 'North (ft)',
        yTicks: [nMid - span / 2, nMid, nMid + span / 2],
        xTicks: [eMid - span / 2, eMid, eMid + span / 2],
        yTickPos: (v: number) => yOf(v),
        xTickPos: (v: number) => xOf(v),
      };
    }
    const vsExt = extent(fit.map((p) => p.vs), 0.1);
    const tvd0 = Math.min(...fit.map((p) => p.tvd)) - 20;
    const tvd1 = Math.max(...fit.map((p) => p.tvd)) + 30;
    return {
      xOf: (p: Station) => mapRange(p.vs, vsExt.min, Math.max(vsExt.max, 40), PAD.l, PAD.l + innerW),
      yOf: (p: Station) => mapRange(p.tvd, tvd0, tvd1, PAD.t, PAD.t + innerH),
      xLabel: 'Vertical section (ft)',
      yLabel: 'TVD (ft)',
      yTicks: [tvd0, (tvd0 + tvd1) / 2, tvd1],
      xTicks: [vsExt.min, (vsExt.min + vsExt.max) / 2, vsExt.max],
      yTickPos: (v: number) => mapRange(v, tvd0, tvd1, PAD.t, PAD.t + innerH),
      xTickPos: (v: number) => mapRange(v, vsExt.min, Math.max(vsExt.max, 40), PAD.l, PAD.l + innerW),
    };
  }, [plan, bit, plotView]);

  const livePts = [...surveys, bit];
  const pathOf = (pts: Station[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${plot.xOf(p).toFixed(1)},${plot.yOf(p).toFixed(1)}`).join(' ');

  const chip =
    phase === 'debrief'
      ? stuck
        ? { label: 'Stuck', cls: 'text-red-400', bar: '#ef4444' }
        : sc.total >= 75
          ? { label: 'Send', cls: 'text-emerald-400', bar: '#34d399' }
          : { label: 'Miss', cls: 'text-amber-400', bar: '#f59e0b' }
      : phase === 'station'
        ? { label: 'Station', cls: 'text-amber-400', bar: '#f59e0b' }
        : stuckRisk > 55
          ? { label: 'Packoff risk', cls: 'text-red-400', bar: '#ef4444' }
          : bit.dls > level.dlsLimit
            ? { label: 'High DLS', cls: 'text-amber-400', bar: '#f59e0b' }
            : { label: mode === 'slide' ? 'Sliding' : 'Rotating', cls: 'text-emerald-400', bar: '#34d399' };

  const coach = (() => {
    if (phase === 'station') {
      return `Survey at ${bit.md.toFixed(0)} ft. Inc ${bit.inc.toFixed(1)}° vs plan ${targetNow.inc.toFixed(1)}° (${dInc >= 0 ? '+' : ''}${dInc.toFixed(1)}). TVD ${dTvd >= 0 ? '+' : ''}${dTvd.toFixed(0)} ft. Correct, then drill ahead.`;
    }
    if (gtfUnreliable) return 'Inc is under 5°. Gravity toolface is poorly defined. Switch to MTF or the face you think you have is fiction.';
    if (stuckRisk > 70) return `Cuttings packing up. Slide footage ${slideFt.toFixed(0)} ft at ${wob} klb. Rotate and circulate before this becomes a stuck event.`;
    if (bit.dls > level.dlsLimit) return `DLS ${bit.dls.toFixed(1)}°/100 ft is over the ${level.dlsLimit}°/100 limit. Ease the curve — you cannot bury this with the next slide.`;
    if (tfLag > 35 && mode === 'slide') return `Toolface lag ${tfLag.toFixed(0)}°. Lead right for reactive torque. Dropping WOB will let the face catch the command.`;
    if (mode === 'rotate') {
      return `Rotating in ${lith.name}. Walk ${ (level.walk * lith.walkMul).toFixed(1)}°/100 ft to the right. Inc will sag. Use this to hold, not to land.`;
    }
    return `Sliding ${actualTf.toFixed(0)}° GTF in ${lith.name}. Effective yield ${(level.yield * yieldFromWob(wob) * lith.yieldMul).toFixed(1)}°/100 ft. HS builds, 90° turns right, 270° left.`;
  })();

  const rubric = [
    { l: 'Inc vs plan', v: `${bit.inc.toFixed(1)}° / ${level.planEnd.inc}°`, p: sc.incPts, max: 25 },
    { l: 'TVD vs plan', v: `${bit.tvd.toFixed(0)} / ${level.planEnd.tvd} ft`, p: sc.tvdPts, max: 20 },
    { l: 'Azi vs plan', v: `${bit.azi.toFixed(1)}° / ${level.planEnd.azi}°`, p: sc.aziPts, max: 15 },
    { l: 'Peak DLS', v: `${peakDls.toFixed(1)}°/100 ft`, p: sc.dlsPts, max: 15 },
    { l: 'Slide TF hold', v: `${tfMean.toFixed(0)}° mean |err|`, p: sc.holdPts, max: 10 },
    { l: 'GTF / MTF use', v: gtfGood && mtfOk ? 'Correct refs' : 'Ref miss', p: sc.refPts, max: 10 },
    { l: 'Hole condition', v: stuck ? 'Stuck event' : 'Open hole', p: sc.stuckPts, max: 5 },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-zinc-500">Sim lab</p>
          <h3 className="instrument-title mt-1">Toolface Control</h3>
          <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400">
            Plan the slide, hold the face, take the station, correct. Minimum curvature
            and DLS decide if this curve gets sent — not the dial by itself.
          </p>
        </div>
        {phase !== 'brief' && (
          <span className={`instrument-chip shrink-0 ${chip.cls}`}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: chip.bar }} />
            {chip.label}
          </span>
        )}
      </div>

      {phase === 'brief' && (
        <div className="space-y-1">
          {LEVELS.map((lvl) => (
            <button
              key={lvl.id}
              type="button"
              onClick={() => startLevel(lvl.id)}
              className="w-full py-2.5 text-left"
            >
              <span className="flex items-baseline justify-between gap-3">
                <span className="text-[13px] font-semibold text-zinc-50">
                  Level {lvl.id} · {lvl.name}
                </span>
                <span className="label-caps text-zinc-600">{lvl.well}</span>
              </span>
              <span className="mt-0.5 block text-[12px] leading-relaxed text-zinc-400">{lvl.brief}</span>
              <span className="mt-1 block text-[11px] leading-relaxed text-emerald-400/90">{lvl.goal}</span>
            </button>
          ))}
        </div>
      )}

      {phase !== 'brief' && (
        <>
          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-[12px] text-zinc-400">
              L{level.id} {level.name}
              <span className="text-zinc-600"> · {level.well}</span>
            </p>
            <button type="button" onClick={() => reset(level)} className="instrument-btn !py-1" aria-label="Reset well">
              <RotateCcw size={12} />
            </button>
          </div>

          <div className="flex gap-1">
            {(
              [
                ['profile', 'Profile'],
                ['plan', 'Plan'],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setPlotView(id)}
                className={`instrument-btn flex-1 ${plotView === id ? 'is-active' : ''}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#07080a]">
            <svg viewBox={`0 0 ${PW} ${PH}`} className="block h-auto w-full" role="img" aria-label="Trajectory plot">
              <defs>
                <linearGradient id="tf-path" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#34d399" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
                <radialGradient id="tf-glow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width={PW} height={PH} fill="#07080a" />
              {plot.yTicks.map((t) => (
                <g key={`y-${t}`}>
                  <line
                    x1={PAD.l}
                    x2={PW - PAD.r}
                    y1={plot.yTickPos(t)}
                    y2={plot.yTickPos(t)}
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <text x={PAD.l - 5} y={plot.yTickPos(t) + 3} textAnchor="end" fill="#71717a" fontSize="8">
                    {Math.round(t)}
                  </text>
                </g>
              ))}
              {plot.xTicks.map((t) => (
                <g key={`x-${t}`}>
                  <line
                    y1={PAD.t}
                    y2={PH - PAD.b}
                    x1={plot.xTickPos(t)}
                    x2={plot.xTickPos(t)}
                    stroke="rgba(255,255,255,0.04)"
                  />
                  <text x={plot.xTickPos(t)} y={PH - 7} textAnchor="middle" fill="#71717a" fontSize="8">
                    {Math.round(t)}
                  </text>
                </g>
              ))}
              <path d={pathOf(plan)} fill="none" stroke="#3f3f46" strokeWidth="1.4" strokeDasharray="4 3" />
              <path d={pathOf(livePts)} fill="none" stroke="url(#tf-path)" strokeWidth="2" />
              {surveys.map((s) => (
                <circle key={s.md} cx={plot.xOf(s)} cy={plot.yOf(s)} r="2" fill="#a1a1aa" />
              ))}
              <circle cx={plot.xOf(bit)} cy={plot.yOf(bit)} r="9" fill="url(#tf-glow)" />
              <circle cx={plot.xOf(bit)} cy={plot.yOf(bit)} r="2.6" fill="#fafafa" />
              <text x={PAD.l} y={10} fill="#52525b" fontSize="8">
                {plot.yLabel}
              </text>
              <text x={PW - PAD.r} y={PH - 7} textAnchor="end" fill="#52525b" fontSize="8">
                {plot.xLabel}
              </text>
            </svg>
          </div>

          <div className="grid grid-cols-4 gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-zinc-300">
            <span>MD {bit.md.toFixed(0)}</span>
            <span>Inc {contInc.toFixed(1)}°</span>
            <span>Azi {contAzi.toFixed(1)}°</span>
            <span>TVD {bit.tvd.toFixed(0)}</span>
            <span className={bit.dls > level.dlsLimit ? 'text-amber-400' : ''}>DLS {bit.dls.toFixed(1)}</span>
            <span className={gtfUnreliable ? 'text-amber-400' : ''}>
              {tfRefMode === 'gtf' ? 'GTF' : 'MTF'} {displayTf.toFixed(0)}°
            </span>
            <span>GR {grLive.toFixed(0)}</span>
            <span>Rt {resLive.toFixed(1)}</span>
          </div>

          <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
            <span>
              Δinc {dInc >= 0 ? '+' : ''}
              {dInc.toFixed(1)}° · Δtvd {dTvd >= 0 ? '+' : ''}
              {dTvd.toFixed(0)} · Δazi {dAzi >= 0 ? '+' : ''}
              {dAzi.toFixed(1)}°
            </span>
            <svg viewBox="0 0 72 18" className="h-3.5 w-16 shrink-0" aria-hidden="true">
              <path d={spark(grHist)} fill="none" stroke="#34d399" strokeWidth="1.2" />
            </svg>
          </div>

          <div className="flex items-center gap-3">
            <svg viewBox="-44 -44 88 88" className="h-[6.6rem] w-[6.6rem] shrink-0" role="img" aria-label="Toolface dial">
              <circle r="40" fill="#07080a" stroke="#27272a" />
              <circle r="40" fill="none" stroke={tfRefMode === 'gtf' ? '#34d399' : '#60a5fa'} strokeOpacity="0.18" />
              {(tfRefMode === 'gtf' ? ['HS', 'R', 'LS', 'L'] : ['N', 'E', 'S', 'W']).map((lab, i) => {
                const a = toRad(i * 90 - 90);
                return (
                  <text
                    key={lab}
                    x={Math.cos(a) * 31}
                    y={Math.sin(a) * 31 + 3}
                    textAnchor="middle"
                    fill="#71717a"
                    fontSize="7"
                  >
                    {lab}
                  </text>
                );
              })}
              <line
                x1="0"
                y1="0"
                x2={Math.sin(toRad(cmdTf)) * 28}
                y2={-Math.cos(toRad(cmdTf)) * 28}
                stroke="#f59e0b"
                strokeWidth="1.4"
                strokeDasharray="3 2"
                strokeLinecap="round"
              />
              <line
                x1="0"
                y1="0"
                x2={Math.sin(toRad(displayTf)) * 30}
                y2={-Math.cos(toRad(displayTf)) * 30}
                stroke={tfRefMode === 'gtf' ? '#34d399' : '#60a5fa'}
                strokeWidth="2.4"
                strokeLinecap="round"
              />
              <circle r="2.2" fill="#fafafa" />
            </svg>

            <div className="min-w-0 flex-1 space-y-2">
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
              <div className="flex gap-1">
                {(['gtf', 'mtf'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setTfRefMode(r)}
                    className={`instrument-btn flex-1 uppercase ${tfRefMode === r ? 'is-active' : ''}`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2">
                <span className="label-caps w-8">TF</span>
                <input
                  type="range"
                  min={0}
                  max={359}
                  value={cmdTf}
                  onChange={(e) => setCmdTf(Number(e.target.value))}
                  className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
                />
                <span className="w-8 text-right font-mono text-[11px] text-zinc-300">{cmdTf}°</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="label-caps w-8">WOB</span>
                <input
                  type="range"
                  min={8}
                  max={44}
                  value={wob}
                  onChange={(e) => setWob(Number(e.target.value))}
                  className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
                />
                <span className="w-8 text-right font-mono text-[11px] text-zinc-300">{wob}</span>
              </label>
              <label className="flex items-center gap-2">
                <span className="label-caps w-8">ROP</span>
                <input
                  type="range"
                  min={40}
                  max={220}
                  step={5}
                  value={rop}
                  onChange={(e) => setRop(Number(e.target.value))}
                  className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
                />
                <span className="w-8 text-right font-mono text-[11px] text-zinc-300">{rop}</span>
              </label>
            </div>
          </div>

          {phase === 'station' && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[11px] tabular-nums text-zinc-300">
                <span>Station MD {bit.md.toFixed(0)}</span>
                <span>DLS {bit.dls.toFixed(2)}°/100</span>
                <span>Inc {bit.inc.toFixed(1)} / {targetNow.inc.toFixed(1)}</span>
                <span>TVD {bit.tvd.toFixed(0)} / {targetNow.tvd.toFixed(0)}</span>
                <span>Azi {bit.azi.toFixed(1)} / {targetNow.azi.toFixed(1)}</span>
                <span>
                  {bit.north >= 0 ? `${bit.north.toFixed(0)} N` : `${(-bit.north).toFixed(0)} S`}{' '}
                  {bit.east >= 0 ? `${bit.east.toFixed(0)} E` : `${(-bit.east).toFixed(0)} W`}
                </span>
              </div>
              <button type="button" onClick={() => setPhase('run')} className="instrument-btn is-active w-full">
                Accept station · drill ahead
              </button>
            </div>
          )}

          {phase === 'run' && (
            <button
              type="button"
              onClick={() => {
                setSurveys((s) => (s[s.length - 1]?.md === bit.md ? s : [...s, bit]));
                nextSurvey.current = bit.md + level.surveyEvery;
                setPhase('station');
              }}
              className="instrument-btn w-full"
            >
              <Pause size={12} /> Hold for survey
            </button>
          )}

          <p className="text-[12px] leading-relaxed text-zinc-400">{coach}</p>
        </>
      )}

      {phase === 'debrief' && (
        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-zinc-50">
            Score {sc.total}
            <span className="text-zinc-500"> / 100</span>
          </p>
          {rubric.map((row) => (
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
          <div className="space-y-1.5 pt-1">
            {debriefNotes.map((n) => (
              <p key={n} className="text-[12px] leading-relaxed text-zinc-400">
                {n}
              </p>
            ))}
          </div>
          <div className="overflow-x-auto pt-1">
            <table className="w-full text-left font-mono text-[10px] tabular-nums text-zinc-400">
              <thead>
                <tr className="text-zinc-600">
                  <th className="pb-1 font-medium">MD</th>
                  <th className="pb-1 font-medium">Inc</th>
                  <th className="pb-1 font-medium">Azi</th>
                  <th className="pb-1 font-medium">TVD</th>
                  <th className="pb-1 font-medium">DLS</th>
                </tr>
              </thead>
              <tbody>
                {surveys.slice(-8).map((s) => (
                  <tr key={s.md}>
                    <td className="py-0.5">{s.md.toFixed(0)}</td>
                    <td>{s.inc.toFixed(1)}</td>
                    <td>{s.azi.toFixed(1)}</td>
                    <td>{s.tvd.toFixed(0)}</td>
                    <td>{s.dls.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={() => setPhase('brief')} className="instrument-btn is-active w-full">
            <Play size={12} /> Next well
          </button>
        </div>
      )}
    </div>
  );
};
