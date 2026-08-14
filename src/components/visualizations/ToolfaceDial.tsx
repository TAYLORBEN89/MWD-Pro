import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'run' | 'debrief';
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
  start: Station;
  planEnd: { md: number; inc: number; azi: number; tvd: number };
  yield: number;
  surveyEvery: number;
  lag: number;
  walk: number;
  tfNoise: number;
  planAzi: number;
  dlsLimit: number;
  startGtf: number;
}

const LEVELS: Level[] = [
  {
    id: 1,
    well: 'Mustang 14-23H',
    name: 'KOP build',
    brief: 'Land 45° at 1,700 ft MD. High-side slide. Surveys every 90 ft.',
    start: { md: 1210, inc: 5, azi: 90, tvd: 1206, north: 0, east: 18, vs: 18, dls: 0, mode: 'slide' },
    planEnd: { md: 1700, inc: 45, azi: 90, tvd: 1578 },
    yield: 8,
    surveyEvery: 90,
    lag: 0.14,
    walk: 0.4,
    tfNoise: 1.1,
    planAzi: 90,
    dlsLimit: 10,
    startGtf: 0,
  },
  {
    id: 2,
    well: 'Mustang 14-23H',
    name: 'Hold + turn',
    brief: 'Hold 42°. Walk azi to 130° by 2,200 ft. Sand walks right on rotate.',
    start: { md: 1780, inc: 42, azi: 90, tvd: 1624, north: 12, east: 210, vs: 210, dls: 3.1, mode: 'rotate' },
    planEnd: { md: 2200, inc: 42, azi: 130, tvd: 1936 },
    yield: 7.5,
    surveyEvery: 90,
    lag: 0.1,
    walk: 1.8,
    tfNoise: 2,
    planAzi: 110,
    dlsLimit: 10,
    startGtf: 0,
  },
  {
    id: 3,
    well: 'Cedar Camp 9-4H',
    name: 'Recovery',
    brief: '6° under plan, 18° of TF lag, 120 ft surveys. Do not bury DLS.',
    start: { md: 1400, inc: 12, azi: 88, tvd: 1384, north: -4, east: 62, vs: 61, dls: 4.4, mode: 'slide' },
    planEnd: { md: 1880, inc: 50, azi: 90, tvd: 1710 },
    yield: 8.2,
    surveyEvery: 120,
    lag: 0.055,
    walk: 2.4,
    tfNoise: 3.2,
    planAzi: 90,
    dlsLimit: 12,
    startGtf: 342,
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
function hsCommand(ref: TfRef, azi: number) {
  return ref === 'gtf' ? 0 : wrap360(azi);
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
      `Stuck-pipe event at ${last.md.toFixed(0)} ft MD. Long slide + high WOB packed cuttings.`
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
      `TVD ${last.tvd.toFixed(0)} vs plan ${target.tvd.toFixed(0)} (${dTvd >= 0 ? '+' : ''}${dTvd.toFixed(0)} ft).`
    );
  }
  if (Math.abs(dAzi) > 4) {
    out.push(
      `Azimuth ${dAzi >= 0 ? '+' : ''}${dAzi.toFixed(1)}° off plan ${target.azi.toFixed(1)}°. Right is ~90° GTF.`
    );
  }
  if (peakDls > level.dlsLimit) {
    out.push(`Peak DLS ${peakDls.toFixed(1)}°/100 ft exceeds the ${level.dlsLimit}°/100 ft limit.`);
  }
  if (tfMeanErr > 22) {
    out.push(`Mean |toolface error| ${tfMeanErr.toFixed(0)}°. Lead right for reactive torque.`);
  }
  if (!out.length) {
    out.push(
      `Curve is sendable. Last station MD ${last.md.toFixed(0)}, DLS ${last.dls.toFixed(2)}°/100 ft.`
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

function pointerTf(el: SVGSVGElement, clientX: number, clientY: number) {
  const r = el.getBoundingClientRect();
  const x = clientX - (r.left + r.width / 2);
  const y = clientY - (r.top + r.height / 2);
  return wrap360(toDeg(Math.atan2(x, -y)));
}

export const ToolfaceDial: React.FC = () => {
  const first = LEVELS[0];
  const firstRef: TfRef = first.start.inc < 7 ? 'mtf' : 'gtf';
  const [levelId, setLevelId] = useState<LevelId>(1);
  const level = LEVELS[levelId - 1];
  const [phase, setPhase] = useState<Phase>('run');
  const [playing, setPlaying] = useState(true);
  const [mode, setMode] = useState<Mode>(first.start.mode);
  const [tfRefMode, setTfRefMode] = useState<TfRef>(firstRef);
  const [cmdTf, setCmdTf] = useState(hsCommand(firstRef, first.start.azi));
  const [wob, setWob] = useState(24);
  const [rop, setRop] = useState(120);
  const [bit, setBit] = useState<Station>(first.start);
  const [surveys, setSurveys] = useState<Station[]>([first.start]);
  const [peakDls, setPeakDls] = useState(0);
  const [tfErrAcc, setTfErrAcc] = useState(0);
  const [tfErrN, setTfErrN] = useState(0);
  const [gtfOk, setGtfOk] = useState(false);
  const [mtfOk, setMtfOk] = useState(true);
  const [gtfLowHits, setGtfLowHits] = useState(0);
  const [stuck, setStuck] = useState(false);
  const [stuckRisk, setStuckRisk] = useState(0);
  const [slideFt, setSlideFt] = useState(0);
  const [grHist, setGrHist] = useState<number[]>([lithAt(first.start.tvd).gr]);
  const [grLive, setGrLive] = useState(lithAt(first.start.tvd).gr);
  const [resLive, setResLive] = useState(lithAt(first.start.tvd).res);
  const [contInc, setContInc] = useState(first.start.inc);
  const [contAzi, setContAzi] = useState(first.start.azi);
  const [plotView, setPlotView] = useState<PlotView>('profile');
  const [actualTf, setActualTf] = useState(first.startGtf);
  const [stationFlash, setStationFlash] = useState(false);

  const actualTfR = useRef(first.startGtf);
  const cmdR = useRef(cmdTf);
  const modeR = useRef<Mode>(first.start.mode);
  const refR = useRef<TfRef>(firstRef);
  const wobR = useRef(24);
  const ropR = useRef(120);
  const bitR = useRef(bit);
  const nextSurvey = useRef(first.start.md + first.surveyEvery);
  const slideFtR = useRef(0);
  const stuckR = useRef(0);
  const dialRef = useRef<SVGSVGElement>(null);
  const dragR = useRef(false);
  const flashTimer = useRef(0);

  cmdR.current = cmdTf;
  modeR.current = mode;
  refR.current = tfRefMode;
  wobR.current = wob;
  ropR.current = rop;
  bitR.current = bit;

  const plan = useMemo(() => buildPlan(level), [level]);
  const targetNow = planAt(plan, bit.md);

  const loadWell = (id: LevelId, autoplay: boolean) => {
    const lvl = LEVELS[id - 1];
    const nextRef: TfRef = lvl.start.inc < 7 ? 'mtf' : 'gtf';
    setLevelId(id);
    setPhase('run');
    setPlaying(autoplay);
    setMode(lvl.start.mode);
    setTfRefMode(nextRef);
    setCmdTf(hsCommand(nextRef, lvl.start.azi));
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
    setActualTf(lvl.startGtf);
    setStationFlash(false);
    actualTfR.current = lvl.startGtf;
    nextSurvey.current = lvl.start.md + lvl.surveyEvery;
    slideFtR.current = 0;
    stuckR.current = 0;
  };

  useEffect(() => {
    if (phase !== 'run' || !playing) return;
    const id = window.setInterval(() => {
      const lvl = LEVELS[levelId - 1];
      const prev = bitR.current;
      if (prev.md >= lvl.planEnd.md) {
        setPlaying(false);
        setPhase('debrief');
        return;
      }

      const dmd = 2.1 + (ropR.current / 200) * 3.4;
      const lith = lithAt(prev.tvd);
      const wobNow = wobR.current;
      const sliding = modeR.current === 'slide';
      const yEff = (lvl.yield / 100) * yieldFromWob(wobNow) * lith.yieldMul;
      const cmdGtf = refR.current === 'gtf' ? cmdR.current : wrap360(cmdR.current - prev.azi);

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
        setPlaying(false);
        setPhase('debrief');
        return;
      }

      if (next.md >= nextSurvey.current) {
        nextSurvey.current += lvl.surveyEvery;
        setSurveys((s) => [...s, next]);
        setStationFlash(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setStationFlash(false), 2200);
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, levelId, playing]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const setCmdFromPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const el = dialRef.current;
    if (!el) return;
    setCmdTf(Math.round(pointerTf(el, e.clientX, e.clientY)));
  };

  const onDialDown = (e: React.PointerEvent<SVGSVGElement>) => {
    dragR.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    setCmdFromPointer(e);
  };
  const onDialMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!dragR.current) return;
    setCmdFromPointer(e);
  };
  const onDialUp = (e: React.PointerEvent<SVGSVGElement>) => {
    dragR.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  };

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
  const lastSurvey = surveys[surveys.length - 1];

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

  const chip = stuck
    ? { label: 'Stuck', cls: 'text-[#e24b4a]', bar: '#e24b4a' }
    : phase === 'debrief'
      ? sc.total >= 75
        ? { label: 'Send', cls: 'text-[#3ecf8e]', bar: '#3ecf8e' }
        : { label: 'Miss', cls: 'text-[#d4a017]', bar: '#d4a017' }
      : stationFlash
        ? { label: 'Station', cls: 'text-[#d4a017]', bar: '#d4a017' }
        : !playing
          ? { label: 'Paused', cls: 'text-[#8a9099]', bar: '#8a9099' }
          : stuckRisk > 55
            ? { label: 'Packoff', cls: 'text-[#e24b4a]', bar: '#e24b4a' }
            : bit.dls > level.dlsLimit
              ? { label: 'High DLS', cls: 'text-[#d4a017]', bar: '#d4a017' }
              : {
                  label: mode === 'slide' ? 'Sliding' : 'Rotating',
                  cls: mode === 'slide' ? 'text-[#c47b3a]' : 'text-[#4d8ecf]',
                  bar: mode === 'slide' ? '#c47b3a' : '#4d8ecf',
                };

  const coach = (() => {
    if (phase === 'debrief') return debriefNotes[0];
    if (gtfUnreliable) return 'Inc is under 5°. Gravity toolface is poorly defined. Switch to MTF.';
    if (stuckRisk > 70) return `Cuttings packing up. Slide ${slideFt.toFixed(0)} ft at ${wob} klb. Rotate before this sticks.`;
    if (bit.dls > level.dlsLimit) return `DLS ${bit.dls.toFixed(1)}°/100 ft is over the ${level.dlsLimit}°/100 limit.`;
    if (tfLag > 35 && mode === 'slide') return `Toolface lag ${tfLag.toFixed(0)}°. Drag the dial and lead right for reactive torque.`;
    if (mode === 'rotate') {
      return `Rotating in ${lith.name}. Walk ${(level.walk * lith.walkMul).toFixed(1)}°/100 ft right. Inc sags.`;
    }
    return `Sliding ${actualTf.toFixed(0)}° GTF in ${lith.name}. Yield ${(level.yield * yieldFromWob(wob) * lith.yieldMul).toFixed(1)}°/100 ft. Drag the dial — HS builds, 90° turns right.`;
  })();

  const ticks = tfRefMode === 'gtf' ? ['HS', 'R', 'LS', 'L'] : ['N', 'E', 'S', 'W'];

  const faceColor = tfRefMode === 'gtf' ? '#3ecf8e' : '#4d8ecf';

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Well control</p>
          <h3 className="instrument-title mt-1">Toolface Control</h3>
          <p className="mt-1.5 min-h-[2.75rem] text-[12px] leading-relaxed text-[#8a9099]">{level.brief}</p>
        </div>
        <span className={`hmi-lamp w-[5.6rem] shrink-0 justify-end ${chip.cls}`}>
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
            className={`hmi-key ${levelId === lvl.id ? 'is-on' : ''}`}
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
        <svg viewBox={`0 0 ${PW} ${PH}`} className="block h-auto w-full overflow-hidden" role="img" aria-label="Live wellbore trajectory">
          <rect width={PW} height={PH} fill="#07080a" />
          {plot.yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line
                x1={PAD.l}
                x2={PW - PAD.r}
                y1={plot.yTickPos(t)}
                y2={plot.yTickPos(t)}
                stroke="#1d2026"
              />
              <text x={PAD.l - 5} y={plot.yTickPos(t) + 3} textAnchor="end" fill="#5c636e" fontSize="8">
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
                stroke="#1d2026"
              />
              <text x={plot.xTickPos(t)} y={PH - 7} textAnchor="middle" fill="#5c636e" fontSize="8">
                {Math.round(t)}
              </text>
            </g>
          ))}
          <path d={pathOf(plan)} fill="none" stroke="#2a2d33" strokeWidth="1.2" strokeDasharray="4 3" />
          <path d={pathOf(livePts)} fill="none" stroke="#3ecf8e" strokeWidth="1.45" />
          {surveys.map((s) => (
            <circle key={s.md} cx={plot.xOf(s)} cy={plot.yOf(s)} r="1.8" fill="#8a9099" />
          ))}
          <circle cx={plot.xOf(bit)} cy={plot.yOf(bit)} r="2.4" fill="#e6e8eb" />
          <text x={PAD.l} y={10} fill="#5c636e" fontSize="8">
            {plot.yLabel}
          </text>
          <text x={PW - PAD.r} y={PH - 7} textAnchor="end" fill="#5c636e" fontSize="8">
            {plot.xLabel}
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-1 border-y border-[#1d2026] py-2">
        {[
          { l: 'Inc', v: contInc.toFixed(1), u: '°', warn: Math.abs(dInc) > 3 },
          { l: 'Azi', v: contAzi.toFixed(1), u: '°', warn: Math.abs(dAzi) > 4 },
          { l: 'TVD', v: bit.tvd.toFixed(0), u: 'ft', warn: Math.abs(dTvd) > 12 },
          { l: 'DLS', v: bit.dls.toFixed(1), u: '/100', warn: bit.dls > level.dlsLimit },
        ].map((row) => (
          <div key={row.l}>
            <p className="label-caps">{row.l}</p>
            <p className={`hmi-readout text-[18px] leading-none ${row.warn ? 'text-[#e24b4a]' : 'text-[#e6e8eb]'}`}>
              {row.v}
              <span className="ml-0.5 text-[10px] text-[#5c636e]">{row.u}</span>
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 hmi-readout text-[11px] text-[#8a9099]">
        <span>
          MD {bit.md.toFixed(0)}
          <span className="text-[#5c636e]"> · </span>
          {tfRefMode.toUpperCase()} {displayTf.toFixed(0)}°
          <span className="text-[#5c636e]"> · </span>
          Δinc {dInc >= 0 ? '+' : ''}
          {dInc.toFixed(1)}°
          <span className="text-[#5c636e]"> · </span>
          Δtvd {dTvd >= 0 ? '+' : ''}
          {dTvd.toFixed(0)}
          <span className="text-[#5c636e]"> · </span>
          GR {grLive.toFixed(0)}
        </span>
        <svg viewBox="0 0 72 18" className="h-3.5 w-16 shrink-0 overflow-hidden" aria-hidden="true">
          <path d={spark(grHist)} fill="none" stroke="#3aa8b8" strokeWidth="1.1" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-2">
        <svg
          ref={dialRef}
          viewBox="-48 -48 96 96"
          className="h-44 w-44 shrink-0 touch-none cursor-crosshair select-none overflow-hidden"
          role="slider"
          aria-label="Command toolface"
          aria-valuemin={0}
          aria-valuemax={359}
          aria-valuenow={cmdTf}
          onPointerDown={onDialDown}
          onPointerMove={onDialMove}
          onPointerUp={onDialUp}
          onPointerCancel={onDialUp}
        >
          <circle r="44" fill="#07080a" stroke="#2a2d33" />
          <circle r="44" fill="none" stroke={faceColor} strokeOpacity="0.28" />
          {ticks.map((lab, i) => {
            const a = toRad(i * 90 - 90);
            return (
              <text
                key={lab}
                x={Math.cos(a) * 34}
                y={Math.sin(a) * 34 + 3}
                textAnchor="middle"
                fill="#8a9099"
                fontSize="8"
                className="pointer-events-none"
              >
                {lab}
              </text>
            );
          })}
          <line
            x1="0"
            y1="0"
            x2={Math.sin(toRad(cmdTf)) * 32}
            y2={-Math.cos(toRad(cmdTf)) * 32}
            stroke="#d4a017"
            strokeWidth="1.2"
            strokeDasharray="3 2"
            strokeLinecap="square"
            className="pointer-events-none"
          />
          <line
            x1="0"
            y1="0"
            x2={Math.sin(toRad(displayTf)) * 34}
            y2={-Math.cos(toRad(displayTf)) * 34}
            stroke={faceColor}
            strokeWidth="1.8"
            strokeLinecap="square"
            className="pointer-events-none"
          />
          <circle r="2" fill="#e6e8eb" className="pointer-events-none" />
        </svg>
        <p className="hmi-readout text-[11px] text-[#8a9099]">
          Cmd {cmdTf}°
          <span className="text-[#5c636e]"> · </span>
          {tfRefMode.toUpperCase()} {displayTf.toFixed(0)}°
          <span className="text-[#5c636e]"> · </span>
          {mode === 'slide' ? `lag ${tfLag.toFixed(0)}°` : 'spinning'}
        </p>
      </div>

      <div className="flex gap-1.5">
        {(['slide', 'rotate'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`hmi-key flex-1 ${mode === m ? 'is-on' : ''}`}
            style={
              mode === m
                ? { borderColor: m === 'slide' ? '#c47b3a99' : '#4d8ecf99', color: m === 'slide' ? '#c47b3a' : '#4d8ecf' }
                : undefined
            }
          >
            {m}
          </button>
        ))}
        {(['gtf', 'mtf'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => {
              setTfRefMode(r);
              setCmdTf(r === 'gtf' ? cmdGtf : wrap360(cmdGtf + bit.azi));
            }}
            className={`hmi-key flex-1 ${tfRefMode === r ? 'is-on' : ''}`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="flex gap-1.5">
        {ticks.map((lab, i) => (
          <button
            key={lab}
            type="button"
            onClick={() => setCmdTf(i * 90)}
            className={`hmi-key flex-1 ${cmdTf === i * 90 ? 'is-on' : ''}`}
          >
            {lab}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <span className="label-caps w-8">WOB</span>
        <input
          type="range"
          min={8}
          max={44}
          value={wob}
          onChange={(e) => setWob(Number(e.target.value))}
          className="h-1 flex-1 appearance-none bg-[#1d2026] accent-[#3ecf8e]"
        />
        <span className="hmi-readout w-8 text-right text-[11px] text-[#e6e8eb]">{wob}</span>
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

      <p className={`min-h-[1.15rem] hmi-readout text-[11px] text-[#d4a017] ${stationFlash && lastSurvey ? 'visible' : 'invisible'}`}>
        {lastSurvey
          ? `Station ${lastSurvey.md.toFixed(0)} · Inc ${lastSurvey.inc.toFixed(1)}° / ${targetNow.inc.toFixed(1)}° · TVD ${lastSurvey.tvd.toFixed(0)} / ${targetNow.tvd.toFixed(0)}`
          : 'Station'}
      </p>

      <p className="min-h-[2.75rem] text-[12px] leading-relaxed text-[#8a9099]">{coach}</p>

      {phase === 'debrief' && (
        <div className="space-y-2 border-t border-[#1d2026] pt-3">
          <p className="hmi-readout text-[22px] leading-none text-[#e6e8eb]">
            {sc.total}
            <span className="ml-1 text-[11px] text-[#5c636e]">/ 100</span>
          </p>
          {[
            { l: 'Inc vs plan', v: `${bit.inc.toFixed(1)}° / ${level.planEnd.inc}°`, p: sc.incPts, max: 25 },
            { l: 'TVD vs plan', v: `${bit.tvd.toFixed(0)} / ${level.planEnd.tvd} ft`, p: sc.tvdPts, max: 20 },
            { l: 'Azi vs plan', v: `${bit.azi.toFixed(1)}° / ${level.planEnd.azi}°`, p: sc.aziPts, max: 15 },
            { l: 'Peak DLS', v: `${peakDls.toFixed(1)}°/100 ft`, p: sc.dlsPts, max: 15 },
            { l: 'Slide TF hold', v: `${tfMean.toFixed(0)}° mean |err|`, p: sc.holdPts, max: 10 },
            { l: 'GTF / MTF use', v: gtfGood && mtfOk ? 'Correct refs' : 'Ref miss', p: sc.refPts, max: 10 },
            { l: 'Hole condition', v: stuck ? 'Stuck event' : 'Open hole', p: sc.stuckPts, max: 5 },
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
