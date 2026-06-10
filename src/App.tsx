import React, { useState, useMemo, useEffect, Component, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  ToolfaceDial, 
  WellboreTrajectory, 
  ToolArchitecture, 
  MagneticInterference, 
  VibrationMonitor,
  MudPulseSimulator,
  FormationLog,
  RigWorkflow,
  FailureDiagnosis,
  SteeringSimulator,
  GeosteeringInterpretation,
  AdvancedLogs,
  SurveyQuality
} from './components/visualizations';
import { 
  BookOpen, 
  GraduationCap, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Trophy,
  User as UserIcon,
  LayoutGrid,
  LogOut,
  LogIn,
  History,
  Award,
  AlertCircle,
  RefreshCcw,
  PlayCircle,
  Search,
  Lock,
  CreditCard,
  Sparkles
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { mwdCurriculum } from './data/mwdData';
import { CurriculumSection, QuizQuestion } from './types';
import { useFirebase } from './FirebaseContext';
import { CinemaAdMode } from './components/CinemaAdMode';
import { isNative } from './lib/platform';
import { getApiUrl } from './lib/api';
import { payments } from './lib/payments';
import { httpClient } from './lib/httpClient';
import { Capacitor } from '@capacitor/core';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: any;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      let errorMessage = "An unexpected error occurred.";
      let errorDetails = null;

      try {
        const parsed = JSON.parse(this.state.error.message);
        if (parsed.error) {
          errorMessage = parsed.error;
          errorDetails = parsed;
        }
      } catch (e) {
        errorMessage = this.state.error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center border border-red-100">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Something went wrong</h2>
            <p className="text-slate-600 mb-6">{errorMessage}</p>
            {errorDetails && (
              <div className="text-left bg-slate-50 rounded-lg p-4 mb-6 overflow-auto max-h-40">
                <p className="text-xs font-mono text-slate-500">
                  Operation: {errorDetails.operationType}<br />
                  Path: {errorDetails.path}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw className="w-5 h-5" />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const { user, login, logout, saveQuizResult, results, loading, hasPurchased, badges } = useFirebase();
  const [hasStarted, setHasStarted] = useState(false);
  const prevUserRef = useRef(user);
  const [stripePubKey, setStripePubKey] = useState<string | null>(null);
  const [serverTime, setServerTime] = useState<string | null>(null);
  const [serverConfig, setServerConfig] = useState<{hasPubKey: boolean, hasSecKey: boolean, hasAppUrl: boolean} | null>(null);
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading');

  // Unregister Service Worker to prevent caching issues in preview
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        for (let registration of registrations) {
          registration.unregister();
        }
      });
    }
  }, []);

  // Fetch config from backend
  useEffect(() => {
    // Initialize Native Store if applicable
    if (isNative() && user?.uid) {
      payments.initializeNativeStore(user.uid, () => {
        // Success callback - maybe show a toast or refresh state
        console.log("Native purchase successful and verified");
      });
    }

    // Ensure specific headers for Android CORS handshake
    const configUrl = getApiUrl(`/api/config?t=${Date.now()}`);
    console.log("Fetching config from:", configUrl);

    httpClient(configUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(async res => {
        console.log(`API Response: ${res.status} ${res.statusText}`);
        if (!res.ok) {
          const text = await res.text().catch(() => "No body");
          throw new Error(`HTTP error! status: ${res.status}. Body: ${text.substring(0, 50)}`);
        }
        return res.json();
      })
      .then(data => {
        console.log("Stripe Config Received:", data);
        setApiStatus('connected');
        
        if (data.config) {
          setServerConfig(data.config);
        }
        
        // Ensure the key is valid before saving it
        if (data.stripePublishableKey && data.stripePublishableKey.length > 5) {
          setStripePubKey(data.stripePublishableKey);
          console.log("Stripe Key set to:", data.stripePublishableKey);
        } else {
          console.error("The server returned an empty or invalid Stripe key.");
          setPurchaseError("Stripe keys missing on server. Check AI Studio Secrets.");
        }
        
        if (data.serverTime) {
          setServerTime(data.serverTime);
        }
      })
      .catch(err => {
        console.error("CRITICAL: Failed to fetch Stripe config:", err);
        setApiStatus('error');
        setPurchaseError(`Connection Failed: ${err.message || "Unknown Error"}`);
      });
  }, [user]);

  // Stripe initialization
  const stripePromise = useMemo(() => {
    return stripePubKey ? loadStripe(stripePubKey) : null;
  }, [stripePubKey]);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // Check if Stripe keys are configured
  const isStripeConfigured = useMemo(() => {
    const hasKey = typeof stripePubKey === 'string' && stripePubKey.length > 5 && !stripePubKey.includes('TODO');
    console.log("Stripe Config Check:", { stripePubKey, hasKey });
    return hasKey;
  }, [stripePubKey]);

  // Handle payment success from URL
  useEffect(() => {
    console.log("Stripe Configuration Status:", {
      keyFound: !!stripePubKey,
      keyLength: stripePubKey?.length || 0,
      isConfigured: isStripeConfigured
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      // Access is handled by Firebase listener, but we can show a toast here if we wanted
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handlePurchase = async () => {
    if (!user) {
      login();
      return;
    }

    setPurchaseError(null);
    
    payments.startPurchase({
      userId: user.uid,
      userEmail: user.email || '',
      stripePromise,
      onSuccess: () => {
        // Access is usually handled by Firebase listeners, 
        // but we can provide immediate feedback here
        console.log("Purchase process completed successfully");
      },
      onError: (err) => setPurchaseError(err),
      onProgress: (loading) => setIsPurchasing(loading)
    });
  };

  // Reset to landing page on logout
  useEffect(() => {
    if (prevUserRef.current && !user && hasStarted) {
      setHasStarted(false);
      setView('curriculum');
      setCurrentSectionId(null);
    }
    prevUserRef.current = user;
  }, [user, hasStarted]);

  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [view, setView] = useState<'curriculum' | 'quiz' | 'results' | 'certification' | 'profile'>('curriculum');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<QuizQuestion[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [showCinemaAd, setShowCinemaAd] = useState(false);

  const overallProgress = useMemo(() => {
    if (!results || results.length === 0) return 0;
    const completedUniqueSections = new Set(results.filter(r => r.score >= 80).map(r => r.sectionId));
    return Math.round((completedUniqueSections.size / mwdCurriculum.length) * 100);
  }, [results]);

  const filteredCurriculum = useMemo(() => {
    if (!searchTerm) return mwdCurriculum;
    return mwdCurriculum.filter(s => 
      s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

  const currentSection = useMemo(() => {
    return mwdCurriculum.find(s => s.id === currentSectionId);
  }, [currentSectionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-16 h-16 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6" />
        <h2 className="text-white font-medium mb-2">Initializing Systems...</h2>
        <p className="text-zinc-500 text-sm">Synchronizing downhole data</p>
      </div>
    );
  }

  const startQuiz = (section: CurriculumSection) => {
    if (!section.quizQuestions || section.quizQuestions.length === 0) {
      alert("Quiz content for this section is coming soon!");
      return;
    }
    
    // Shuffle questions AND their options to prevent fixed answer positions
    const shuffledQuestions = [...section.quizQuestions]
      .sort(() => Math.random() - 0.5)
      .map(q => {
        // Map options to objects that track if they are correct
        const optionsWithMetadata = q.options.map((option, index) => ({
          text: option,
          isCorrect: index === q.correctAnswerIndex
        }));
        
        // Shuffle the options array
        const shuffledOptions = [...optionsWithMetadata].sort(() => Math.random() - 0.5);
        
        // Find the new index of the correct answer
        const newCorrectIndex = shuffledOptions.findIndex(opt => opt.isCorrect);
        
        return {
          ...q,
          options: shuffledOptions.map(opt => opt.text),
          correctAnswerIndex: newCorrectIndex
        };
      });

    setCurrentQuizQuestions(shuffledQuestions);
    setQuizAnswers({});
    setQuizSubmitted(false);
    setView('quiz');
  };

  const handleAnswer = (questionIndex: number, answerIndex: number) => {
    if (quizSubmitted) return;
    setQuizAnswers(prev => ({ ...prev, [questionIndex]: answerIndex }));
  };

  const calculateScore = () => {
    let correct = 0;
    currentQuizQuestions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctAnswerIndex) correct++;
    });
    return correct;
  };

  const handleViewResults = async () => {
    const score = Math.round((calculateScore() / currentQuizQuestions.length) * 100);
    if (user && currentSection) {
      await saveQuizResult(
        currentSection.id,
        currentSection.title,
        score,
        calculateScore(),
        currentQuizQuestions.length
      );
    }
    setView('results');
  };

  if (!hasStarted) {
    return (
      <div className="min-h-screen w-full max-w-md mx-auto bg-[#0a0a0a] flex flex-col items-center justify-center p-8 text-center relative overflow-y-auto">
        {/* Atmospheric Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,transparent_70%)] opacity-50" />
          <div className="absolute top-[20%] right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_50%_50%,#10b981_0%,transparent_70%)] opacity-10 blur-[100px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 space-y-12"
        >
          <div className="space-y-6">
            <div className="w-24 h-24 bg-emerald-500 rounded-[2rem] flex items-center justify-center text-zinc-900 mx-auto shadow-[0_0_50px_rgba(16,185,129,0.3)]">
              <GraduationCap size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-bold tracking-tighter text-white font-display">MWD PRO</h1>
              <p className="text-zinc-500 font-medium tracking-widest uppercase text-xs">Petro Academy Training</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-zinc-400 text-lg leading-relaxed">
              Master the art of <span className="text-white font-semibold">Measurement While Drilling</span> with our professional certification program.
            </p>
          </div>

          <button 
            onClick={() => setHasStarted(true)}
            className="w-full py-5 bg-emerald-500 text-zinc-900 rounded-2xl font-bold text-lg shadow-xl shadow-emerald-500/20 active:scale-95 transition-all hover:bg-emerald-400"
          >
            Get Started
          </button>

          <p className="text-zinc-600 text-[10px] uppercase tracking-widest font-bold">
            Version 4.2.15 • Professional Edition
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen w-full max-w-md mx-auto bg-zinc-50 flex flex-col relative overflow-hidden shadow-2xl">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 p-4 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-zinc-100 max-w-md mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white shadow-lg">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight font-display">MWD Pro</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-semibold">Petro Academy</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(currentSectionId || view !== 'curriculum') && (
            <button 
              onClick={() => { setView('curriculum'); setCurrentSectionId(null); }}
              className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-zinc-900 transition-colors"
            >
              <LayoutGrid size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">Menu</span>
            </button>
          )}
          
          {user ? (
            <button 
              onClick={() => logout()}
              className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-red-600 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">Logout</span>
            </button>
          ) : (
            <button 
              onClick={() => login()}
              className="flex flex-col items-center gap-0.5 text-zinc-400 hover:text-emerald-600 transition-colors"
            >
              <LogIn size={20} />
              <span className="text-[8px] font-bold uppercase tracking-tighter">Login</span>
            </button>
          )}
        </div>
      </header>

      <main className="flex-1 p-6 pt-24 overflow-y-auto pb-24">
        <AnimatePresence mode="wait">
          {view === 'curriculum' && (
            <motion.div 
              key="curriculum"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <BookOpen size={16} />
                <span className="text-xs font-bold uppercase tracking-widest font-display">Curriculum</span>
              </div>

              {/* Overall Progress Bar */}
              <div className="bg-white p-4 rounded-2xl border border-zinc-100 shadow-sm mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-bold text-zinc-500 uppercase tracking-tighter">Your Progress</span>
                  <span className="text-xs font-bold text-emerald-600">{overallProgress}% Complete</span>
                </div>
                <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    className="h-full bg-emerald-500"
                  />
                </div>
              </div>

              {currentSection ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setCurrentSectionId(null)}
                      className="flex items-center gap-2 text-sm font-semibold text-zinc-500 hover:text-zinc-900 transition-colors bg-zinc-100 px-4 py-2 rounded-full"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
                      <BookOpen size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Module {mwdCurriculum.findIndex(s => s.id === currentSection.id) + 1}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-3xl font-bold tracking-tight text-zinc-900 leading-tight font-display">{currentSection.title}</h2>
                    
                    <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-zinc-100">
                      <div className="prose prose-zinc prose-headings:font-bold prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-4 prose-p:text-zinc-600 prose-p:leading-relaxed prose-li:text-zinc-600 prose-blockquote:border-l-4 prose-blockquote:border-emerald-500 prose-blockquote:bg-emerald-50 prose-blockquote:py-4 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:not-italic prose-hr:border-zinc-100 max-w-none">
                        <ReactMarkdown>{currentSection.content}</ReactMarkdown>
                      </div>

                      {currentSection.id === 'section-2' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Interactive Vibration Monitor</h3>
                          <p className="text-sm text-zinc-500">Simulate different downhole vibration and shock regimes to understand their impact on tool health.</p>
                          <VibrationMonitor />
                        </div>
                      )}

                      {currentSection.id === 'section-3' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Interactive Tool Architecture</h3>
                          <p className="text-sm text-zinc-500">Explore the internal components of a professional MWD tool string.</p>
                          <ToolArchitecture />
                        </div>
                      )}

                      {currentSection.id === 'section-4' && (
                        <div className="mt-12 space-y-12">
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold font-display text-zinc-900">Interactive Toolface Dial</h3>
                            <p className="text-sm text-zinc-500">Practice orienting the tool using Gravity and Magnetic references.</p>
                            <ToolfaceDial />
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-xl font-bold font-display text-zinc-900">Wellbore Trajectory Visualization</h3>
                            <p className="text-sm text-zinc-500">See how Inclination and Azimuth define the 3D path of the well.</p>
                            <WellboreTrajectory />
                          </div>
                        </div>
                      )}

                      {currentSection.id === 'section-5' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Magnetic Interference Simulator</h3>
                          <p className="text-sm text-zinc-500">Visualize how axial and cross-axial magnetic distortion affects your survey vector.</p>
                          <MagneticInterference />
                        </div>
                      )}

                      {currentSection.id === 'section-6' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Real-Time Formation Log</h3>
                          <p className="text-sm text-zinc-500">Practice identifying lithology changes using Gamma Ray API units as you "drill" downhole.</p>
                          <FormationLog />
                        </div>
                      )}

                      {currentSection.id === 'section-7' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Mud Pulse Telemetry Simulator</h3>
                          <p className="text-sm text-zinc-500">Simulate binary encoding and decoding of pressure pulses in the mud column.</p>
                          <MudPulseSimulator />
                        </div>
                      )}

                      {currentSection.id === 'section-8' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">MWD Operational Workflow</h3>
                          <p className="text-sm text-zinc-500">Master the step-by-step procedures of an MWD field technician from tool prep to drilling.</p>
                          <RigWorkflow />
                        </div>
                      )}

                      {currentSection.id === 'section-9' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Failure Diagnostic Lab</h3>
                          <p className="text-sm text-zinc-500">Analyze real-time symptoms and downhole data to diagnose common MWD failure modes.</p>
                          <FailureDiagnosis />
                        </div>
                      )}

                      {currentSection.id === 'section-10' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">3D Steering Simulator</h3>
                          <p className="text-sm text-zinc-500">Experience directional control by adjusting toolface and switching between sliding and rotating modes.</p>
                          <SteeringSimulator />
                        </div>
                      )}

                      {currentSection.id === 'section-11' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Vibration & Dynamics Monitor</h3>
                          <p className="text-sm text-zinc-500">Monitor axial, lateral, and torsional vibration to identify downhole dysfunctions like stick-slip and whirl.</p>
                          <VibrationMonitor />
                        </div>
                      )}

                      {currentSection.id === 'section-12' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Geosteering Interpretation</h3>
                          <p className="text-sm text-zinc-500">Correlate real-time Gamma Ray logs with offset well data to make steering decisions and stay in-zone.</p>
                          <GeosteeringInterpretation />
                        </div>
                      )}

                      {currentSection.id === 'section-13' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Advanced LWD Sensor Dashboard</h3>
                          <p className="text-sm text-zinc-500">Explore advanced formation evaluation logs including Resistivity, Density, and Neutron porosity.</p>
                          <AdvancedLogs />
                        </div>
                      )}

                      {currentSection.id === 'section-14' && (
                        <div className="mt-12 space-y-8">
                          <h3 className="text-xl font-bold font-display text-zinc-900">Survey Quality Control</h3>
                          <p className="text-sm text-zinc-500">Validate survey data by checking G-Total, B-Total, and Dip Angle against expected magnetic models.</p>
                          <SurveyQuality />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center pt-4 pb-12">
                    <button 
                      onClick={() => startQuiz(currentSection)}
                      className="group flex items-center gap-3 btn-hardware px-10 py-5 shadow-xl shadow-emerald-500/20"
                    >
                      <PlayCircle size={24} />
                      Start Module Quiz
                      <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-6">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight font-display">Training Modules</h2>
                    <p className="text-sm text-zinc-500">Complete all 15 sections to earn your MWD Certification.</p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Search modules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border border-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-sm"
                    />
                  </div>
                  
                  <div className="grid gap-4">
                    {filteredCurriculum.map((section) => {
                      const index = mwdCurriculum.findIndex(s => s.id === section.id);
                      const isCompleted = results.some(r => r.sectionId === section.id && r.score >= 80);
                      
                      return (
                        <button 
                          key={section.id}
                          onClick={() => {
                            const isFree = index < 3;
                            if (!isFree && !hasPurchased) {
                              // Show paywall or alert
                              return;
                            }
                            setCurrentSectionId(section.id);
                          }}
                          className={`group relative hardware-card p-6 border border-white/5 hover:border-emerald-500/50 transition-all text-left overflow-hidden active:scale-[0.98] ${isCompleted ? 'border-emerald-500/30' : ''} ${index >= 3 && !hasPurchased ? 'opacity-75 grayscale-[0.5]' : ''}`}
                        >
                          <div className="flex items-center gap-5">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold transition-colors shrink-0 font-display ${isCompleted ? 'bg-emerald-500 text-zinc-900' : 'bg-white/5 text-zinc-500 group-hover:bg-emerald-500 group-hover:text-zinc-900'}`}>
                              {index >= 3 && !hasPurchased ? <Lock size={20} /> : (isCompleted ? <CheckCircle2 size={24} /> : index + 1)}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors font-display">{section.title}</h3>
                                {index < 3 && !hasPurchased && (
                                  <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-widest">Free</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Module {index + 1}</span>
                                <span className="w-1 h-1 bg-zinc-700 rounded-full" />
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">{section.quizQuestions.length} Questions</span>
                              </div>
                            </div>
                            {index >= 3 && !hasPurchased ? (
                              <div className="text-zinc-700">
                                <Lock size={20} />
                              </div>
                            ) : (
                              <ChevronRight className="text-zinc-700 group-hover:text-emerald-500 transition-colors" size={20} />
                            )}
                          </div>
                        </button>
                      );
                    })}
                    
                    {!hasPurchased && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-8 p-8 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2.5rem] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Sparkles size={120} />
                        </div>
                        <div className="relative z-10 space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-2xl font-bold font-display tracking-tight">Unlock Full Access</h3>
                            <p className="text-indigo-100 text-sm leading-relaxed">Get lifetime access to all 15 modules, interactive simulators, and earn your professional MWD certification.</p>
                            
                            {!isStripeConfigured && (
                              <div className="mt-4 bg-black/40 border border-amber-500/20 rounded-2xl overflow-hidden">
                                <div className="bg-amber-500/10 px-4 py-2 border-b border-amber-500/10 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                    <span className="text-[10px] font-bold text-amber-200 uppercase tracking-widest">Configuration Status</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                                    <span className="text-[9px] font-mono text-zinc-500 uppercase">{apiStatus}</span>
                                  </div>
                                </div>
                                <div className="p-4 space-y-4">
                                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                                    Stripe keys or Backend URL not configured correctly in AI Studio Secrets. 
                                    {isNative() && !import.meta.env.VITE_APP_URL && (
                                      <span className="block mt-1 text-red-400 font-bold">
                                        CRITICAL: VITE_APP_URL is missing! Native apps must have a valid backend URL baked into the build.
                                      </span>
                                    )}
                                    <span className="block mt-1">
                                      Please add <b>VITE_STRIPE_PUBLISHABLE_KEY</b>, <b>STRIPE_SECRET_KEY</b>, and <b>VITE_APP_URL</b> to the <b>Secrets</b> panel in AI Studio Settings, then Save and wait for the app to rebuild.
                                    </span>
                                  </p>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-black/20 p-2 rounded-lg border border-zinc-800/50">
                                      <div className="text-[8px] text-zinc-500 uppercase mb-1 italic font-serif tracking-tight">Backend Link</div>
                                      <div className={`text-[10px] font-mono ${apiStatus === 'connected' ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {apiStatus === 'connected' ? 'ACTIVE' : 'OFFLINE'}
                                      </div>
                                    </div>
                                    <div className="bg-black/20 p-2 rounded-lg border border-zinc-800/50">
                                      <div className="text-[8px] text-zinc-500 uppercase mb-1 italic font-serif tracking-tight">Stripe Key</div>
                                      <div className={`text-[10px] font-mono ${stripePubKey ? 'text-emerald-400' : 'text-red-400'}`}>
                                        {stripePubKey ? (stripePubKey.startsWith('pk_') ? 'VALID' : 'INVALID') : 'MISSING'}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="px-2 py-1.5 bg-black/30 rounded-lg border border-zinc-800/30 overflow-hidden">
                                    <div className="text-[7px] text-zinc-500 uppercase mb-1 font-bold">Target API URL:</div>
                                    <div className="text-[9px] font-mono text-zinc-400 truncate">
                                      {getApiUrl('/config')}
                                    </div>
                                    {import.meta.env.VITE_APP_URL && (
                                       <div className="text-[7px] text-emerald-500/50 mt-1 uppercase font-bold">Base: {import.meta.env.VITE_APP_URL}</div>
                                    )}
                                  </div>

                                  {/* Diagnostics Section */}
                                  <div className="mt-2 p-3 bg-black/40 rounded-xl border border-zinc-700/30">
                                    <div className="text-[7px] text-zinc-500 uppercase mb-2 tracking-widest font-bold flex justify-between">
                                      <span>Server Diagnostics</span>
                                      {import.meta.env.VITE_APP_URL?.includes('-pre-') && (
                                        <span className="text-amber-500">PROD/SHARED MODE</span>
                                      )}
                                    </div>
                                    
                                    {import.meta.env.VITE_APP_URL?.includes('-pre-') && (
                                      <div className="mb-2 p-1.5 bg-amber-900/20 rounded border border-amber-500/30 text-[8px] text-amber-200 leading-tight">
                                        Note: The "-pre-" URL only updates when you click "Share". If changes aren't appearing, freshen the deployment.
                                      </div>
                                    )}
                                    <div className="flex gap-2 mb-2">
                                      <button 
                                        onClick={async () => {
                                          try {
                                            const url = getApiUrl('/ping');
                                            console.log("Diag: Pinging", url);
                                            const res = await httpClient(url);
                                            const data = await res.json();
                                            console.log("Diag: Success!", data);
                                            alert(`SUCCESS!\nServer Time: ${data.time}\nStatus: ${res.status}`);
                                          } catch (err: any) {
                                            console.error("Diag: Failed", err);
                                            alert(`FAILED: ${err.message}`);
                                          }
                                        }}
                                        className="text-[9px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                                      >
                                        Ping API
                                      </button>
                                      <button 
                                        onClick={() => {
                                          const report = {
                                            native: isNative(),
                                            baseUrl: import.meta.env.VITE_APP_URL,
                                            platform: Capacitor.getPlatform(),
                                            configUrl: getApiUrl('/config')
                                          };
                                          console.table(report);
                                          alert(JSON.stringify(report, null, 2));
                                        }}
                                        className="text-[9px] px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded border border-zinc-700 transition-colors"
                                      >
                                        Env Debug
                                      </button>
                                    </div>
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-400">PUB_KEY on Server</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${stripePubKey ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-400">SEC_KEY on Server</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${serverConfig?.hasSecKey ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[9px] text-zinc-400">APP_URL on Server</span>
                                        <div className={`w-1.5 h-1.5 rounded-full ${serverConfig?.hasAppUrl ? 'bg-emerald-500' : 'bg-red-500'}`} />
                                      </div>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2 pt-1">
                                    <button 
                                      onClick={() => window.open(window.location.href, '_blank')}
                                      className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white py-2 rounded-xl text-[10px] font-bold transition-all border border-zinc-700/50"
                                    >
                                      Open in New Tab
                                    </button>
                                    <button 
                                      onClick={() => window.location.reload()}
                                      className="flex-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 py-2 rounded-xl text-[10px] font-bold transition-all border border-amber-500/20"
                                    >
                                      Force Refresh
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="text-[10px] uppercase tracking-widest font-bold text-indigo-200">One-time payment</p>
                              <p className="text-3xl font-bold font-display">$49.00</p>
                            </div>
                            
                            <button 
                              onClick={handlePurchase}
                              disabled={isPurchasing || !isStripeConfigured}
                              className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold shadow-xl hover:bg-indigo-50 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {isPurchasing ? (
                                <RefreshCcw className="w-5 h-5 animate-spin" />
                              ) : (
                                <CreditCard size={20} />
                              )}
                              {isPurchasing ? 'Processing...' : (!isStripeConfigured ? 'Not Configured' : 'Unlock Now')}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {filteredCurriculum.length === 0 && (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-300 mx-auto">
                          <Search size={32} />
                        </div>
                        <p className="text-zinc-500 text-sm">No modules found matching "{searchTerm}"</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'quiz' && (
            <motion.div 
              key="quiz"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-display">Knowledge Check</h2>
                <span className="text-xs font-bold bg-zinc-100 px-3 py-1 rounded-full">
                  {Object.keys(quizAnswers).length} / {currentQuizQuestions.length}
                </span>
              </div>

              <div className="space-y-12">
                {currentQuizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="space-y-4">
                    <p className="font-bold text-lg leading-snug">{qIdx + 1}. {q.question}</p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = quizAnswers[qIdx] === oIdx;
                        const isCorrect = oIdx === q.correctAnswerIndex;
                        const showFeedback = quizAnswers[qIdx] !== undefined;
                        
                        let bgColor = "bg-white";
                        let borderColor = "border-zinc-100";
                        let textColor = "text-zinc-900";

                        if (showFeedback && isSelected) {
                          if (isCorrect) {
                            bgColor = "bg-emerald-50";
                            borderColor = "border-emerald-200";
                            textColor = "text-emerald-700";
                          } else {
                            bgColor = "bg-red-50";
                            borderColor = "border-red-200";
                            textColor = "text-red-700";
                          }
                        } else if (showFeedback && isCorrect && quizAnswers[qIdx] !== undefined) {
                          bgColor = "bg-emerald-50";
                          borderColor = "border-emerald-200";
                          textColor = "text-emerald-700";
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleAnswer(qIdx, oIdx)}
                            disabled={quizAnswers[qIdx] !== undefined}
                            className={`w-full p-4 text-left rounded-2xl border-2 transition-all flex items-center justify-between ${bgColor} ${borderColor} ${textColor} ${!showFeedback ? 'hover:border-zinc-300 active:scale-[0.98]' : ''}`}
                          >
                            <span className="font-medium">{opt}</span>
                            {showFeedback && isSelected && (
                              isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />
                            )}
                            {showFeedback && !isSelected && isCorrect && quizAnswers[qIdx] !== undefined && (
                              <CheckCircle2 size={18} />
                            )}
                          </button>
                        );
                      })}
                    </div>
                    
                    {quizAnswers[qIdx] !== undefined && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="p-4 bg-zinc-100 rounded-2xl text-sm text-zinc-600 border border-zinc-200"
                      >
                        <p className="font-bold text-zinc-900 mb-1">Explanation</p>
                        {q.explanation}
                      </motion.div>
                    )}
                  </div>
                ))}
              </div>

              <button 
                onClick={handleViewResults}
                disabled={Object.keys(quizAnswers).length < currentQuizQuestions.length}
                className="w-full btn-primary"
              >
                View Results
              </button>
            </motion.div>
          )}

          {view === 'results' && (
            <motion.div 
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8 py-8"
            >
              <div className="relative inline-block">
                <div className="w-32 h-32 bg-zinc-900 rounded-full flex items-center justify-center text-white mx-auto shadow-2xl">
                  <Trophy size={48} />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="absolute -bottom-2 -right-2 bg-emerald-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold border-4 border-white"
                >
                  {Math.round((calculateScore() / currentQuizQuestions.length) * 100)}%
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold font-display">
                  {calculateScore() / currentQuizQuestions.length >= 0.8 ? 'Excellent!' : 'Good Effort!'}
                </h2>
                <p className="text-zinc-500">
                  You scored {calculateScore()} out of {currentQuizQuestions.length} questions correctly.
                </p>
              </div>

              <div className="grid gap-3">
                {currentSectionId === 'section-15' && calculateScore() / currentQuizQuestions.length >= 0.8 && (
                  <button 
                    onClick={() => setView('certification')}
                    className="w-full bg-emerald-600 text-white p-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                  >
                    <Trophy size={20} /> Claim Certification
                  </button>
                )}
                <button 
                  onClick={() => { setView('curriculum'); setCurrentSectionId(null); }}
                  className="w-full btn-primary"
                >
                  Continue Learning
                </button>
                <button 
                  onClick={() => { setQuizAnswers({}); setQuizSubmitted(false); setView('quiz'); }}
                  className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                  <RotateCcw size={18} /> Retake Quiz
                </button>
              </div>
            </motion.div>
          )}

          {view === 'certification' && (
            <motion.div 
              key="certification"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8 py-12"
            >
              <div className="bg-white rounded-[2.5rem] p-10 shadow-2xl border-8 border-emerald-500/10 text-center space-y-8 relative overflow-hidden">
                {/* Certificate Background Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500" />
                <div className="absolute bottom-0 left-0 w-full h-2 bg-emerald-500" />
                <div className="absolute top-10 right-10 opacity-5">
                  <GraduationCap size={120} />
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-emerald-600">Certificate of Completion</p>
                  <h2 className="text-3xl font-bold font-display tracking-tight text-zinc-900">MWD PROFESSIONAL</h2>
                </div>

                <div className="space-y-1">
                  <p className="text-zinc-400 text-xs italic">This is to certify that</p>
                  <p className="text-2xl font-bold font-display border-b-2 border-zinc-100 pb-2 inline-block min-w-[200px]">
                    {user?.displayName || 'Trainee'}
                  </p>
                </div>

                <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px] mx-auto">
                  Has successfully completed the comprehensive MWD curriculum and demonstrated mastery in drilling dynamics, telemetry, and formation evaluation.
                </p>

                <div className="flex justify-between items-end pt-8">
                  <div className="text-left space-y-1">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Date Issued</p>
                    <p className="text-xs font-bold">{new Date().toLocaleDateString()}</p>
                  </div>
                  <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center text-white rotate-12 shadow-xl">
                    <Award size={32} />
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setView('profile')}
                className="w-full btn-primary"
              >
                Back to Profile
              </button>
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <UserIcon size={16} />
                <span className="text-xs font-bold uppercase tracking-widest font-display">My Profile</span>
              </div>

              {user ? (
                <div className="space-y-8">
                  <div className="flex items-center gap-4 p-6 apple-card">
                    <img 
                      src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}`} 
                      alt={user.displayName || 'User'} 
                      className="w-16 h-16 rounded-2xl shadow-lg"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h3 className="text-xl font-bold font-display">{user.displayName}</h3>
                      <p className="text-sm text-zinc-500">{user.email}</p>
                    </div>
                  </div>

                  {/* Badges Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Award size={16} />
                      <h4 className="text-xs font-bold uppercase tracking-widest font-display">Earned Badges</h4>
                    </div>
                    {badges && badges.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {badges.map((badge) => (
                          <div key={badge.id} className="p-4 apple-card text-center space-y-2 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 mx-auto">
                              <Award size={24} />
                            </div>
                            <h5 className="text-[10px] font-bold font-display uppercase tracking-tight line-clamp-1">{badge.title}</h5>
                            <p className="text-[8px] text-zinc-400 leading-tight line-clamp-2">{badge.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-zinc-100 rounded-3xl border border-dashed border-zinc-300">
                        <p className="text-sm text-zinc-400 font-medium whitespace-pre-line">
                          {`You haven't earned any badges yet.\nPass a module quiz with 80%+ to earn one!`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <History size={16} />
                      <h4 className="text-xs font-bold uppercase tracking-widest font-display">Quiz History</h4>
                    </div>

                    {results.length > 0 ? (
                      <div className="space-y-3">
                        {results.map((result) => (
                          <div key={result.id} className="p-4 apple-card flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm">{result.sectionTitle}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">
                                {result.completedAt?.toDate?.() ? result.completedAt.toDate().toLocaleDateString() : 'Just now'}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.score >= 80 ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-100 text-zinc-600'}`}>
                              {result.score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-zinc-100 rounded-3xl border border-dashed border-zinc-300">
                        <p className="text-sm text-zinc-400 font-medium">No quiz results yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Award size={16} />
                      <h4 className="text-xs font-bold uppercase tracking-widest font-display">Certifications</h4>
                    </div>
                    {results.some(r => r.sectionId === 'section-15' && r.score >= 80) ? (
                      <button 
                        onClick={() => setView('certification')}
                        className="w-full p-4 apple-card flex items-center gap-4 border-2 border-emerald-200 bg-emerald-50/50"
                      >
                        <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <Trophy size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-emerald-900 font-display">MWD Professional</p>
                          <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Verified Certification</p>
                        </div>
                      </button>
                    ) : (
                      <div className="p-8 text-center bg-zinc-100 rounded-3xl border border-dashed border-zinc-300">
                        <p className="text-sm text-zinc-400 font-medium">Complete the Final Assessment with 80%+ to earn your certificate.</p>
                      </div>
                    )}
                  </div>

                  {/* Creator Tools Section */}
                  <div className="space-y-4 pt-10 pb-6">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Sparkles size={16} />
                      <h4 className="text-xs font-bold uppercase tracking-widest font-display">Creator Tools</h4>
                    </div>
                    <button 
                      onClick={() => setShowCinemaAd(true)}
                      className="w-full p-4 apple-card flex items-center justify-between group hover:border-emerald-500/50 transition-all bg-white"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-zinc-900 rounded-xl flex items-center justify-center text-white">
                          <PlayCircle size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-sm">Cinematic Ad Mode</p>
                          <p className="text-[10px] text-zinc-400 font-medium uppercase tracking-tight">Generate promo video footage</p>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-zinc-300 group-hover:text-emerald-500 transition-colors" />
                    </button>
                    <p className="text-[10px] text-zinc-400 text-center italic leading-relaxed">
                      Use this mode to record professional promo videos. <br />
                      Best recorded in 16:9 or 9:16 aspect ratio.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-6 py-12">
                  <div className="w-20 h-20 bg-zinc-100 rounded-3xl flex items-center justify-center text-zinc-300 mx-auto">
                    <UserIcon size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold font-display">Sign in to track progress</h3>
                    <p className="text-sm text-zinc-500 max-w-[200px] mx-auto">Save your quiz results and earn your MWD Professional certification.</p>
                  </div>
                  <button 
                    onClick={() => login()}
                    className="btn-primary flex items-center justify-center gap-2 mx-auto"
                  >
                    <LogIn size={18} /> Sign in with Google
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-4 apple-blur border-t border-zinc-100 flex justify-around items-center">
        <button 
          onClick={() => { setView('curriculum'); setCurrentSectionId(null); }}
          className={`flex flex-col items-center gap-1 ${view === 'curriculum' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <BookOpen size={20} />
          <span className="text-[10px] font-bold uppercase font-display">Learn</span>
        </button>
        <button 
          onClick={() => setView('profile')}
          className={`flex flex-col items-center gap-1 ${view === 'profile' ? 'text-zinc-900' : 'text-zinc-400'}`}
        >
          <UserIcon size={20} />
          <span className="text-[10px] font-bold uppercase font-display">Profile</span>
        </button>
      </nav>
    </div>
      {/* Cinema Ad Fullscreen Overlay */}
      {showCinemaAd && (
        <CinemaAdMode onComplete={() => setShowCinemaAd(false)} />
      )}

      {/* Purchase Error Toast */}
      {purchaseError && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-white border border-red-500/20 p-4 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="text-red-500 w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-zinc-900 text-xs font-medium leading-tight">{purchaseError}</p>
            </div>
            <button 
              onClick={() => setPurchaseError(null)}
              className="text-zinc-500 hover:text-zinc-900 text-xs font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
