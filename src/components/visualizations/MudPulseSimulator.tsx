import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, Zap, Activity, Settings2, Info } from 'lucide-react';

export const MudPulseSimulator: React.FC = () => {
  const [noise, setNoise] = useState(20);
  const [bitRate, setBitRate] = useState(1);
  const [isTransmitting, setIsTransmitting] = useState(true);
  const [dataStream, setDataStream] = useState<number[]>([]);
  const [decodedBits, setDecodedBits] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate random data
  useEffect(() => {
    if (isTransmitting) {
      const interval = setInterval(() => {
        const bit = Math.random() > 0.5 ? 1 : 0;
        setDataStream(prev => [...prev.slice(-40), bit]);
        setDecodedBits(prev => (prev + bit).slice(-8));
      }, 1000 / bitRate);
      return () => clearInterval(interval);
    }
  }, [isTransmitting, bitRate]);

  // Draw the wave
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let offset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw grid
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      for (let i = 0; i < canvas.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvas.height);
        ctx.stroke();
      }

      // Draw baseline
      ctx.strokeStyle = '#3f3f46';
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      // Draw signal
      ctx.beginPath();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';

      const points = 100;
      const step = canvas.width / points;

      for (let i = 0; i <= points; i++) {
        const x = i * step;
        const streamIdx = Math.floor((i + offset) / (points / 10)) % dataStream.length;
        const bit = dataStream[streamIdx] || 0;
        
        // Base signal (square-ish wave for pulses)
        let y = canvas.height / 2;
        if (bit === 1) {
          y -= 40; // Pulse up
        }

        // Add noise
        const noiseVal = (Math.random() - 0.5) * noise;
        y += noiseVal;

        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      if (isTransmitting) {
        offset += 0.5;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dataStream, noise, isTransmitting]);

  return (
    <div className="bg-zinc-900 rounded-3xl p-6 border border-zinc-800 shadow-2xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/10 rounded-xl">
            <Radio className="text-emerald-500" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white font-display">Mud Pulse Telemetry Simulator</h3>
            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Positive Pulse Encoding (Manchester)</p>
          </div>
        </div>
        <button 
          onClick={() => setIsTransmitting(!isTransmitting)}
          className={`px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
            isTransmitting ? 'bg-red-500/20 text-red-500 border border-red-500/20' : 'bg-emerald-500 text-zinc-900'
          }`}
        >
          {isTransmitting ? 'Stop Pulse' : 'Start Pulse'}
        </button>
      </div>

      <div className="relative bg-black/40 rounded-2xl border border-zinc-800 p-4 overflow-hidden">
        <canvas 
          ref={canvasRef} 
          width={800} 
          height={200} 
          className="w-full h-40"
        />
        <div className="absolute top-4 right-4 flex gap-2">
          <div className="px-2 py-1 bg-zinc-900/80 rounded border border-zinc-700 text-[10px] font-mono text-emerald-500">
            SIGNAL: {isTransmitting ? 'ACTIVE' : 'IDLE'}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/30">
          <div className="flex items-center gap-2 text-zinc-400">
            <Settings2 size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Signal Parameters</span>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-zinc-500">Pump Noise (PSI)</span>
                <span className="text-emerald-500">{noise.toFixed(0)}</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="100" 
                value={noise}
                onChange={(e) => setNoise(parseInt(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-zinc-500">Baud Rate (bps)</span>
                <span className="text-emerald-500">{bitRate.toFixed(1)}</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="5" 
                step="0.5"
                value={bitRate}
                onChange={(e) => setBitRate(parseFloat(e.target.value))}
                className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/30">
          <div className="flex items-center gap-2 text-zinc-400">
            <Activity size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Decoded Bitstream</span>
          </div>
          <div className="h-24 bg-black/40 rounded-xl border border-zinc-800 p-4 flex items-center justify-center overflow-hidden">
            <div className="font-mono text-xl tracking-[0.2em] text-emerald-500/80 whitespace-nowrap">
              {decodedBits || '00000000'}
            </div>
          </div>
          <p className="text-[10px] text-zinc-500 leading-relaxed italic">
            * Higher noise levels increase bit-error rate. In real-world MWD, we use advanced filtering to extract signal from pump noise.
          </p>
        </div>
      </div>
    </div>
  );
};
