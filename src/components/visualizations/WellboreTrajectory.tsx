import React, { useEffect, useMemo, useState } from 'react';
import { Compass, Crosshair, Info, MoveDown, Pause, Play, Box } from 'lucide-react';

type WellType = 'vertical' | 'build' | 'turn';
type PlotView = 'profile' | 'plan' | 'iso';

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

const MD_MAX = 5000;
const MD_STEP = 25;
const PLANNED_AZI = { vertical: 0, build: 90, turn: 45 };

const WELL_META: Record<WellType, { label: string; blurb: string }> = {
  vertical: { label: 'Vertical', blurb: 'Hold 0° inclination. TVD equals MD.' },
  build: { label: 'Horizontal', blurb: 'KOP 1,100 ft · 8°/100 ft BUR · land at 90° and hold.' },
  turn: { label: '3D Turn', blurb: 'Build to 60°, then walk azimuth while holding inclination.' },
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

function designAngles(md: number, wellType: WellType) {
  if (wellType === 'vertical') return { inc: 0, azi: 0 };

  if (wellType === 'build') {
    const kop = 1100;
    const bur = 0.08;
    const inc = md <= kop ? 0 : clamp((md - kop) * bur, 0, 90);
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

function buildSurvey(wellType: WellType): SurveyPoint[] {
  const points: SurveyPoint[] = [{
    md: 0, inc: 0, azi: 0, tvd: 0, north: 0, east: 0, vs: 0, dls: 0,
  }];

  const planned = toRad(PLANNED_AZI[wellType]);

  for (let md = MD_STEP; md <= MD_MAX; md += MD_STEP) {
    const prev = points[points.length - 1];
    const { inc, azi } = designAngles(md, wellType);
    const dmd = md - prev.md;
    const i1 = toRad(prev.inc);
    const i2 = toRad(inc);
    const a1 = toRad(prev.azi);
    const a2 = toRad(azi);
    const cosDl = clamp(
      Math.cos(i1) * Math.cos(i2) + Math.sin(i1) * Math.sin(i2) * Math.cos(a2 - a1),
      -1,
      1
    );
    const dl = Math.acos(cosDl);
    const rf = dl < 1e-8 ? 1 : (2 / dl) * Math.tan(dl / 2);
    const dN = (dmd / 2) * (Math.sin(i1) * Math.cos(a1) + Math.sin(i2) * Math.cos(a2)) * rf;
    const dE = (dmd / 2) * (Math.sin(i1) * Math.sin(a1) + Math.sin(i2) * Math.sin(a2)) * rf;
    const dTvd = (dmd / 2) * (Math.cos(i1) + Math.cos(i2)) * rf;
    const north = prev.north + dN;
    const east = prev.east + dE;
    const tvd = prev.tvd + dTvd;
    const vs = north * Math.cos(planned) + east * Math.sin(planned);

    points.push({
      md,
      inc,
      azi,
      tvd,
      north,
      east,
      vs,
      dls: dogleg(prev.inc, prev.azi, inc, azi, dmd),
    });
  }

  return points;
}

function phaseLabel(p: SurveyPoint, wellType: WellType) {
  if (wellType === 'vertical') return 'Vertical';
  if (p.inc < 2) return 'Vertical';
  if (wellType === 'build') return p.inc < 88 ? 'Build' : 'Lateral';
  if (p.inc < 58) return 'Build';
  return p.dls > 1.5 ? 'Turn' : 'Hold';
}

function coachCopy(p: SurveyPoint, wellType: WellType) {
  const phase = phaseLabel(p, wellType);
  if (phase === 'Vertical') {
    return 'String is vertical. Inclination is ~0°, so TVD tracks measured depth. Watch for the kickoff once you drill past KOP.';
  }
  if (phase === 'Build') {
    return `Building angle at ${p.dls.toFixed(1)}°/100 ft. Inclination ${p.inc.toFixed(1)}°. TVD gain slows as the well lays over.`;
  }
  if (phase === 'Turn') {
    return `Walking azimuth at ${p.azi.toFixed(0)}° while holding inclination. Plan view shows the 3D dogleg.`;
  }
  if (phase === 'Lateral') {
    return 'Landed. Inclination is ~90°, so TVD is nearly flat while VS and departure keep growing.';
  }
  return 'Holding tangent. Dogleg is low — the well is following the planned attitude.';
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

const W = 360;
const H = 200;
const PAD = { l: 36, r: 12, t: 12, b: 24 };

export const WellboreTrajectory: React.FC = () => {
  const [drillDepth, setDrillDepth] = useState(2800);
  const [wellType, setWellType] = useState<WellType>('build');
  const [plotView, setPlotView] = useState<PlotView>('profile');
  const [playing, setPlaying] = useState(false);

  const survey = useMemo(() => buildSurvey(wellType), [wellType]);

  const visible = useMemo(
    () => survey.filter((p) => p.md <= drillDepth),
    [survey, drillDepth]
  );

  const bit = visible[visible.length - 1] ?? survey[0];
  const casingEnd = survey.find((p) => p.md >= 900) ?? survey[0];

  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      setDrillDepth((d) => {
        if (d >= MD_MAX) {
          setPlaying(false);
          return MD_MAX;
        }
        return Math.min(MD_MAX, d + 50);
      });
    }, 70);
    return () => window.clearInterval(id);
  }, [playing]);

  useEffect(() => {
    setPlaying(false);
    setDrillDepth(wellType === 'vertical' ? 2200 : 2800);
  }, [wellType]);

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
      const xExt = extent(proj.map((p) => p.x), 0.16);
      const yExt = extent(proj.map((p) => p.y), 0.1);
      const xOf = (p: SurveyPoint) => mapRange(project(p).x, xExt.min, xExt.max, PAD.l, PAD.l + innerW);
      const yOf = (p: SurveyPoint) => mapRange(project(p).y, yExt.min, yExt.max, PAD.t, PAD.t + innerH);
      return {
        xOf,
        yOf,
        xLabel: 'N / E departure',
        yLabel: 'TVD down',
        yTicks: [] as number[],
        xTicks: [] as number[],
        yTickPos: () => 0,
        xTickPos: () => 0,
      };
    }

    const vsExt = extent(fit.map((p) => p.vs), 0.08);
    const tvdMax = Math.max(...fit.map((p) => p.tvd), 400);
    const xOf = (p: SurveyPoint) => mapRange(p.vs, vsExt.min, Math.max(vsExt.max, 120), PAD.l, PAD.l + innerW);
    const yOf = (p: SurveyPoint) => mapRange(p.tvd, 0, tvdMax * 1.06, PAD.t, PAD.t + innerH);
    return {
      xOf,
      yOf,
      xLabel: 'Vertical section (ft)',
      yLabel: 'TVD (ft)',
      yTicks: [0, tvdMax / 2, tvdMax],
      xTicks: [0, (vsExt.max || 0) / 2, vsExt.max || 0].map((v) => Math.max(0, v)),
      yTickPos: (v: number) => mapRange(v, 0, tvdMax * 1.06, PAD.t, PAD.t + innerH),
      xTickPos: (v: number) => mapRange(v, vsExt.min, Math.max(vsExt.max, 120), PAD.l, PAD.l + innerW),
    };
  }, [visible, survey, plotView]);

  const pathD = visible
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${plot.xOf(p).toFixed(1)},${plot.yOf(p).toFixed(1)}`)
    .join(' ');

  const casingPts = visible.filter((p) => p.md <= casingEnd.md);
  const casingD = casingPts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${plot.xOf(p).toFixed(1)},${plot.yOf(p).toFixed(1)}`)
    .join(' ');

  const bitX = plot.xOf(bit);
  const bitY = plot.yOf(bit);
  const phase = phaseLabel(bit, wellType);

  const formations = plotView === 'profile'
    ? [
        { top: 0, bot: 0.22, fill: '#14532d', label: 'Surface' },
        { top: 0.22, bot: 0.48, fill: '#1c1917', label: 'Shale' },
        { top: 0.48, bot: 0.72, fill: '#44403c', label: 'Sand' },
        { top: 0.72, bot: 1, fill: '#064e3b', label: 'Target' },
      ]
    : [];

  const fmt = (n: number, d = 0) => n.toFixed(d);
  const ns = bit.north >= 0 ? `${fmt(bit.north, 0)} N` : `${fmt(-bit.north, 0)} S`;
  const ew = bit.east >= 0 ? `${fmt(bit.east, 0)} E` : `${fmt(-bit.east, 0)} W`;

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Crosshair size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Wellbore Trajectory</h3>
            <p className="instrument-subtitle">Minimum-curvature survey · live bit</p>
          </div>
        </div>
        <span className="instrument-chip">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          {phase}
        </span>
      </div>

      <div className="flex gap-1.5">
        {(['vertical', 'build', 'turn'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setWellType(type)}
            className={`instrument-btn flex-1 ${wellType === type ? 'is-active' : ''}`}
          >
            {WELL_META[type].label}
          </button>
        ))}
      </div>

      <div className="flex gap-1">
        {([
          ['profile', MoveDown, 'Profile'],
          ['plan', Compass, 'Plan'],
          ['iso', Box, '3D'],
        ] as const).map(([id, Icon, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPlotView(id)}
            className={`instrument-btn flex-1 ${plotView === id ? 'is-active' : ''}`}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-[#07080a] max-h-[38vh]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block max-h-[38vh]" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Wellbore path plot">
          <defs>
            <linearGradient id="wb-path" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>
            <radialGradient id="wb-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.55" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wb-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0c1220" />
              <stop offset="100%" stopColor="#07080a" />
            </linearGradient>
          </defs>

          <rect width={W} height={H} fill="url(#wb-sky)" />

          {formations.map((f) => {
            const y0 = PAD.t + (H - PAD.t - PAD.b) * f.top;
            const y1 = PAD.t + (H - PAD.t - PAD.b) * f.bot;
            return (
              <g key={f.label}>
                <rect
                  x={PAD.l}
                  y={y0}
                  width={W - PAD.l - PAD.r}
                  height={y1 - y0}
                  fill={f.fill}
                  opacity={0.28}
                />
                <text
                  x={W - PAD.r - 4}
                  y={(y0 + y1) / 2 + 3}
                  textAnchor="end"
                  fill="#a1a1aa"
                  fontSize="8"
                  letterSpacing="0.08em"
                >
                  {f.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {plot.yTicks.map((t) => (
            <g key={`y-${t}`}>
              <line
                x1={PAD.l}
                x2={W - PAD.r}
                y1={plot.yTickPos(t)}
                y2={plot.yTickPos(t)}
                stroke="rgba(255,255,255,0.06)"
              />
              <text x={PAD.l - 6} y={plot.yTickPos(t) + 3} textAnchor="end" fill="#71717a" fontSize="8">
                {Math.round(t)}
              </text>
            </g>
          ))}
          {plot.xTicks.map((t) => (
            <g key={`x-${t}`}>
              <line
                y1={PAD.t}
                y2={H - PAD.b}
                x1={plot.xTickPos(t)}
                x2={plot.xTickPos(t)}
                stroke="rgba(255,255,255,0.05)"
              />
              <text x={plot.xTickPos(t)} y={H - 10} textAnchor="middle" fill="#71717a" fontSize="8">
                {Math.round(t)}
              </text>
            </g>
          ))}

          <text
            x={12}
            y={H / 2}
            fill="#52525b"
            fontSize="8"
            letterSpacing="0.12em"
            transform={`rotate(-90 12 ${H / 2})`}
            textAnchor="middle"
          >
            {plot.yLabel.toUpperCase()}
          </text>
          <text x={W / 2} y={H - 4} fill="#52525b" fontSize="8" letterSpacing="0.12em" textAnchor="middle">
            {plot.xLabel.toUpperCase()}
          </text>

          {plotView === 'plan' && (
            <g transform={`translate(${W - 46}, ${PAD.t + 28})`}>
              <circle r="16" fill="rgba(0,0,0,0.45)" stroke="rgba(255,255,255,0.12)" />
              <polygon points="0,-12 3,-2 -3,-2" fill="#fafafa" />
              <text y="12" textAnchor="middle" fill="#a1a1aa" fontSize="7" fontWeight="700">N</text>
            </g>
          )}

          {casingD && (
            <path d={casingD} fill="none" stroke="#a1a1aa" strokeWidth="4.5" strokeLinecap="round" opacity="0.35" />
          )}
          {pathD && (
            <path d={pathD} fill="none" stroke="url(#wb-path)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
          )}

          <circle cx={plot.xOf(survey[0])} cy={plot.yOf(survey[0])} r="3" fill="#e4e4e7" />
          <circle cx={bitX} cy={bitY} r="14" fill="url(#wb-glow)" />
          <circle cx={bitX} cy={bitY} r="4.5" fill="#ecfdf5" stroke="#34d399" strokeWidth="1.5" />
          <line x1={bitX - 9} x2={bitX + 9} y1={bitY} y2={bitY} stroke="#34d399" strokeOpacity="0.45" />
          <line x1={bitX} x2={bitX} y1={bitY - 9} y2={bitY + 9} stroke="#34d399" strokeOpacity="0.45" />
        </svg>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          ['MD', `${fmt(bit.md, 0)} ft`],
          ['INC', `${fmt(bit.inc, 1)}°`],
          ['AZI', `${fmt(bit.azi, 1)}°`],
          ['TVD', `${fmt(bit.tvd, 0)} ft`],
          ['N / E', `${ns}  ${ew}`],
          ['DLS', `${fmt(bit.dls, 1)}°/100`],
        ].map(([label, value]) => (
          <div key={label} className="instrument-metric py-2.5 px-2.5">
            <p className="instrument-metric-label">{label}</p>
            <p className="instrument-metric-value text-[15px] leading-tight">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="label-caps">Bit depth</span>
          <span className="text-xs font-mono text-zinc-300 tabular-nums">{fmt(drillDepth, 0)} ft MD</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="instrument-btn px-2.5 py-2"
            aria-label={playing ? 'Pause drilling' : 'Play drilling'}
          >
            {playing ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <input
            type="range"
            min={0}
            max={MD_MAX}
            step={MD_STEP}
            value={drillDepth}
            onChange={(e) => {
              setPlaying(false);
              setDrillDepth(Number(e.target.value));
            }}
            className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            aria-label="Measured depth"
          />
        </div>
        <p className="text-[11px] text-zinc-500">{WELL_META[wellType].blurb}</p>
      </div>

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>
          <span className="text-zinc-300 font-medium">{phase}. </span>
          {coachCopy(bit, wellType)} Profile is TVD vs vertical section. Plan is north vs east. 3D is an isometric of the same surveys.
        </p>
      </div>
    </div>
  );
};
