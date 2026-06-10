import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ClipboardCheck, Shield, Wrench, Play, CheckCircle2, AlertCircle } from 'lucide-react';

const workflowSteps = [
  {
    id: 'prep',
    title: 'Tool Preparation',
    description: 'Assemble BHA, install batteries, and perform function tests.',
    tasks: ['Install Lithium Batteries', 'Verify Pulser Gap', 'Program Tool Memory', 'Function Test Sensors'],
    icon: Wrench,
    color: 'text-blue-500',
    bg: 'bg-blue-500/10'
  },
  {
    id: 'rigup',
    title: 'Surface Rig Up',
    description: 'Install pressure transducers and route cables to the MWD shack.',
    tasks: ['Install Standpipe Transducer', 'Route Cables Safely', 'Ground EM Stakes', 'Test Telemetry Link'],
    icon: Shield,
    color: 'text-amber-500',
    bg: 'bg-amber-500/10'
  },
  {
    id: 'rih',
    title: 'Run In Hole (RIH)',
    description: 'Monitor tool power and confirm pulses as the BHA is lowered.',
    tasks: ['Monitor Tool Resets', 'Confirm Surface Pulses', 'Log Depth Events', 'Verify Gamma Response'],
    icon: Play,
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10'
  },
  {
    id: 'drilling',
    title: 'Drilling Operations',
    description: 'Monitor real-time surveys, toolface, and formation logs.',
    tasks: ['QC Every Survey', 'Monitor Toolface Stability', 'Track Gamma Trends', 'Log Connection Times'],
    icon: ClipboardCheck,
    color: 'text-purple-500',
    bg: 'bg-purple-500/10'
  }
];

export const RigWorkflow: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedTasks, setCompletedTasks] = useState<string[]>([]);

  const toggleTask = (task: string) => {
    setCompletedTasks(prev => 
      prev.includes(task) ? prev.filter(t => t !== task) : [...prev, task]
    );
  };

  const currentStep = workflowSteps[activeStep];
  const allTasksDone = currentStep.tasks.every(t => completedTasks.includes(t));

  return (
    <div className="bg-white rounded-3xl p-8 border border-zinc-200 shadow-xl">
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-2xl font-bold text-zinc-900 font-display">MWD Operational Workflow</h3>
            <p className="text-sm text-zinc-500">Master the step-by-step procedures of an MWD field technician.</p>
          </div>
          <div className="flex gap-1">
            {workflowSteps.map((_, i) => (
              <div 
                key={i} 
                className={`h-1.5 w-8 rounded-full transition-all duration-500 ${
                  i <= activeStep ? 'bg-zinc-900' : 'bg-zinc-200'
                }`}
              />
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-4 space-y-2">
            {workflowSteps.map((step, i) => (
              <button
                key={step.id}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left p-4 rounded-2xl transition-all flex items-center gap-4 border ${
                  activeStep === i 
                    ? 'bg-zinc-900 border-zinc-900 text-white shadow-lg' 
                    : 'bg-zinc-50 border-zinc-100 text-zinc-500 hover:bg-zinc-100'
                }`}
              >
                <div className={`p-2 rounded-xl ${activeStep === i ? 'bg-white/10' : step.bg}`}>
                  <step.icon size={20} className={activeStep === i ? 'text-white' : step.color} />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Step 0{i + 1}</p>
                  <p className="font-bold">{step.title}</p>
                </div>
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-8 bg-zinc-50 rounded-3xl p-6 border border-zinc-100">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-zinc-900">{currentStep.title}</h4>
                  <p className="text-sm text-zinc-600 leading-relaxed">{currentStep.description}</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest">Required Tasks</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {currentStep.tasks.map((task) => (
                      <button
                        key={task}
                        onClick={() => toggleTask(task)}
                        className={`p-4 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                          completedTasks.includes(task)
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                            : 'bg-white border-zinc-200 text-zinc-600 hover:border-zinc-400'
                        }`}
                      >
                        {completedTasks.includes(task) ? (
                          <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
                        ) : (
                          <div className="w-[18px] h-[18px] rounded-full border-2 border-zinc-200 shrink-0" />
                        )}
                        <span className="text-sm font-medium">{task}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {allTasksDone && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 size={24} />
                      <div>
                        <p className="font-bold">Step Complete!</p>
                        <p className="text-xs opacity-90">You have successfully completed all tasks for this phase.</p>
                      </div>
                    </div>
                    {activeStep < workflowSteps.length - 1 && (
                      <button 
                        onClick={() => setActiveStep(prev => prev + 1)}
                        className="bg-white text-emerald-600 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-50 transition-colors"
                      >
                        Next Step
                      </button>
                    )}
                  </motion.div>
                )}

                {!allTasksDone && (
                  <div className="bg-zinc-200/50 p-4 rounded-2xl flex items-center gap-3 text-zinc-500">
                    <AlertCircle size={20} />
                    <p className="text-xs font-medium">Complete all tasks above to proceed to the next operational phase.</p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
