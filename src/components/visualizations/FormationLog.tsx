import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';

type Phase = 'run' | 'debrief';
type Lith = 'shale' | 'sand' | 'lime';
type LevelId = 1 | 2 | 3;

interface Bed {
  top: number;
  base: number;
  lith: Lith;
  gr: number;
}

interface Sample {
  md: number;
  gr: number;
  truth: Lith;
}

interface Pick {
  from: number;
  lith: Lith;
}

interface Level {
  id: LevelId;
  well: string;
  name: string;
  brief: string;
  startMd: number;
  endMd: number;
  lag: number;
  beds: Bed[];
}

const LEVELS: Level[] = [
  {
    id: 1,
    well: 'Mustang 14-23H',
    name: 'Read beds',
    brief: 'Near-bit GR, 8 ft lag. Shale is high, sand is low, lime is lower. Call the rock the crystal sees — not the bit.',
    startMd: 9840,
    endMd: 10180,
    lag: 8,
    beds: [
      { top: 9840, base: 9904, lith: 'shale', gr: 126 },
      { top: 9904, base: 9972, lith: 'sand', gr: 31 },
      { top: 9972, base: 10018, lith: 'shale', gr: 118 },
      { top: 10018, base: 10088, lith: 'lime', gr: 16 },
      { top: 10088, base: 10180, lith: 'shale', gr: 138 },
    ],
  },
  {
    id: 2,
    well: 'Mustang 14-23H',
    name: 'Lag trap',
    brief: 'Landing. GR sits 42 ft above the bit. The target sand is 18 ft thick. Call on sensor MD or you will mark the top 40 ft late.',
    startMd: 10120,
    endMd: 10440,
    lag: 42,
    beds: [
      { top: 10120, base: 10210, lith: 'shale', gr: 132 },
      { top: 10210, base: 10228, lith: 'sand', gr: 27 },
      { top: 10228, base: 10305, lith: 'shale', gr: 121 },
      { top: 10305, base: 10370, lith: 'lime', gr: 14 },
      { top: 10370, base: 10440, lith: 'shale', gr: 144 },
    ],
  },
  {
    id: 3,
    well: 'Cedar Camp 9-4H',
    name: 'Dirty sand',
    brief: 'Dirty sand sits at 55 API. A hot-shale spike will jump 180. Neither is lime. Do not chase the spike.',
    startMd: 11240,
    endMd: 11560,
    lag: 28,
    beds: [
      { top: 11240, base: 11300, lith: 'shale', gr: 124 },
      { top: 11300, base: 11308, lith: 'shale', gr: 186 },
      { top: 11308, base: 11370, lith: 'sand', gr: 56 },
      { top: 11370, base: 11420, lith: 'shale', gr: 116 },
      { top: 11420, base: 11485, lith: 'lime', gr: 15 },
      { top: 11485, base: 11560, lith: 'sand', gr: 34 },
    ],
  },
];

const LITH: Record<Lith, { label: string; color: string; window: string }> = {
  shale: { label: 'Shale', color: '#6b7280', window: '> 80 API' },
  sand: { label: 'Sand', color: '#c47b3a', window: '25–70 API' },
  lime: { label: 'Lime', color: '#8a9099', window: '< 25 API' },
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function bedAt(beds: Bed[], md: number) {
  return beds.find((b) => md >= b.top && md < b.base) ?? beds[beds.length - 1];
}

function truthGr(beds: Bed[], md: number) {
  const bed = bedAt(beds, md);
  const wobble = Math.sin(md * 0.37) * 5.5 + Math.sin(md * 1.07) * 2.2;
  return Math.max(6, bed.gr + wobble);
}

function pickAt(picks: Pick[], md: number): Lith | null {
  let cur: Lith | null = null;
  for (const p of picks) {
    if (md >= p.from) cur = p.lith;
  }
  return cur;
}

function scoreRun(level: Level, samples: Sample[], picks: Pick[], earlyCalls: number) {
  let match = 0;
  let n = 0;
  let limeAsSand = 0;
  for (const s of samples) {
    const call = pickAt(picks, s.md);
    if (!call) continue;
    n += 1;
    if (call === s.truth) match += 1;
    if (s.truth === 'lime' && call === 'sand') limeAsSand += 1;
  }
  const acc = n ? match / n : 0;
  const accPts = clamp(acc * 40, 0, 40);

  const realTops = level.beds.slice(1).map((b) => b.top);
  const userTops = picks.slice(1).map((p) => p.from);
  let topHits = 0;
  for (const t of realTops) {
    if (userTops.some((u) => Math.abs(u - t) <= 8)) topHits += 1;
  }
  const topPts = realTops.length ? clamp((topHits / realTops.length) * 25, 0, 25) : 0;
  const limePts = limeAsSand === 0 ? 15 : limeAsSand === 1 ? 6 : 0;
  const lagPts = earlyCalls < 4 ? 15 : earlyCalls < 10 ? 7 : 0;
  const coverPts = samples.length > 8 ? 5 : 0;
  const total = Math.round(accPts + topPts + limePts + lagPts + coverPts);
  return { accPts, topPts, limePts, lagPts, coverPts, total, acc, topHits, topNeed: realTops.length, limeAsSand, earlyCalls };
}

function notesFor(
  level: Level,
  sc: ReturnType<typeof scoreRun>,
  last: Sample | null
): string[] {
  const out: string[] = [];
  if (sc.acc < 0.7) {
    out.push(
      `Lithology call ${ (sc.acc * 100).toFixed(0) }% vs the crystal. Shale > 80 API, clean sand 25–45, lime < 25. Dirty sand lives in the middle — still sand.`
    );
  }
  if (sc.topHits < sc.topNeed) {
    out.push(
      `Bed tops ${sc.topHits}/${sc.topNeed} inside 8 ft. Change the call when GR crosses the window at sensor MD, not when the bit arrives.`
    );
  }
  if (sc.earlyCalls >= 4) {
    out.push(
      `${sc.earlyCalls} early flips while GR was still in the previous window. The crystal is ${level.lag} ft behind the bit. You called the bit, not the log.`
    );
  }
  if (sc.limeAsSand) {
    out.push(`${sc.limeAsSand} lime sample${sc.limeAsSand === 1 ? '' : 's'} called sand. Low GR is not automatically pay.`);
  }
  if (!out.length && last) {
    out.push(`Log is sendable. Last sensor MD ${last.md.toFixed(0)}, GR ${last.gr.toFixed(0)} API, lag ${level.lag} ft.`);
  }
  return out;
}

const PW = 280;
const PH = 176;
const PAD = { l: 28, r: 28, t: 10, b: 14 };

export const FormationLog: React.FC = () => {
  const first = LEVELS[0];
  const [levelId, setLevelId] = useState<LevelId>(1);
  const level = LEVELS[levelId - 1];
  const [phase, setPhase] = useState<Phase>('run');
  const [playing, setPlaying] = useState(true);
  const [bitMd, setBitMd] = useState(first.startMd);
  const [rop, setRop] = useState(120);
  const [call, setCall] = useState<Lith>('shale');
  const [picks, setPicks] = useState<Pick[]>([{ from: first.startMd, lith: 'shale' }]);
  const [samples, setSamples] = useState<Sample[]>([]);
  const [earlyCalls, setEarlyCalls] = useState(0);
  const [flash, setFlash] = useState(false);

  const bitR = useRef(first.startMd);
  const callR = useRef<Lith>('shale');
  const ropR = useRef(120);
  const flashTimer = useRef(0);

  bitR.current = bitMd;
  callR.current = call;
  ropR.current = rop;

  const loadWell = (id: LevelId, autoplay: boolean) => {
    const lvl = LEVELS[id - 1];
    const firstBed = lvl.beds[0].lith;
    setLevelId(id);
    setPhase('run');
    setPlaying(autoplay);
    setBitMd(lvl.startMd);
    setRop(120);
    setCall(firstBed);
    setPicks([{ from: lvl.startMd, lith: firstBed }]);
    setSamples([]);
    setEarlyCalls(0);
    setFlash(false);
    bitR.current = lvl.startMd;
    callR.current = firstBed;
  };

  const changeCall = (next: Lith) => {
    if (next === callR.current) return;
    const lvl = LEVELS[levelId - 1];
    const sensor = bitR.current - lvl.lag;
    const truth = bedAt(lvl.beds, sensor);
    const gr = truthGr(lvl.beds, sensor);
    const looksNew =
      (next === 'sand' && gr > 80) ||
      (next === 'lime' && gr > 40) ||
      (next === 'shale' && gr < 45);
    if (looksNew) setEarlyCalls((n) => n + 1);
    setCall(next);
    callR.current = next;
    setPicks((p) => [...p, { from: sensor, lith: next }]);
    setFlash(true);
    window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(false), 2000);
  };

  useEffect(() => {
    if (phase !== 'run' || !playing) return;
    const id = window.setInterval(() => {
      const lvl = LEVELS[levelId - 1];
      const dmd = 0.55 + (ropR.current / 200) * 0.7;
      const nextBit = bitR.current + dmd;
      bitR.current = nextBit;
      setBitMd(nextBit);
      const sensor = nextBit - lvl.lag;
      if (sensor >= lvl.startMd) {
        const bed = bedAt(lvl.beds, sensor);
        const gr = truthGr(lvl.beds, sensor);
        setSamples((prev) => {
          const last = prev[prev.length - 1];
          if (last && sensor - last.md < 1.6) return prev;
          return [...prev, { md: sensor, gr, truth: bed.lith }];
        });
      }
      if (nextBit >= lvl.endMd) {
        setPlaying(false);
        setPhase('debrief');
      }
    }, 80);
    return () => window.clearInterval(id);
  }, [phase, levelId, playing]);

  useEffect(() => () => window.clearTimeout(flashTimer.current), []);

  const sensorMd = bitMd - level.lag;
  const live = samples[samples.length - 1];
  const liveGr = live?.gr ?? truthGr(level.beds, Math.max(level.startMd, sensorMd));
  const truthNow = bedAt(level.beds, Math.max(level.startMd, sensorMd)).lith;
  const match = live ? pickAt(picks, live.md) === live.truth : false;
  const sc = useMemo(() => scoreRun(level, samples, picks, earlyCalls), [level, samples, picks, earlyCalls]);
  const debriefNotes = useMemo(() => notesFor(level, sc, live ?? null), [level, sc, live]);

  const chip =
    phase === 'debrief'
      ? sc.total >= 75
        ? { label: 'Send', cls: 'text-[#3ecf8e]', bar: '#3ecf8e' }
        : { label: 'Miss', cls: 'text-[#d4a017]', bar: '#d4a017' }
      : flash
        ? { label: 'Top marked', cls: 'text-[#d4a017]', bar: '#d4a017' }
        : !playing
          ? { label: 'Paused', cls: 'text-[#8a9099]', bar: '#8a9099' }
          : match
            ? { label: 'In window', cls: 'text-[#3ecf8e]', bar: '#3ecf8e' }
            : { label: 'Off lith', cls: 'text-[#d4a017]', bar: '#d4a017' };

  const span = Math.max(1, level.endMd - level.startMd);
  const yOf = (md: number) => PAD.t + ((md - level.startMd) / span) * (PH - PAD.t - PAD.b);
  const xOf = (gr: number) => PAD.l + (clamp(gr, 0, 200) / 200) * (PW - PAD.l - PAD.r);

  const grPath = samples
    .map((s, i) => `${i === 0 ? 'M' : 'L'}${xOf(s.gr).toFixed(1)},${yOf(s.md).toFixed(1)}`)
    .join(' ');

  const pickRects = picks.map((p, i) => {
    const next = picks[i + 1]?.from ?? Math.max(level.startMd, sensorMd);
    return { ...p, to: next };
  });

  const coach = (() => {
    if (phase === 'debrief') return debriefNotes[0];
    if (sensorMd < level.startMd) {
      return `Bit is ${bitMd.toFixed(0)} ft. Crystal is still ${level.lag} ft behind. No GR yet — do not invent a lithology.`;
    }
    if (liveGr > 160) return `Hot shale. ${liveGr.toFixed(0)} API. Uranium spike. Still shale — do not flip the call.`;
    if (live && pickAt(picks, live.md) !== live.truth) {
      return `GR ${liveGr.toFixed(0)} API is ${LITH[truthNow].label.toLowerCase()} (${LITH[truthNow].window}). You have ${LITH[call].label}. Change the call at the sensor, not the bit.`;
    }
    return `${LITH[call].label}. Sensor ${Math.max(level.startMd, sensorMd).toFixed(0)} ft is ${level.lag} ft behind the bit. Next window change is a bed top.`;
  })();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label-caps">Gamma lithology</p>
          <h3 className="instrument-title mt-1">Formation Log</h3>
          <p className="mt-1.5 min-h-[2.75rem] text-[12px] leading-relaxed text-[#8a9099]">{level.brief}</p>
        </div>
        <span className={`hmi-lamp w-[6.2rem] shrink-0 justify-end whitespace-nowrap ${chip.cls}`}>
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

      <div className="overflow-hidden border border-[#1d2026] bg-[#07080a]">
        <svg viewBox={`0 0 ${PW} ${PH}`} className="block h-auto w-full overflow-hidden" role="img" aria-label="Gamma ray log">
          <rect width={PW} height={PH} fill="#07080a" />
          {[0, 50, 100, 150, 200].map((g) => (
            <g key={g}>
              <line x1={xOf(g)} x2={xOf(g)} y1={PAD.t} y2={PH - PAD.b} stroke="#1d2026" />
              <text x={xOf(g)} y={8} textAnchor="middle" fill="#5c636e" fontSize="7">
                {g}
              </text>
            </g>
          ))}
          {pickRects.map((p) => (
            <rect
              key={`${p.from}-${p.lith}`}
              x={PW - PAD.r + 4}
              y={yOf(p.from)}
              width="18"
              height={Math.max(1, yOf(p.to) - yOf(p.from))}
              fill={LITH[p.lith].color}
              opacity="0.55"
            />
          ))}
          {phase === 'debrief' &&
            level.beds.map((b) => (
              <rect
                key={`t-${b.top}`}
                x={PW - 10}
                y={yOf(b.top)}
                width="6"
                height={Math.max(1, yOf(b.base) - yOf(b.top))}
                fill={LITH[b.lith].color}
              />
            ))}
          {grPath && <path d={grPath} fill="none" stroke="#3aa8b8" strokeWidth="1.25" />}
          {sensorMd >= level.startMd && (
            <line
              x1={PAD.l}
              x2={PW - PAD.r}
              y1={yOf(clamp(sensorMd, level.startMd, level.endMd))}
              y2={yOf(clamp(sensorMd, level.startMd, level.endMd))}
              stroke="#3ecf8e"
              strokeWidth="1"
            />
          )}
          <line
            x1={PAD.l}
            x2={PW - PAD.r}
            y1={yOf(clamp(bitMd, level.startMd, level.endMd))}
            y2={yOf(clamp(bitMd, level.startMd, level.endMd))}
            stroke="#e6e8eb"
            strokeOpacity="0.35"
            strokeDasharray="3 2"
          />
          <text x={4} y={PH - 4} fill="#5c636e" fontSize="7">
            MD
          </text>
          <text x={PW - 22} y={8} fill="#5c636e" fontSize="7">
            CALL
          </text>
        </svg>
      </div>

      <div className="grid grid-cols-4 gap-x-2 gap-y-1 border-y border-[#1d2026] py-2">
        {[
          { l: 'Bit', v: bitMd.toFixed(0), u: 'ft' },
          { l: 'Sensor', v: Math.max(level.startMd, sensorMd).toFixed(0), u: 'ft' },
          { l: 'GR', v: liveGr.toFixed(0), u: 'API', warn: liveGr > 160 },
          { l: 'Lag', v: `${level.lag}`, u: 'ft' },
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

      <div className="flex gap-1.5">
        {(['shale', 'sand', 'lime'] as const).map((lith) => (
          <button
            key={lith}
            type="button"
            onClick={() => changeCall(lith)}
            className={`hmi-key flex-1 ${call === lith ? 'is-on' : ''}`}
            style={call === lith ? { borderColor: `${LITH[lith].color}cc`, color: LITH[lith].color } : undefined}
          >
            {LITH[lith].label}
          </button>
        ))}
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
        <button type="button" onClick={() => loadWell(levelId, true)} className="hmi-key" aria-label="Reset stand">
          <RotateCcw size={12} />
        </button>
      </div>

      <p className={`min-h-[1.15rem] hmi-readout text-[11px] text-[#d4a017] ${flash ? 'visible' : 'invisible'}`}>
        Top at sensor {Math.max(level.startMd, sensorMd).toFixed(0)} · {LITH[call].label}
      </p>

      <p className="min-h-[2.75rem] text-[12px] leading-relaxed text-[#8a9099]">{coach}</p>

      {phase === 'debrief' && (
        <div className="space-y-2 border-t border-[#1d2026] pt-3">
          <p className="hmi-readout text-[22px] leading-none text-[#e6e8eb]">
            {sc.total}
            <span className="ml-1 text-[11px] text-[#5c636e]">/ 100</span>
          </p>
          {[
            { l: 'Lithology match', v: `${(sc.acc * 100).toFixed(0)}%`, p: sc.accPts, max: 40 },
            { l: 'Bed tops ±8 ft', v: `${sc.topHits}/${sc.topNeed}`, p: sc.topPts, max: 25 },
            { l: 'Lime ≠ sand', v: sc.limeAsSand === 0 ? 'Clean' : `${sc.limeAsSand} miss`, p: sc.limePts, max: 15 },
            { l: 'Lag discipline', v: `${sc.earlyCalls} early`, p: sc.lagPts, max: 15 },
            { l: 'Coverage', v: `${samples.length} samples`, p: sc.coverPts, max: 5 },
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
          <p className="text-[11px] text-[#5c636e]">Right track: your call. Narrow strip on debrief is truth.</p>
        </div>
      )}
    </div>
  );
};
