import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Compass, Gauge, RotateCw, Info } from 'lucide-react';

interface ToolfaceDialProps {
  initialValue?: number;
}

export const ToolfaceDial: React.FC<ToolfaceDialProps> = ({ initialValue = 0 }) => {
  const [toolface, setToolface] = useState(initialValue);
  const [mode, setMode] = useState<'gravity' | 'magnetic'>('gravity');
  const [isSliding, setIsSliding] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);

  const size = 280;
  const margin = 20;
  const radius = (size - margin * 2) / 2;

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${size / 2}, ${size / 2})`);

    // Background circle
    g.append('circle')
      .attr('r', radius)
      .attr('fill', '#18181b')
      .attr('stroke', '#27272a')
      .attr('stroke-width', 2);

    // Ticks
    const ticks = d3.range(0, 360, 10);
    g.selectAll('.tick')
      .data(ticks)
      .enter()
      .append('line')
      .attr('class', 'tick')
      .attr('x1', 0)
      .attr('y1', -radius + 5)
      .attr('x2', 0)
      .attr('y2', d => -radius + (d % 30 === 0 ? 15 : 10))
      .attr('stroke', d => d % 30 === 0 ? '#71717a' : '#3f3f46')
      .attr('stroke-width', d => d % 30 === 0 ? 2 : 1)
      .attr('transform', d => `rotate(${d})`);

    // Labels
    const labels = [0, 90, 180, 270];
    const labelNames = ['N', 'E', 'S', 'W'];
    const gravityNames = ['HS', 'R', 'LS', 'L']; // High Side, Right, Low Side, Left

    g.selectAll('.label')
      .data(labels)
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('x', 0)
      .attr('y', -radius + 25)
      .attr('text-anchor', 'middle')
      .attr('fill', '#a1a1aa')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .attr('transform', d => `rotate(${d})`)
      .text((d, i) => mode === 'magnetic' ? labelNames[i] : gravityNames[i]);

    // Needle group
    const needle = g.append('g')
      .attr('class', 'needle-group')
      .style('transition', 'transform 0.3s ease-out')
      .attr('transform', `rotate(${toolface})`);

    // Needle body
    needle.append('path')
      .attr('d', `M -5 0 L 0 ${-radius + 40} L 5 0 Z`)
      .attr('fill', mode === 'gravity' ? '#10b981' : '#3b82f6');

    // Center cap
    g.append('circle')
      .attr('r', 8)
      .attr('fill', '#27272a')
      .attr('stroke', '#52525b')
      .attr('stroke-width', 2);

  }, [toolface, mode, size, radius]);

  // Simulation for sliding
  useEffect(() => {
    let interval: any;
    if (isSliding) {
      interval = setInterval(() => {
        setToolface(prev => (prev + (Math.random() * 4 - 2) + 360) % 360);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isSliding]);

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-lg ${mode === 'gravity' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
            {mode === 'gravity' ? <Gauge size={20} /> : <Compass size={20} />}
          </div>
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              {mode === 'gravity' ? 'Gravity Toolface' : 'Magnetic Toolface'}
            </h3>
            <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
              Reference: {mode === 'gravity' ? 'High Side' : 'Magnetic North'}
            </p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-mono font-bold text-white">
            {Math.round(toolface)}°
          </span>
        </div>
      </div>

      <div className="flex justify-center py-4">
        <svg 
          ref={svgRef} 
          width={size} 
          height={size} 
          className="drop-shadow-[0_0_20px_rgba(0,0,0,0.5)]"
        />
      </div>

      <div className="space-y-4">
        <div className="flex gap-2">
          <button 
            onClick={() => setMode('gravity')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'gravity' ? 'bg-emerald-500 text-zinc-900' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
          >
            Gravity
          </button>
          <button 
            onClick={() => setMode('magnetic')}
            className={`flex-1 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${mode === 'magnetic' ? 'bg-blue-500 text-zinc-900' : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'}`}
          >
            Magnetic
          </button>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            <span>Adjust Toolface</span>
            <span>{Math.round(toolface)}°</span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="359" 
            value={toolface} 
            onChange={(e) => setToolface(Number(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <button 
          onClick={() => setIsSliding(!isSliding)}
          className={`w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-xs uppercase tracking-widest transition-all ${isSliding ? 'bg-red-500/10 text-red-500 border border-red-500/20' : 'bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700'}`}
        >
          <RotateCw size={16} className={isSliding ? 'animate-spin' : ''} />
          {isSliding ? 'Stop Sliding Simulation' : 'Simulate Sliding Mode'}
        </button>

        <div className="p-4 bg-zinc-950 rounded-2xl border border-zinc-800 flex gap-3">
          <Info size={16} className="text-zinc-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-zinc-500 leading-relaxed">
            {mode === 'gravity' 
              ? 'Gravity toolface is used when the wellbore is inclined. It measures orientation relative to the "High Side" (top) of the hole.' 
              : 'Magnetic toolface is used in vertical or low-inclination sections where gravity vectors are weak. It references Magnetic North.'}
          </p>
        </div>
      </div>
    </div>
  );
};
