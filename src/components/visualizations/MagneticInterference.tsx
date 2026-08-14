import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'run' | 'debrief';
type TfRef = 'gtf' | 'mtf';
type LevelId = 1 | 2 | 3;
type Qc = 'pass' | 'watch' | 'reject';

interface Measure {
  btot: number;
  dip: number;
  gtot: number;
  dB: number;
  dDip: number;
  dG: number;
  dAzi: number;
  aziMeas: number;
  mtf: number;
}

interface Station {
  md: number;
  inc: number;
  aziTrue: number;
  m: Measure;
  qc: Qc;
  call: 'accept' | 'reject' | 'sent';
}

interface Level {
  id: LevelId;
  well: string;
  name: string;
  brief: string;
  startMd: number;
  endMd: number;
  surveyEvery: number;
  startInc: number;
  endInc: number;
  azi: number;
  startNmdc: number;
  startRef: TfRef;
  shoeMd: number;
  shoeAxial: number;
  shoeCross: number;
  motorAxial: number;
  stabCross: number;
  offsetMd: number;
  offsetAmp: number;
}

const B_REF = 52140;
const DIP_REF = 66.4;
const G_REF = 1;
const B_WATCH = 200;
const B_FAIL = 400;
const DIP_WATCH = 0.3;
const DIP_FAIL = 0.6;
const G_WATCH = 0.005;
const G_FAIL = 0.008;
const STRIP_N = 56;

const LEVELS: Level[] = [
  {
    id: 1,
    well: 'Mustang 14-23H',
    name: 'Out of shoe',
    brief: 'Just drilled out. Casing is still blinding the magnetometers. Inc is 3°. Reject trash, wait for the field, switch to GTF once you have tilt.',
    startMd: 1190,
    endMd: 1460,
    surveyEvery: 30,
    startInc: 3.2,
    endInc: 8.4,
    azi: 90,
    startNmdc: 18,
    startRef: 'mtf',
    shoeMd: 1184,
    shoeAxial: 2400,
    shoeCross: 220,
    motorAxial: 280,
    stabCross: 40,
    offsetMd: 0,
    offsetAmp: 0,
  },
  {
    id: 2,
    well: 'Mustang 14-23H',
    name: 'Short NMDC',
    brief: 'Curve at 40°. Motor is magnetized and you only have 12 ft of non-mag. Axial bias hides in Btot at this inc. Do not send that azimuth.',
    startMd: 1680,
    endMd: 1960,
    surveyEvery: 90,
    startInc: 38,
    endInc: 54,
    azi: 92,
    startNmdc: 12,
    startRef: 'gtf',
    shoeMd: 0,
    shoeAxial: 0,
    shoeCross: 0,
    motorAxial: 1600,
    stabCross: 90,
    offsetMd: 0,
    offsetAmp: 0,
  },
  {
    id: 3,
    well: 'Cedar Camp 9-4H',
    name: 'Offset casing',
    brief: 'Lateral. Offset well at 2,210 ft. Cross-axial hotspot will walk Btot and spin MTF as you rotate. GTF stays honest. Reject through the zone.',
    startMd: 2040,
    endMd: 2380,
    surveyEvery: 60,
    startInc: 88.2,
    endInc: 89.4,
    azi: 128,
    startNmdc: 30,
    startRef: 'mtf',
    shoeMd: 0,
    shoeAxial: 0,
    shoeCross: 0,
    motorAxial: 220,
    stabCross: 50,
    offsetMd: 2210,
    offsetAmp: 520,
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

function interference(level: Level, md: number, nmdc: number, tf: number) {
  const axMul = Math.exp(-(Math.max(0, nmdc - 8)) / 16);
  const crMul = Math.exp(-(Math.max(0, nmdc - 8)) / 12);
  let axial = level.motorAxial * axMul;
  let cross = level.stabCross * crMul;
  if (level.shoeAxial > 0) {
    const d = Math.max(0, md - level.shoeMd);
    axial += level.shoeAxial * Math.exp(-d / 72);
    cross += level.shoeCross * Math.exp(-d / 64);
  }
  if (level.offsetAmp > 0) {
    const x = (md - level.offsetMd) / 42;
    cross += level.offsetAmp * Math.exp(-x * x);
  }
  return {
    axial,
    crossX: cross * Math.cos(toRad(tf)),
    crossY: cross * Math.sin(toRad(tf)),
    cross,
  };
}

function field(inc: number, azi: number, bAxial: number, bCrossX: number, bCrossY: number, gNoise: number): Measure {
  const I = toRad(inc);
  const A = toRad(azi);
  const dip = toRad(DIP_REF);
  const Bn = B_REF * Math.cos(dip);
  const Bd = B_REF * Math.sin(dip);

  let Bx = Bn * Math.cos(I) * Math.cos(A) - Bd * Math.sin(I);
  let By = -Bn * Math.sin(A);
  let Bz = Bn * Math.sin(I) * Math.cos(A) + Bd * Math.cos(I);

  Bz += bAxial;
  Bx += bCrossX;
  By += bCrossY;

  const btot = Math.hypot(Bx, By, Bz);
  const Gx = Math.sin(I);
  const Gz = Math.cos(I);
  const gtot = clamp(G_REF + gNoise, 0.97, 1.03);
  const aziMeas = wrap360(toDeg(Math.atan2(-By, Bx * Gz + Bz * Gx)));
  const cosMagInc = clamp((Gx * Bx + Gz * Bz) / Math.max(1e-6, gtot * btot), -1, 1);
  const dipMeas = 90 - toDeg(Math.acos(cosMagInc));
  const mtf = wrap360(toDeg(Math.atan2(-By, Bx)));

  return {
    btot,
    dip: dipMeas,
    gtot,
    dB: btot - B_REF,
    dDip: dipMeas - DIP_REF,
    dG: gtot - G_REF,
    dAzi: angDiff(aziMeas, azi),
    aziMeas,
    mtf,
  };
}

function grade(m: Measure): Qc {
  if (Math.abs(m.dB) > B_FAIL || Math.abs(m.dDip) > DIP_FAIL || Math.abs(m.dG) > G_FAIL) return 'reject';
  if (Math.abs(m.dB) > B_WATCH || Math.abs(m.dDip) > DIP_WATCH || Math.abs(m.dG) > G_WATCH) return 'watch';
  return 'pass';
}

function shouldReject(qc: Qc) {
  return qc === 'reject';
}

function scoreRun(stations: Station[], usedGtfHigh: boolean, usedMtfLow: boolean, nmdc: number, level: Level) {
  let qcPts = 0;
  let qcMax = 0;
  let sentBad = 0;
  let dAziAcc = 0;
  let sent = 0;
  for (const s of stations) {
    qcMax += 6;
    const dumped = s.call === 'reject';
    const bad = shouldReject(s.qc);
    if (dumped === bad) qcPts += 6;
    else if (s.qc === 'watch') qcPts += 3;
    if (!dumped) {
      sent += 1;
      dAziAcc += Math.abs(s.m.dAzi);
      if (bad) sentBad += 1;
    }
  }
  qcPts = clamp(qcPts, 0, 30);
  const aziPts = sent === 0 ? 0 : clamp(25 - (dAziAcc / sent) * 4.5, 0, 25);
  const refPts = (usedGtfHigh ? 10 : 0) + (usedMtfLow ? 5 : 0);
  const spacePts = nmdc > level.startNmdc + 8 ? 15 : nmdc > level.startNmdc ? 8 : 0;
  const processPts = sentBad === 0 ? 15 : sentBad === 1 ? 6 : 0;
  const total = Math.round(Math.min(30, qcPts) + aziPts + refPts + spacePts + processPts);
  return { qcPts: Math.min(30, qcPts), aziPts, refPts, spacePts, processPts, total, sent, sentBad, qcMax };
}

function notesFor(level: Level, stations: Station[], nmdc: number, usedGtfHigh: boolean): string[] {
  const out: string[] = [];
  const sent = stations.filter((s) => s.call !== 'reject');
  const badSent = sent.filter((s) => shouldReject(s.qc));
  const meanAzi = sent.length ? sent.reduce((a, s) => a + Math.abs(s.m.dAzi), 0) / sent.length : 0;
  if (badSent.length) {
    out.push(
      `You sent ${badSent.length} reject-band station${badSent.length === 1 ? '' : 's'}. Btot/dip were outside ±${B_FAIL} nT / ±${DIP_FAIL}°. That azimuth is fiction.`
    );
  }
  if (meanAzi > 2) {
    out.push(
      `Mean |azi error| on sent stations ${meanAzi.toFixed(1)}°. Axial steel rotates azimuth at this inc. Stretch NMDC or hold the line on GTF.`
    );
  }
  if (level.offsetAmp > 0 && !usedGtfHigh) {
    out.push('Offset casing spun MTF. GTF is immune. You steered on a magnetic face in a hotspot.');
  }
  if (level.motorAxial > 800 && nmdc <= level.startNmdc) {
    out.push(
      `NMDC still ${nmdc} ft. Motor axial at this spacing is still in the sensors. Spacing charts exist so you do not invent azi.`
    );
  }
  if (level.shoeAxial > 0) {
    const last = stations[stations.length - 1];
    if (last && Math.abs(last.m.dB) < B_WATCH) {
      out.push('Field recovered as you left the shoe. That decay is casing, not a bad magnetometer.');
    }
  }
  if (!out.length) {
    out.push(
      `QC holds. ${sent.length} station${sent.length === 1 ? '' : 's'} sent, mean |dAzi| ${meanAzi.toFixed(1)}°, NMDC ${nmdc} ft.`
    );
  }
  return out;
}

function spark(values: number[], lo: number, hi: number, w = 160, h = 28) {
  if (values.length < 2) return '';
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - 2 - ((clamp(v, lo, hi) - lo) / Math.max(1e-6, hi - lo)) * (h - 4);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export const MagneticInterference: React.FC = () => {
  const first = LEVELS[0];
  const [levelId, setLevelId] = useState<LevelId>(1);
  const level = LEVELS[levelId - 1];
  const [phase, setPhase] = useState<Phase>('run');
  const [playing, setPlaying] = useState(true);
  const [tfRef, setTfRef] = useState<TfRef>(first.startRef);
  const [nmdc, setNmdc] = useState(first.startNmdc);
  const [md, setMd] = useState(first.startMd);
  const [inc, setInc] = useState(first.startInc);
  const [tf, setTf] = useState(0);
  const [live, setLive] = useState<Measure>(() => field(first.startInc, first.azi, 400, 80, 0, 0));
  const [stations, setStations] = useState<Station[]>([]);
  const [pending, setPending] = useState<Station | null>(null);
  const [stationFlash, setStationFlash] = useState(false);
  const [usedGtfHigh, setUsedGtfHigh] = useState(false);
  const [usedMtfLow, setUsedMtfLow] = useState(false);
  const [bHist, setBHist] = useState<number[]>([B_REF]);
  const [dipHist, setDipHist] = useState<number[]>([DIP_REF]);

  const nmdcR = useRef(nmdc);
  const tfRefR = useRef(tfRef);
  const mdR = useRef(md);
  const incR = useRef(inc);
  const tfR = useRef(0);
  const nextSurvey = useRef(first.startMd + first.surveyEvery);
  const pendingR = useRef<Station | null>(null);
  const flashTimer = useRef(0);

  nmdcR.current = nmdc;
  tfRefR.current = tfRef;
  mdR.current = md;
  incR.current = inc;
  tfR.current = tf;
  pendingR.current = pending;

  const loadWell = (id: LevelId, autoplay: boolean) => {
    const lvl = LEVELS[id - 1];
    const inter = interference(lvl, lvl.startMd, lvl.startNmdc, 0);
    const m = field(lvl.startInc, lvl.azi, inter.axial, inter.crossX, inter.crossY, 0);
    setLevelId(id);
    setPhase('run');
    setPlaying(autoplay);
    setTfRef(lvl.startRef);
    setNmdc(lvl.startNmdc);
    setMd(lvl.startMd);
    setInc(lvl.startInc);
    setTf(0);
    setLive(m);
    setStations([]);
    setPending(null);
    setStationFlash(false);
    setUsedGtfHigh(false);
    setUsedMtfLow(false);
    setBHist([m.btot]);
    setDipHist([m.dip]);
    mdR.current = lvl.startMd;
    incR.current = lvl.startInc;
    tfR.current = 0;
    nextSurvey.current = lvl.startMd + lvl.surveyEvery;
    pendingR.current = null;
  };

  const closePending = (call: Station['call']) => {
    const row = pendingR.current;
    if (!row) return;
    const closed = { ...row, call };
    setStations((s) => [...s, closed]);
    setPending(null);
    pendingR.current = null;
  };

  useEffect(() => {
    if (phase !== 'run' || !playing) return;
    const id = window.setInterval(() => {
      const lvl = LEVELS[levelId - 1];
      const span = Math.max(1, lvl.endMd - lvl.startMd);
      const dmd = 1.15;
      const nextMd = mdR.current + dmd;
      const t = clamp((nextMd - lvl.startMd) / span, 0, 1);
      const nextInc = lvl.startInc + t * (lvl.endInc - lvl.startInc);
      const nextTf = wrap360(tfR.current + 11);
      const inter = interference(lvl, nextMd, nmdcR.current, nextTf);
      const gNoise = (Math.random() - 0.5) * 0.003;
      const m = field(nextInc, lvl.azi, inter.axial, inter.crossX, inter.crossY, gNoise);

      mdR.current = nextMd;
      incR.current = nextInc;
      tfR.current = nextTf;
      setMd(nextMd);
      setInc(nextInc);
      setTf(nextTf);
      setLive(m);
      setBHist((h) => [...h.slice(-(STRIP_N - 1)), m.btot]);
      setDipHist((h) => [...h.slice(-(STRIP_N - 1)), m.dip]);

      if (tfRefR.current === 'gtf' && nextInc > 8) setUsedGtfHigh(true);
      if (tfRefR.current === 'mtf' && nextInc < 5) setUsedMtfLow(true);

      if (nextMd >= nextSurvey.current && nextMd < lvl.endMd) {
        nextSurvey.current += lvl.surveyEvery;
        if (pendingR.current) closePending('sent');
        const qc = grade(m);
        const row: Station = {
          md: nextMd,
          inc: nextInc,
          aziTrue: lvl.azi,
          m,
          qc,
          call: 'sent',
        };
        pendingR.current = row;
        setPending(row);
        setStationFlash(true);
        window.clearTimeout(flashTimer.current);
        flashTimer.current = window.setTimeout(() => setStationFlash(false), 2400);
      }

      if (nextMd >= lvl.endMd) {
        if (pendingR.current) closePending('sent');
        setPlaying(false);
        setPhase('debrief');
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, levelId, playing]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const qc = grade(live);
  const sc = useMemo(
    () => scoreRun(stations, usedGtfHigh, usedMtfLow, nmdc, level),
    [stations, usedGtfHigh, usedMtfLow, nmdc, level]
  );
  const debriefNotes = useMemo(
    () => notesFor(level, stations, nmdc, usedGtfHigh),
    [level, stations, nmdc, usedGtfHigh]
  );

  const scale = 38 / B_REF;
  const trueX = B_REF * Math.cos(toRad(DIP_REF)) * scale;
  const trueY = -(B_REF * Math.sin(toRad(DIP_REF))) * scale;
  const interNow = interference(level, md, nmdc, tf);
  const measX = trueX + interNow.crossX * scale * 0.085;
  const measY = trueY - interNow.axial * scale * 0.028;
  const displayTf = tfRef === 'gtf' ? 0 : live.mtf;
  const mdSpan = Math.max(1, level.endMd - level.startMd);
  const mdPct = clamp(((md - level.startMd) / mdSpan) * 100, 0, 100);

  const chip =
    phase === 'debrief'
      ? sc.total >= 75
        ? { label: 'Send', cls: 'text-emerald-400', bar: '#34d399' }
        : { label: 'Miss', cls: 'text-amber-400', bar: '#f59e0b' }
      : stationFlash
        ? {
            label: qc === 'reject' ? 'Reject band' : qc === 'watch' ? 'Watch' : 'Station',
            cls: qc === 'reject' ? 'text-red-400' : qc === 'watch' ? 'text-amber-400' : 'text-emerald-400',
            bar: qc === 'reject' ? '#ef4444' : qc === 'watch' ? '#f59e0b' : '#34d399',
          }
        : !playing
          ? { label: 'Paused', cls: 'text-zinc-300', bar: '#a1a1aa' }
          : qc === 'reject'
            ? { label: 'Reject', cls: 'text-red-400', bar: '#ef4444' }
            : qc === 'watch'
              ? { label: 'Watch', cls: 'text-amber-400', bar: '#f59e0b' }
              : { label: 'Pass', cls: 'text-emerald-400', bar: '#34d399' };

  const coach = (() => {
    if (phase === 'debrief') return debriefNotes[0];
    if (inc < 5 && tfRef === 'gtf') return 'Inc is under 5°. Gravity toolface is poorly defined. Stay on MTF until the hole tilts.';
    if (inc > 8 && tfRef === 'mtf' && Math.abs(live.dB) > B_WATCH) {
      return 'You have tilt and the field is dirty. Switch to GTF. Magnetic face is the interference.';
    }
    if (level.offsetAmp > 0 && Math.abs(md - level.offsetMd) < 70) {
      return `Offset casing at ${level.offsetMd} ft. Btot walking ${live.dB >= 0 ? '+' : ''}${live.dB.toFixed(0)} nT as you rotate. That is cross-axial.`;
    }
    if (level.shoeAxial > 0 && md - level.shoeMd < 140) {
      return `Still in the shoe interference zone. ΔB ${live.dB >= 0 ? '+' : ''}${live.dB.toFixed(0)} nT. Reject and drill ahead — it will decay.`;
    }
    if (interNow.axial > 500 && Math.abs(live.dB) < B_WATCH) {
      return `Axial ${interNow.axial.toFixed(0)} nT with Btot still near reference. High-inc axial hides in Btot and rotates azi ${live.dAzi >= 0 ? '+' : ''}${live.dAzi.toFixed(1)}°. Stretch the NMDC.`;
    }
    if (qc === 'pass') return 'Clean field. Btot and dip sit on the IGRF. Keep this station.';
    return `Watch band. ΔB ${live.dB >= 0 ? '+' : ''}${live.dB.toFixed(0)} nT · Δdip ${live.dDip >= 0 ? '+' : ''}${live.dDip.toFixed(2)}°. Rotate and retake, or reject.`;
  })();

  const qcColor = (q: Qc) => (q === 'reject' ? 'text-red-400' : q === 'watch' ? 'text-amber-400' : 'text-emerald-400');

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps text-zinc-500">Sim lab</p>
          <h3 className="instrument-title mt-1">Magnetic Interference</h3>
          <p className="mt-1 text-[12px] leading-relaxed text-zinc-400">{level.brief}</p>
        </div>
        <span className={`instrument-chip shrink-0 ${chip.cls}`}>
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

      <div className="overflow-hidden rounded-xl border border-white/10 bg-[#07080a] p-2">
        <div className="flex gap-2">
          <svg viewBox="-48 -46 96 92" className="h-[7.1rem] w-[7.1rem] shrink-0" role="img" aria-label="Earth vs measured field">
            <circle r="42" fill="none" stroke="#27272a" />
            <line x1="-42" x2="42" y1="0" y2="0" stroke="#27272a" />
            <line x1="0" x2="0" y1="-42" y2="42" stroke="#27272a" />
            <line x1="0" y1="0" x2={trueX} y2={trueY} stroke="#10b981" strokeWidth="2.2" />
            <line x1="0" y1="0" x2={measX} y2={measY} stroke="#ef4444" strokeWidth="2.2" />
            <line
              x1="0"
              y1="0"
              x2={Math.sin(toRad(displayTf)) * 16}
              y2={-Math.cos(toRad(displayTf)) * 16}
              stroke={tfRef === 'gtf' ? '#34d399' : '#60a5fa'}
              strokeWidth="1.4"
            />
            <text x="0" y="-34" textAnchor="middle" fill="#71717a" fontSize="7">
              vertical
            </text>
          </svg>
          <div className="min-w-0 flex-1 space-y-1 pt-0.5">
            <p className="label-caps text-zinc-600">Btot vs MD</p>
            <svg viewBox="0 0 160 28" className="h-7 w-full" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" x2="160" y1="14" y2="14" stroke="rgba(255,255,255,0.06)" />
              <path d={spark(bHist, B_REF - 800, B_REF + 800)} fill="none" stroke="#34d399" strokeWidth="1.4" />
            </svg>
            <p className="label-caps text-zinc-600">Dip vs MD</p>
            <svg viewBox="0 0 160 28" className="h-7 w-full" preserveAspectRatio="none" aria-hidden="true">
              <line x1="0" x2="160" y1="14" y2="14" stroke="rgba(255,255,255,0.06)" />
              <path d={spark(dipHist, DIP_REF - 2, DIP_REF + 2)} fill="none" stroke="#60a5fa" strokeWidth="1.4" />
            </svg>
            <div className="flex gap-3 text-[10px] text-zinc-500">
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 bg-emerald-500" /> Earth
              </span>
              <span className="flex items-center gap-1">
                <span className="h-1.5 w-3 bg-red-500" /> Measured
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-emerald-500/80" style={{ width: `${mdPct}%` }} />
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-1 font-mono text-[11px] tabular-nums text-zinc-300">
        <span>MD {md.toFixed(0)}</span>
        <span>Inc {inc.toFixed(1)}°</span>
        <span className={Math.abs(live.dAzi) > 1.5 ? 'text-amber-400' : ''}>
          Azi {live.aziMeas.toFixed(1)}°
        </span>
        <span className={qcColor(qc)}>
          Δazi {live.dAzi >= 0 ? '+' : ''}
          {live.dAzi.toFixed(1)}°
        </span>
        <span className={Math.abs(live.dB) > B_WATCH ? 'text-amber-400' : ''}>
          B {Math.round(live.btot)}
        </span>
        <span>
          ΔB {live.dB >= 0 ? '+' : ''}
          {live.dB.toFixed(0)}
        </span>
        <span className={Math.abs(live.dDip) > DIP_WATCH ? 'text-amber-400' : ''}>
          Dip {live.dip.toFixed(2)}°
        </span>
        <span>
          G {live.gtot.toFixed(3)}
        </span>
      </div>

      <div className="flex gap-1">
        {(['gtf', 'mtf'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setTfRef(r)}
            className={`instrument-btn flex-1 uppercase ${tfRef === r ? 'is-active' : ''}`}
          >
            {r}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-2">
        <span className="label-caps w-10">NMDC</span>
        <input
          type="range"
          min={8}
          max={60}
          value={nmdc}
          onChange={(e) => setNmdc(Number(e.target.value))}
          className="h-1.5 flex-1 appearance-none rounded-lg bg-zinc-800 accent-emerald-500"
        />
        <span className="w-10 text-right font-mono text-[11px] text-zinc-300">{nmdc} ft</span>
      </label>

      <div className="flex gap-1">
        <button
          type="button"
          disabled={!pending || phase !== 'run'}
          onClick={() => closePending('accept')}
          className={`instrument-btn flex-1 ${pending && qc !== 'reject' ? 'is-active' : ''}`}
        >
          Keep
        </button>
        <button
          type="button"
          disabled={!pending || phase !== 'run'}
          onClick={() => closePending('reject')}
          className={`instrument-btn flex-1 ${pending && qc === 'reject' ? 'is-active' : ''}`}
        >
          Reject
        </button>
        <button
          type="button"
          onClick={() => (phase === 'debrief' ? loadWell(levelId, true) : setPlaying((p) => !p))}
          className="instrument-btn flex-1"
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
        <button type="button" onClick={() => loadWell(levelId, true)} className="instrument-btn" aria-label="Reset stand">
          <RotateCcw size={12} />
        </button>
      </div>

      {pending && (
        <p className={`font-mono text-[11px] tabular-nums ${qcColor(pending.qc)}`}>
          Station {pending.md.toFixed(0)} · {pending.qc.toUpperCase()} · ΔB {pending.m.dB >= 0 ? '+' : ''}
          {pending.m.dB.toFixed(0)} · Δdip {pending.m.dDip >= 0 ? '+' : ''}
          {pending.m.dDip.toFixed(2)}° · Keep or reject
        </p>
      )}

      <p className="text-[12px] leading-relaxed text-zinc-400">{coach}</p>

      {phase === 'debrief' && (
        <div className="space-y-2">
          <p className="text-[15px] font-semibold text-zinc-50">
            Score {sc.total}
            <span className="text-zinc-500"> / 100</span>
          </p>
          {[
            { l: 'Keep / reject calls', v: `${stations.filter((s) => (s.call === 'reject') === shouldReject(s.qc)).length}/${stations.length}`, p: sc.qcPts, max: 30 },
            { l: 'Sent |dAzi|', v: `${sc.sent ? (stations.filter((s) => s.call !== 'reject').reduce((a, s) => a + Math.abs(s.m.dAzi), 0) / Math.max(1, sc.sent)).toFixed(1) : '—'}°`, p: sc.aziPts, max: 25 },
            { l: 'GTF / MTF use', v: usedGtfHigh && usedMtfLow ? 'Correct refs' : 'Ref miss', p: sc.refPts, max: 15 },
            { l: 'NMDC spacing', v: `${nmdc} ft`, p: sc.spacePts, max: 15 },
            { l: 'No reject sent', v: sc.sentBad === 0 ? 'Clean sheet' : `${sc.sentBad} sent`, p: sc.processPts, max: 15 },
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
