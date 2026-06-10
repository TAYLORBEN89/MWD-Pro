import React, { useState, useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { Compass, MoveDown, Info, Activity } from 'lucide-react';

interface SurveyPoint {
  md: number;
  inc: number;
  azi: number;
  tvd: number;
  north: number;
  east: number;
  vs: number; // Vertical Section
}

export const WellboreTrajectory: React.FC = () => {
  const [drillDepth, setDrillDepth] = useState(3000);
  const [wellType, setWellType] = useState<'vertical' | 'build' | 'turn'>('build');

  const surveyData = useMemo(() => {
    const points: SurveyPoint[] = [];
    let currentTVD = 0;
    let currentNorth = 0;
    let currentEast = 0;
    let currentVS = 0;

    const interval = 100;
    const maxDepth = 5000;

    for (let md = 0; md <= maxDepth; md += interval) {
      let inc = 0;
      let azi = 0;

      if (wellType === 'vertical') {
        inc = 0;
        azi = 0;
      } else if (wellType === 'build') {
        // Build to 90 degrees starting at 1000ft
        if (md > 1000) {
          inc = Math.min(90, (md - 1000) * 0.05); // 5 deg / 100ft
        }
        azi = 45; // Constant azimuth
      } else if (wellType === 'turn') {
        // Build to 45, then turn azimuth
        if (md > 1000) {
          inc = Math.min(45, (md - 1000) * 0.04);
        }
        if (md > 2500) {
          azi = (md - 2500) * 0.08; // 8 deg / 100ft turn
        } else {
          azi = 0;
        }
      }

      // Simple calculation (not full minimum curvature but good for visualization)
      const radInc = (inc * Math.PI) / 180;
      const radAzi = (azi * Math.PI) / 180;

      if (md > 0) {
        const prevPoint = points[points.length - 1];
        const deltaMD = interval;
        
        // Average angles
        const avgInc = (prevPoint.inc + inc) / 2;
        const avgAzi = (prevPoint.azi + azi) / 2;
        const radAvgInc = (avgInc * Math.PI) / 180;
        const radAvgAzi = (avgAzi * Math.PI) / 180;

        currentTVD += deltaMD * Math.cos(radAvgInc);
        const horizontalDelta = deltaMD * Math.sin(radAvgInc);
        currentNorth += horizontalDelta * Math.cos(radAvgAzi);
        currentEast += horizontalDelta * Math.sin(radAvgAzi);
        currentVS += horizontalDelta; // Simplified VS
      }

      points.push({
        md,
        inc,
        azi,
        tvd: currentTVD,
        north: currentNorth,
        east: currentEast,
        vs: currentVS
      });
    }
    return points;
  }, [wellType]);

  const visibleData = useMemo(() => {
    return surveyData.filter(p => p.md <= drillDepth);
  }, [surveyData, drillDepth]);

  const currentPoint = visibleData[visibleData.length - 1] || surveyData[0];

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
            <Activity size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Wellbore Trajectory</h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">3D Path Visualization</p>
          </div>
        </div>
        <div className="flex gap-2">
          {(['vertical', 'build', 'turn'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setWellType(type)}
              className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest transition-all ${wellType === type ? 'bg-emerald-500 text-zinc-900' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-[400px]">
        {/* Profile View (TVD vs VS) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <MoveDown size={12} />
            <span>Profile View (TVD vs VS)</span>
          </div>
          <div className="h-full bg-zinc-950/50 rounded-2xl p-2 border border-zinc-800/50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
                <XAxis dataKey="vs" hide />
                <YAxis dataKey="tvd" reversed domain={[0, 5000]} stroke="#4b5563" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#10b981' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="tvd" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  dot={false} 
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Plan View (North vs East) */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <Compass size={12} />
            <span>Plan View (North vs East)</span>
          </div>
          <div className="h-full bg-zinc-950/50 rounded-2xl p-2 border border-zinc-800/50">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visibleData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="east" domain={[-1000, 2000]} stroke="#4b5563" fontSize={10} />
                <YAxis dataKey="north" domain={[-1000, 2000]} stroke="#4b5563" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', border: '1px solid #27272a', borderRadius: '12px', fontSize: '10px' }}
                  itemStyle={{ color: '#3b82f6' }}
                  labelStyle={{ color: '#a1a1aa' }}
                />
                <ReferenceLine x={0} stroke="#374151" />
                <ReferenceLine y={0} stroke="#374151" />
                <Line 
                  type="monotone" 
                  dataKey="north" 
                  stroke="#3b82f6" 
                  strokeWidth={3} 
                  dot={false}
                  animationDuration={500}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Inclination</p>
            <p className="text-lg font-mono font-bold text-white">{Math.round(currentPoint.inc)}°</p>
          </div>
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Azimuth</p>
            <p className="text-lg font-mono font-bold text-white">{Math.round(currentPoint.azi)}°</p>
          </div>
          <div className="bg-zinc-950 p-3 rounded-2xl border border-zinc-800 text-center">
            <p className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest mb-1">TVD</p>
            <p className="text-lg font-mono font-bold text-white">{Math.round(currentPoint.tvd)}'</p>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>Drill Depth (MD)</span>
            <span>{drillDepth}'</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="5000" 
            step="100"
            value={drillDepth} 
            onChange={(e) => setDrillDepth(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex gap-3">
          <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            The 3D path of a wellbore is defined by its <strong>Inclination</strong> (vertical angle) and <strong>Azimuth</strong> (horizontal angle) at each <strong>Measured Depth</strong>. The Minimum Curvature method calculates the TVD, North, and East coordinates between survey points.
          </p>
        </div>
      </div>
    </div>
  );
};
