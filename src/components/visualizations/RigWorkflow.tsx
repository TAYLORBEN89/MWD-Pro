import React, { useState } from 'react';
import { CheckCircle2, Info, Wrench } from 'lucide-react';

interface Step {
  id: string;
  title: string;
  when: string;
  checks: string[];
  fail: string;
}

const STEPS: Step[] = [
  {
    id: 'shop',
    title: 'Shop / program',
    when: 'Before the truck leaves',
    checks: [
      'Load the well program: surveys, toolface, gamma, pulse sequence.',
      'Fresh lithium packs, voltage logged.',
      'Function-test pulser, accelerometers, magnetometers, gamma.',
    ],
    fail: 'A tool that was not function-tested in the shop is a trip waiting to happen.',
  },
  {
    id: 'makeup',
    title: 'BHA makeup',
    when: 'On the rig floor',
    checks: [
      'Magnetometers inside NMDC. Confirm steel-free spacing vs the motor.',
      'Record sensor-to-bit for directional and gamma.',
      'Make up to spec torque. No chain tongs on the pulser housing.',
    ],
    fail: 'Short NMDC is the usual reason Btot fails the first rotating survey.',
  },
  {
    id: 'surface',
    title: 'Surface system',
    when: 'While they pick up',
    checks: [
      'Standpipe pressure transducer on the standpipe, not a dead-headed hose.',
      'Depth tracking matches the driller (pipe tally).',
      'Decoder sees a test pulse or a known pump signature.',
    ],
    fail: 'If depth is wrong, every survey and gamma sample is hung on the wrong MD.',
  },
  {
    id: 'shallow',
    title: 'Shallow-hole test',
    when: 'First stands in the hole',
    checks: [
      'Pumps on: pulses visible on standpipe, amplitude in spec.',
      'Gamma is not stuck at zero — you should see a background count.',
      'A dummy survey decodes. Gtot near 1.000 g.',
    ],
    fail: 'If it will not talk at 300 ft, it will not talk at 12,000 ft. Pull it.',
  },
  {
    id: 'survey',
    title: 'Station survey',
    when: 'Every connection / required MD',
    checks: [
      'Pumps off. Wait 30–90 s for the tool to settle (company procedure).',
      'QC Gtot, Btot, dip against the reference field.',
      'Accept or reject before the next stand. Do not average a bad station in.',
    ],
    fail: 'A rejected survey that still gets sent to the DD is how wells go off plan.',
  },
  {
    id: 'pooh',
    title: 'POOH / memory',
    when: 'End of run',
    checks: [
      'Download memory. Compare high-res memory to real-time.',
      'Photograph the pulser, orifice, and any wash.',
      'Write the failure / performance report while it is still in your head.',
    ],
    fail: 'Memory is the truth. Real-time is what you could get through the mud.',
  },
];

export const RigWorkflow: React.FC = () => {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<Record<string, boolean>>({});
  const current = STEPS[step];
  const key = (i: number) => `${current.id}-${i}`;
  const complete = current.checks.every((_, i) => done[key(i)]);

  return (
    <div className="instrument space-y-3">
      <div className="instrument-header mb-0">
        <div className="instrument-title-row">
          <div className="instrument-icon">
            <Wrench size={16} />
          </div>
          <div>
            <h3 className="instrument-title">Rig Workflow</h3>
            <p className="instrument-subtitle">Field sequence · shop to memory</p>
          </div>
        </div>
        <span className="instrument-chip">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setStep(i)}
            className={`instrument-btn shrink-0 px-2 ${step === i ? 'is-active' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      <div>
        <p className="text-sm font-semibold text-zinc-100">{current.title}</p>
        <p className="text-[11px] text-zinc-500">{current.when}</p>
      </div>

      <div className="space-y-1.5">
        {current.checks.map((check, i) => {
          const on = !!done[key(i)];
          return (
            <button
              key={check}
              type="button"
              onClick={() => setDone((d) => ({ ...d, [key(i)]: !d[key(i)] }))}
              className={`w-full text-left flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[12px] leading-relaxed ${
                on
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-zinc-200'
                  : 'border-white/10 bg-[#07080a] text-zinc-400'
              }`}
            >
              <CheckCircle2 size={14} className={`mt-0.5 shrink-0 ${on ? 'text-emerald-400' : 'text-zinc-600'}`} />
              {check}
            </button>
          );
        })}
      </div>

      {complete && step < STEPS.length - 1 && (
        <button type="button" onClick={() => setStep((s) => s + 1)} className="instrument-btn is-active w-full">
          Next phase
        </button>
      )}

      <div className="instrument-tip">
        <Info size={14} className="text-zinc-500 shrink-0 mt-0.5" />
        <p>{complete ? current.fail.replace(/^(A |If )/, 'Locked in. ') : current.fail}</p>
      </div>
    </div>
  );
};
