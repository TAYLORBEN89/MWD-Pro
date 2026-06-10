import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { motion } from 'motion/react';
import { Compass, Magnet, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const MagneticInterference: React.FC = () => {
  const [axialInterference, setAxialInterference] = useState(0);
  const [crossAxialInterference, setCrossAxialInterference] = useState(0);
  const svgRef = useRef<SVGSVGElement>(null);

  const width = 300;
  const height = 300;
  const radius = 120;
  const center = { x: width / 2, y: height / 2 };

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g')
      .attr('transform', `translate(${center.x}, ${center.y})`);

    // Background Circle
    g.append('circle')
      .attr('r', radius)
      .attr('fill', '#18181b')
      .attr('stroke', '#27272a')
      .attr('stroke-width', 2);

    // Grid lines
    g.append('line')
      .attr('x1', -radius).attr('y1', 0).attr('x2', radius).attr('y2', 0)
      .attr('stroke', '#3f3f46').attr('stroke-dasharray', '4,4');
    g.append('line')
      .attr('x1', 0).attr('y1', -radius).attr('x2', 0).attr('y2', radius)
      .attr('stroke', '#3f3f46').attr('stroke-dasharray', '4,4');

    // True Magnetic Vector (Ideal)
    const trueAngle = -45; // 45 degrees NE
    const trueX = radius * 0.8 * Math.cos(trueAngle * Math.PI / 180);
    const trueY = radius * 0.8 * Math.sin(trueAngle * Math.PI / 180);

    // Arrowhead definition
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', '5')
      .attr('refY', '5')
      .attr('markerWidth', '6')
      .attr('markerHeight', '6')
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#10b981');

    svg.select('defs').append('marker')
      .attr('id', 'arrowhead-distorted')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', '5')
      .attr('refY', '5')
      .attr('markerWidth', '6')
      .attr('markerHeight', '6')
      .attr('orient', 'auto-start-reverse')
      .append('path')
      .attr('d', 'M 0 0 L 10 5 L 0 10 z')
      .attr('fill', '#ef4444');

    // True Vector Line
    g.append('line')
      .attr('x1', 0).attr('y1', 0).attr('x2', trueX).attr('y2', trueY)
      .attr('stroke', '#10b981')
      .attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrowhead)');

    // Distorted Vector Calculation
    // Axial interference shifts the vector along the tool axis (Y-axis in this 2D view)
    // Cross-axial interference shifts it perpendicular (X-axis)
    const distortedX = trueX + (crossAxialInterference * 50);
    const distortedY = trueY + (axialInterference * 50);

    // Distorted Vector Line
    g.append('line')
      .attr('x1', 0).attr('y1', 0).attr('x2', distortedX).attr('y2', distortedY)
      .attr('stroke', '#ef4444')
      .attr('stroke-width', 3)
      .attr('marker-end', 'url(#arrowhead-distorted)');

    // Labels
    g.append('text')
      .attr('x', 0).attr('y', -radius - 10)
      .attr('text-anchor', 'middle')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text('N');

    // Tool Axis Label
    g.append('text')
      .attr('x', radius + 10).attr('y', 0)
      .attr('text-anchor', 'start')
      .attr('fill', '#71717a')
      .attr('font-size', '10px')
      .attr('font-weight', 'bold')
      .text('E');

  }, [axialInterference, crossAxialInterference]);

  const totalInterference = Math.sqrt(axialInterference**2 + crossAxialInterference**2);
  const isSevere = totalInterference > 0.5;

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl">
      <div className="flex flex-col lg:flex-row gap-8 items-center">
        {/* Visualization */}
        <div className="relative">
          <svg 
            ref={svgRef} 
            width={width} 
            height={height} 
            className="drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]"
          />
          
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-emerald-500 rounded-full" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">True Magnetic Field</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Measured Field</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex-1 w-full space-y-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Axial Interference</label>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${axialInterference !== 0 ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-500'}`}>
                  {(axialInterference * 100).toFixed(0)} nT
                </span>
              </div>
              <input 
                type="range" 
                min="-1" 
                max="1" 
                step="0.1" 
                value={axialInterference}
                onChange={(e) => setAxialInterference(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Caused by long ferrous components (drill collars, motors) along the tool axis.</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-zinc-400 uppercase tracking-widest">Cross-Axial Interference</label>
                <span className={`text-xs font-mono px-2 py-0.5 rounded ${crossAxialInterference !== 0 ? 'bg-red-500/20 text-red-500' : 'bg-zinc-800 text-zinc-500'}`}>
                  {(crossAxialInterference * 100).toFixed(0)} nT
                </span>
              </div>
              <input 
                type="range" 
                min="-1" 
                max="1" 
                step="0.1" 
                value={crossAxialInterference}
                onChange={(e) => setCrossAxialInterference(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Caused by nearby stabilizers or magnetic hotspots perpendicular to the tool axis.</p>
            </div>
          </div>

          {/* Status Card */}
          <motion.div 
            animate={{ 
              backgroundColor: isSevere ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              borderColor: isSevere ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'
            }}
            className="p-4 rounded-2xl border flex items-start gap-4"
          >
            {isSevere ? (
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
            ) : (
              <CheckCircle2 className="text-emerald-500 shrink-0" size={24} />
            )}
            <div>
              <h4 className={`text-sm font-bold uppercase tracking-widest ${isSevere ? 'text-red-500' : 'text-emerald-500'}`}>
                {isSevere ? 'Severe Interference Detected' : 'Survey Quality: Good'}
              </h4>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                {isSevere 
                  ? 'The measured magnetic field deviates significantly from the true field. Azimuth readings will be inaccurate. Consider MSA or IFR corrections.'
                  : 'Magnetic interference is within acceptable limits. Azimuth data is reliable for directional steering.'}
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
