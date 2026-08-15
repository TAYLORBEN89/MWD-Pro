import React, { useState, useMemo, useEffect, Component, ReactNode, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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

const simLabRenderers: Record<string, React.FC> = {
  toolface: ToolfaceDial,
  trajectory: WellboreTrajectory,
  vibration: VibrationMonitor,
  architecture: ToolArchitecture,
  magnetic: MagneticInterference,
  formation: FormationLog,
  mudpulse: MudPulseSimulator,
  workflow: RigWorkflow,
  failure: FailureDiagnosis,
  steering: SteeringSimulator,
  geosteering: GeosteeringInterpretation,
  'advanced-logs': AdvancedLogs,
  'survey-qc': SurveyQuality,
};
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
  Sparkles,
  Activity,
  Target,
  FlaskConical
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { mwdCurriculum } from './data/mwdData';
import { simLabCatalog, getSimLabCover } from './data/simLab';
import { getModuleCover } from './data/moduleCovers';
import { CurriculumSection, QuizQuestion } from './types';
import { emailHasFullAccess, useFirebase } from './FirebaseContext';
import { CinemaAdMode } from './components/CinemaAdMode';
import { isNative } from './lib/platform';
import { getApiUrl } from './lib/api';
import { payments } from './lib/payments';
import { httpClient } from './lib/httpClient';
import { Capacitor } from '@capacitor/core';
import { requestCertificateEmail } from './lib/emailClient';

function resultDate(completedAt: unknown): Date | null {
  if (!completedAt) return null;
  const stamp = completedAt as { toDate?: () => Date };
  if (typeof stamp.toDate === 'function') return stamp.toDate();
  if (completedAt instanceof Date) return completedAt;
  if (typeof completedAt === 'number') return new Date(completedAt);
  return null;
}

function formatDay(d: Date | null) {
  if (!d) return '—';
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function avatarSrc(photoURL?: string | null, displayName?: string | null, email?: string | null) {
  if (photoURL) return photoURL;
  const name = encodeURIComponent(displayName || email || 'Trainee');
  return `https://ui-avatars.com/api/?name=${name}&background=18181b&color=e6e8eb`;
}
import { LessonReader } from './components/LessonReader';

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
        <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
          <div className="max-w-md w-full surface-card p-8 text-center">
            <div className="w-14 h-14 bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl title-display mb-4">Something went wrong</h2>
            <p className="text-zinc-400 mb-6">{errorMessage}</p>
            {errorDetails && (
              <div className="text-left surface-elevated p-4 mb-6 overflow-auto max-h-40">
                <p className="text-xs font-mono text-zinc-500">
                  Operation: {errorDetails.operationType}<br />
                  Path: {errorDetails.path}
                </p>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full btn-primary"
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
        const raw = await res.text();
        try {
          return JSON.parse(raw);
        } catch {
          throw new Error(
            `Connection failed: server returned HTML instead of JSON. Check that the app is calling ${configUrl}.`
          );
        }
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
          // Native apps use Google Play / App Store — Stripe keys are only required on web
          if (!isNative()) {
            setPurchaseError("Stripe is not configured on the server yet. Web unlock needs Stripe keys in Vercel.");
          }
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
  const showDiagnostics = Boolean(import.meta.env.DEV) || import.meta.env.VITE_SHOW_DIAGNOSTICS === 'true';

  const isStripeConfigured = useMemo(() => {
    const hasKey = typeof stripePubKey === 'string' && stripePubKey.length > 5 && !stripePubKey.includes('TODO');
    console.log("Stripe Config Check:", { stripePubKey, hasKey });
    return hasKey;
  }, [stripePubKey]);

  // Web needs Stripe; Android/iOS use Play Billing / App Store (cordova-plugin-purchase)
  const canPurchase = isNative() || isStripeConfigured;

  // Handle payment success from URL (Stripe Checkout return)
  useEffect(() => {
    console.log("Stripe Configuration Status:", {
      keyFound: !!stripePubKey,
      keyLength: stripePubKey?.length || 0,
      isConfigured: isStripeConfigured,
      canPurchase,
      isNative: isNative(),
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success') {
      const sessionId = params.get('session_id');
      // Fallback unlock if webhook is slow/missing: confirm session with API
      if (sessionId && user?.uid) {
        httpClient(getApiUrl('/api/confirm-checkout-session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userId: user.uid }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              console.warn('confirm-checkout-session failed', data);
            } else {
              console.log('Checkout confirmed; hasPurchased should update via Firestore');
            }
          })
          .catch((err) => console.warn('confirm-checkout-session error', err));
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [user?.uid, stripePubKey, isStripeConfigured, canPurchase]);

  const handlePurchase = async () => {
    if (!user) {
      login();
      return;
    }

    if (!canPurchase) {
      setPurchaseError(
        isNative()
          ? 'In-app purchases are not ready. Check Google Play product setup.'
          : 'Stripe is not configured. Add STRIPE_SECRET_KEY and VITE_STRIPE_PUBLISHABLE_KEY in Vercel.'
      );
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
  const [view, setView] = useState<'curriculum' | 'quiz' | 'results' | 'certification' | 'profile' | 'simlab'>('curriculum');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<QuizQuestion[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSimId, setActiveSimId] = useState<string | null>(null);
  const ActiveSim = activeSimId ? simLabRenderers[activeSimId] : null;
  const [certEmailStatus, setCertEmailStatus] = useState<'idle' | 'sent' | 'fail'>('idle');
  const [showCinemaAd, setShowCinemaAd] = useState(false);

  const profileLog = useMemo(() => {
    return mwdCurriculum.map((section, index) => {
      const attempts = results.filter((r) => r.sectionId === section.id);
      const best = attempts.length ? Math.max(...attempts.map((r) => r.score)) : null;
      return {
        section,
        index,
        attempts: attempts.length,
        best,
        last: attempts[0] ?? null,
        locked: index >= 3 && !hasPurchased,
      };
    });
  }, [results, hasPurchased]);

  const masteredCount = profileLog.filter((row) => (row.best ?? -1) >= 80).length;
  const bestAll = results.length ? Math.max(...results.map((r) => r.score)) : null;
  let masteredStreak = 0;
  for (const row of profileLog) {
    if ((row.best ?? -1) >= 80) masteredStreak += 1;
    else break;
  }
  const nextModule = profileLog.find((row) => (row.best ?? -1) < 80) ?? null;
  const certPass = results.find((r) => r.sectionId === 'section-15' && r.score >= 80) ?? null;
  const certIssued = certPass ? resultDate(certPass.completedAt) : null;

  const claimCertificate = () => {
    setView('certification');
    if (!user?.email || certEmailStatus !== 'idle') return;
    void requestCertificateEmail({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    }).then((ok) => setCertEmailStatus(ok ? 'sent' : 'fail'));
  };

  const openModule = (sectionId: string, locked: boolean) => {
    setView('curriculum');
    setCurrentSectionId(locked ? null : sectionId);
  };

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
        <div className="w-10 h-10 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mb-6" />
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
      <div className="min-h-screen w-full max-w-md mx-auto bg-canvas flex flex-col justify-center p-6 relative overflow-y-auto">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] right-[-30%] w-[80%] h-[50%] bg-[radial-gradient(circle_at_center,#10b981_0%,transparent_65%)] opacity-[0.12] blur-3xl" />
          <div className="absolute bottom-[-10%] left-[-20%] w-[70%] h-[40%] bg-[radial-gradient(circle_at_center,#3f3f46_0%,transparent_70%)] opacity-40 blur-2xl" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 space-y-8"
        >
          <div className="space-y-4 text-center">
            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-zinc-950 mx-auto shadow-glow">
              <GraduationCap size={32} />
            </div>
            <div className="space-y-2">
              <p className="label-caps text-emerald-400/90">Field engineer training</p>
              <h1 className="text-3xl title-display tracking-tight">Train like you&apos;re on the rig</h1>
              <p className="text-zinc-400 text-[15px] leading-relaxed max-w-sm mx-auto">
                Practical MWD skills, interactive simulators, and certification—built for directional and MWD hands.
              </p>
            </div>
          </div>

          <div className="grid gap-3">
            {[
              { icon: Target, title: '15 structured modules', body: 'From surveys to geosteering and failure diagnosis' },
              { icon: Activity, title: 'Live instrument sims', body: 'Toolface, mud pulse, vibration, and more' },
              { icon: Trophy, title: 'Prove mastery', body: 'Quizzes + professional certificate path' },
            ].map((item) => {
              const Icon = item.icon;
              return (
              <div key={item.title} className="surface-card p-4 flex gap-3 items-start text-left">
                <div className="instrument-icon shrink-0">
                  <Icon size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-100">{item.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{item.body}</p>
                </div>
              </div>
              );
            })}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => setHasStarted(true)}
              className="w-full btn-primary py-4 text-base"
            >
              Start free modules
            </button>
            <p className="text-center text-xs text-zinc-500">
              3 modules free · Full access <span className="text-zinc-300 font-medium">$49</span> lifetime
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-emerald-500/100 rounded-lg flex items-center justify-center text-zinc-950">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 className="text-base title-display">MWD Pro</h1>
            <p className="label-caps">Petro Academy</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {(currentSectionId || view !== 'curriculum') && (
            <button 
              onClick={() => { setView('curriculum'); setCurrentSectionId(null); }}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <LayoutGrid size={20} />
              <span className="text-[9px] font-medium tracking-wide">Menu</span>
            </button>
          )}
          
          {user ? (
            <button 
              onClick={() => logout()}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span className="text-[9px] font-medium tracking-wide">Logout</span>
            </button>
          ) : (
            <button 
              onClick={() => login()}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              <LogIn size={20} />
              <span className="text-[9px] font-medium tracking-wide">Login</span>
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
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
                <span className="label-caps">Curriculum</span>
              </div>

              <div className="surface-card p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="label-meta">Your Progress</span>
                  <span className="text-xs font-semibold text-emerald-400">{overallProgress}% Complete</span>
                </div>
                <div className="progress-track">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${overallProgress}%` }}
                    className="progress-fill"
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
                      className="btn-secondary py-2 px-3 text-xs"
                    >
                      <ChevronLeft size={18} /> Back
                    </button>
                    <div className="instrument-chip text-emerald-400">
                      <BookOpen size={16} />
                      <span className="text-xs font-bold uppercase tracking-wider">Module {mwdCurriculum.findIndex(s => s.id === currentSection.id) + 1}</span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h2 className="text-2xl title-display leading-tight">{currentSection.title}</h2>
                    
                    <LessonReader content={currentSection.content} />

                    <div className="space-y-10 pt-2">
                      {currentSection.id === 'section-2' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Vibration Monitor</h3>
                          <p className="body-muted">Diagnose the stand, change RPM / WOB / flow, and take a clean survey before the tool dies.</p>
                          <VibrationMonitor />
                        </div>
                      )}

                      {currentSection.id === 'section-3' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Interactive Tool Architecture</h3>
                          <p className="body-muted">Explore the internal components of a professional MWD tool string.</p>
                          <ToolArchitecture />
                        </div>
                      )}

                      {currentSection.id === 'section-4' && (
                        <div className="mt-6 space-y-8">
                          <div className="space-y-4">
                            <h3 className="text-lg title-display">Toolface Control</h3>
                            <p className="body-muted">Slide, survey, and land the curve. Minimum curvature and DLS decide if you send the well.</p>
                            <ToolfaceDial />
                          </div>
                          
                          <div className="space-y-4">
                            <h3 className="text-lg title-display">Wellbore Trajectory</h3>
                            <p className="body-muted">Read min-curvature. Call vertical, build, turn, or lateral. Open Plan when azi walks.</p>
                            <WellboreTrajectory />
                          </div>
                        </div>
                      )}

                      {currentSection.id === 'section-5' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Magnetic Interference</h3>
                          <p className="body-muted">QC Btot and dip, name the source, and keep or reject the station before the DD steers on a lie.</p>
                          <MagneticInterference />
                        </div>
                      )}

                      {currentSection.id === 'section-6' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Formation Log</h3>
                          <p className="body-muted">Call shale, sand, and lime from live GR. The crystal is behind the bit — mark tops on sensor MD.</p>
                          <FormationLog />
                        </div>
                      )}

                      {currentSection.id === 'section-7' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Mud Pulse Telemetry Simulator</h3>
                          <p className="body-muted">Simulate binary encoding and decoding of pressure pulses in the mud column.</p>
                          <MudPulseSimulator />
                        </div>
                      )}

                      {currentSection.id === 'section-8' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">MWD Operational Workflow</h3>
                          <p className="body-muted">Master the step-by-step procedures of an MWD field technician from tool prep to drilling.</p>
                          <RigWorkflow />
                        </div>
                      )}

                      {currentSection.id === 'section-9' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Failure Diagnostic Lab</h3>
                          <p className="body-muted">Analyze real-time symptoms and downhole data to diagnose common MWD failure modes.</p>
                          <FailureDiagnosis />
                        </div>
                      )}

                      {currentSection.id === 'section-10' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">3D Steering Simulator</h3>
                          <p className="body-muted">Experience directional control by adjusting toolface and switching between sliding and rotating modes.</p>
                          <SteeringSimulator />
                        </div>
                      )}

                      {currentSection.id === 'section-11' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Vibration Monitor</h3>
                          <p className="body-muted">Diagnose bounce, whirl, and stick-slip. Save the tool and take a station only when the hole is quiet.</p>
                          <VibrationMonitor />
                        </div>
                      )}

                      {currentSection.id === 'section-12' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Geosteering Interpretation</h3>
                          <p className="body-muted">Correlate real-time Gamma Ray logs with offset well data to make steering decisions and stay in-zone.</p>
                          <GeosteeringInterpretation />
                        </div>
                      )}

                      {currentSection.id === 'section-13' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Advanced LWD Sensor Dashboard</h3>
                          <p className="body-muted">Explore advanced formation evaluation logs including Resistivity, Density, and Neutron porosity.</p>
                          <AdvancedLogs />
                        </div>
                      )}

                      {currentSection.id === 'section-14' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Survey Quality Control</h3>
                          <p className="body-muted">Validate survey data by checking G-Total, B-Total, and Dip Angle against expected magnetic models.</p>
                          <SurveyQuality />
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center pt-4 pb-12">
                    <button 
                      onClick={() => startQuiz(currentSection)}
                      className="btn-primary px-8 py-4 group"
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
                    <h2 className="text-2xl title-display">Training Modules</h2>
                    <p className="body-muted">3 free modules to start. Complete the path for MWD Professional certification.</p>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    <input
                      type="text"
                      placeholder="Search modules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-12"
                    />
                  </div>

                  <div className="grid gap-5">
                    {filteredCurriculum.map((section) => {
                      const index = mwdCurriculum.findIndex((s) => s.id === section.id);
                      const isCompleted = results.some((r) => r.sectionId === section.id && r.score >= 80);
                      const isFree = index < 3;
                      const isLocked = index >= 3 && !hasPurchased;
                      return (
                        <button
                          key={section.id}
                          type="button"
                          onClick={() => {
                            if (isLocked) return;
                            setCurrentSectionId(section.id);
                          }}
                          className={`group module-photo-card ${isCompleted ? 'is-complete' : ''} ${isLocked ? 'is-locked' : ''}`}
                        >
                          <img
                            src={getModuleCover(section.id)}
                            alt=""
                            className="module-photo-bg"
                            loading="lazy"
                            decoding="async"
                          />
                          <div className="module-photo-scrim" aria-hidden />
                          {isLocked && (
                            <div className="module-photo-lock" aria-label="Locked">
                              <Lock size={16} />
                            </div>
                          )}
                          {isCompleted && !isLocked && (
                            <div className="module-photo-done" aria-label="Completed">
                              <CheckCircle2 size={18} />
                            </div>
                          )}
                          {isFree && !hasPurchased && <span className="module-photo-badge">Free</span>}
                          <div className="module-photo-body">
                            <div className="module-photo-meta">
                              <span className="text-[11px] font-semibold tracking-wide text-emerald-400">
                                Module {index + 1}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-white/30" />
                              <span className="text-[11px] text-zinc-300/90">{section.quizQuestions.length} questions</span>
                            </div>
                            <h3 className="module-photo-title">{section.title}</h3>
                            <div className="module-photo-sub">
                              {isLocked ? (
                                <span className="inline-flex items-center gap-1.5 text-zinc-400">
                                  <Lock size={12} /> Unlock with full access
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-zinc-200 transition-colors group-hover:text-emerald-300">
                                  Open module <ChevronRight size={14} />
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                    {!hasPurchased && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mt-6 paywall-card"
                      >
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                          <Sparkles size={120} />
                        </div>
                        <div className="relative z-10 space-y-6">
                          <div className="space-y-2">
                            <h3 className="text-xl title-display">Go full access</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">Unlock every module, every simulator, and the full certification path—one payment, lifetime updates.</p>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-1">
                              <p className="label-caps text-emerald-400/80">One-time payment</p>
                              <p className="text-3xl title-display">$49.00</p>
                            </div>
                            <button
                              onClick={handlePurchase}
                              disabled={isPurchasing || !canPurchase}
                              className="btn-primary disabled:cursor-not-allowed"
                            >
                              {isPurchasing ? (
                                <RefreshCcw className="w-5 h-5 animate-spin" />
                              ) : (
                                <CreditCard size={20} />
                              )}
                              {isPurchasing ? 'Processing...' : (!canPurchase ? 'Not Configured' : (isNative() ? 'Unlock with Play' : 'Unlock Now'))}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                    {filteredCurriculum.length === 0 && (
                      <div className="text-center py-12 space-y-3">
                        <div className="w-14 h-14 bg-elevated rounded-xl flex items-center justify-center text-zinc-600 mx-auto">
                          <Search size={32} />
                        </div>
                        <p className="text-zinc-500 text-sm">No modules found matching "{searchTerm}"</p>
                      </div>
                    )}
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
                <h2 className="text-xl title-display">Knowledge Check</h2>
                <span className="instrument-chip">
                  {Object.keys(quizAnswers).length} / {currentQuizQuestions.length}
                </span>
              </div>

              <div className="space-y-12">
                {currentQuizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="space-y-4">
                    <p className="font-semibold text-[15px] leading-snug text-zinc-100">{qIdx + 1}. {q.question}</p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oIdx) => {
                        const isSelected = quizAnswers[qIdx] === oIdx;
                        const isCorrect = oIdx === q.correctAnswerIndex;
                        const showFeedback = quizAnswers[qIdx] !== undefined;
                        
                        let optionClass = "quiz-option";
                        if (showFeedback && isSelected) {
                          optionClass += isCorrect ? " is-correct" : " is-wrong";
                        } else if (showFeedback && isCorrect) {
                          optionClass += " is-correct";
                        } else if (isSelected) {
                          optionClass += " is-selected";
                        }

                        return (
                          <button
                            key={oIdx}
                            onClick={() => handleAnswer(qIdx, oIdx)}
                            disabled={quizAnswers[qIdx] !== undefined}
                            className={optionClass}
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
                        className="p-4 surface-elevated text-sm text-zinc-400"
                      >
                        <p className="font-semibold text-zinc-200 mb-1">Explanation</p>
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
                <div className="w-28 h-28 bg-surface border border-white/10 rounded-2xl flex items-center justify-center text-white mx-auto">
                  <Trophy size={48} />
                </div>
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring' }}
                  className="absolute -bottom-2 -right-2 bg-emerald-500/100 text-zinc-950 w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm border-2 border-canvas"
                >
                  {Math.round((calculateScore() / currentQuizQuestions.length) * 100)}%
                </motion.div>
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl title-display">
                  {calculateScore() / currentQuizQuestions.length >= 0.8 ? 'Excellent!' : 'Good Effort!'}
                </h2>
                <p className="text-zinc-500">
                  You scored {calculateScore()} out of {currentQuizQuestions.length} questions correctly.
                </p>
              </div>

              <div className="grid gap-3">
                {currentSectionId === 'section-15' && calculateScore() / currentQuizQuestions.length >= 0.8 && (
                  <button 
                    onClick={claimCertificate}
                    className="w-full btn-primary"
                  >
                    <Trophy size={20} /> Claim Certification
                  </button>
                )}
                {currentSectionId && ['section-1','section-2','section-3'].includes(currentSectionId) && !hasPurchased && calculateScore() / currentQuizQuestions.length >= 0.6 && (
                  <div className="paywall-card space-y-3 text-left">
                    <p className="label-caps text-emerald-400/80">You&apos;re learning fast</p>
                    <h3 className="text-lg title-display">Unlock the remaining 12 modules</h3>
                    <p className="text-sm text-zinc-400 leading-relaxed">
                      Keep going with advanced telemetry, geosteering, failure labs, and full certification.
                    </p>
                    <button
                      onClick={handlePurchase}
                      disabled={isPurchasing || !canPurchase}
                      className="w-full btn-primary"
                    >
                      {isPurchasing ? 'Processing…' : (isNative() ? 'Unlock with Play — $49' : 'Unlock full access — $49')}
                    </button>
                  </div>
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
              <div className="surface-card p-8 text-center space-y-8 relative overflow-hidden border-emerald-500/20">
                {/* Certificate Background Elements */}
                <div className="absolute top-0 left-0 w-full h-2 bg-emerald-500/100" />
                <div className="absolute bottom-0 left-0 w-full h-2 bg-emerald-500/100" />
                <div className="absolute top-10 right-10 opacity-5">
                  <GraduationCap size={120} />
                </div>

                <div className="space-y-2">
                  <p className="label-caps text-emerald-400">Certificate of Completion</p>
                  <h2 className="text-2xl title-display">MWD PROFESSIONAL</h2>
                </div>

                <div className="space-y-1">
                  <p className="text-zinc-400 text-xs italic">This is to certify that</p>
                  <p className="text-xl title-display border-b border-white/10 pb-2 inline-block min-w-[200px] text-[#e6e8eb]">
                    {user?.displayName || 'Trainee'}
                  </p>
                </div>

                <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px] mx-auto">
                  Has successfully completed the comprehensive MWD curriculum and demonstrated mastery in drilling dynamics, telemetry, and formation evaluation.
                </p>

                <div className="flex justify-between items-end pt-8">
                  <div className="text-left space-y-1">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Date Issued</p>
                    <p className="hmi-readout text-xs text-[#e6e8eb]">{formatDay(certIssued)}</p>
                  </div>
                  <div className="w-14 h-14 bg-[#3ecf8e] rounded-xl flex items-center justify-center text-zinc-950">
                    <Award size={32} />
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-[#8a9099]">
                {certEmailStatus === 'sent'
                  ? 'Certificate mail sent from info@compessential.com'
                  : certEmailStatus === 'fail'
                    ? 'Certificate mail did not send. You can still screenshot this page.'
                    : 'Open this page to keep a record of the certificate.'}
              </p>
              <button 
                onClick={() => setView('profile')}
                className="w-full btn-primary"
              >
                Back to Profile
              </button>
            </motion.div>
          )}

          
          {view === 'simlab' && (
            <motion.div
              key="simlab"
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              className="space-y-6"
            >
              {!activeSimId && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-zinc-500 mb-1">
                  <FlaskConical size={16} />
                  <span className="label-caps">Sim Lab</span>
                </div>
                <h2 className="text-2xl title-display">Practice instruments</h2>
                <p className="body-muted">
                  Run every instrument here. Free labs open immediately; pro labs unlock with full access.
                </p>
              </div>
              )}

              {activeSimId && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveSimId(null)}
                      className="btn-secondary py-1.5 px-2.5 text-xs"
                    >
                      <ChevronLeft size={16} /> Labs
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const sim = simLabCatalog.find(s => s.id === activeSimId);
                        if (sim) {
                          setView('curriculum');
                          setCurrentSectionId(sim.sectionId);
                          setActiveSimId(null);
                        }
                      }}
                      className="text-[11px] font-medium text-emerald-400"
                    >
                      Related module
                    </button>
                  </div>
                  {ActiveSim && <ActiveSim />}
                </div>
              )}

              {!activeSimId && (
              <div className="grid gap-3">
                {simLabCatalog.map((sim) => {
                  const Icon = sim.icon;
                  const locked = !sim.isFree && !hasPurchased;
                  return (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          setView('curriculum');
                          setCurrentSectionId(null);
                          return;
                        }
                        setActiveSimId(sim.id);
                      }}
                      className={`module-card sim-lab-card text-left ${locked ? 'is-locked' : ''}`}
                    >
                      <img
                        src={getSimLabCover(sim.id)}
                        alt=""
                        className="sim-lab-card-bg"
                        loading="lazy"
                        decoding="async"
                      />
                      <div className="sim-lab-card-shade" aria-hidden />
                      <div className="relative z-10 flex items-center gap-4">
                        <div className="instrument-icon">
                          {locked ? <Lock size={16} /> : <Icon size={16} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="sim-lab-title font-semibold text-[15px] truncate">{sim.title}</h3>
                            {sim.isFree ? (
                              <span className="text-[10px] bg-emerald-500/15 text-emerald-400 px-2 py-0.5 rounded-full font-medium shrink-0">Free</span>
                            ) : (
                              <span className="text-[10px] bg-elevated text-zinc-300 px-2 py-0.5 rounded-full font-medium shrink-0">Pro</span>
                            )}
                          </div>
                          <p className="sim-lab-sub text-xs mt-0.5">{sim.subtitle}</p>
                        </div>
                        <ChevronRight className="sim-lab-chevron shrink-0" size={18} />
                      </div>
                    </button>
                  );
                })}
              </div>
              )}

              {!hasPurchased && (
                <div className="paywall-card space-y-4">
                  <div>
                    <h3 className="text-lg title-display">Unlock every lab</h3>
                    <p className="text-sm text-zinc-400 mt-1 leading-relaxed">
                      Get lifetime access to all simulators and the full 15-module certification track.
                    </p>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="label-caps text-emerald-400/80">One-time</p>
                      <p className="text-2xl title-display">$49</p>
                    </div>
                    <button
                      onClick={handlePurchase}
                      disabled={isPurchasing || !canPurchase}
                      className="btn-primary disabled:cursor-not-allowed"
                    >
                      {isPurchasing ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <CreditCard size={18} />}
                      {isPurchasing ? 'Processing…' : (isNative() ? 'Play Unlock' : 'Unlock')}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-zinc-400">
                  <UserIcon size={16} />
                  <span className="label-caps">Tour</span>
                </div>
                {user && (
                  <span className={`hmi-lamp ${hasPurchased ? 'text-[#3ecf8e]' : 'text-[#8a9099]'}`}>
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: hasPurchased ? '#3ecf8e' : '#8a9099' }}
                    />
                    {hasPurchased ? 'Full access' : 'Free lane'}
                  </span>
                )}
              </div>

              {user ? (
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <img
                      src={avatarSrc(user.photoURL, user.displayName, user.email)}
                      alt={user.displayName || 'User'}
                      className="h-14 w-14 object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <h3 className="text-xl title-display text-[#e6e8eb]">{user.displayName || 'Trainee'}</h3>
                      <p className="truncate text-[12px] text-[#8a9099]">{user.email}</p>
                    </div>
                  </div>

                  <div className="h-px overflow-hidden bg-[#1d2026]">
                    <div className="h-px bg-[#3ecf8e]" style={{ width: `${overallProgress}%` }} />
                  </div>

                  <div className="grid grid-cols-4 gap-x-2 gap-y-1 border-y border-[#1d2026] py-2">
                    {[
                      { l: 'Mastered', v: `${masteredCount}`, u: `/ ${mwdCurriculum.length}` },
                      { l: 'Best', v: bestAll === null ? '—' : `${bestAll}`, u: bestAll === null ? '' : '%' },
                      { l: 'Streak', v: `${masteredStreak}`, u: '' },
                      { l: 'Badges', v: `${badges.length}`, u: '' },
                    ].map((row) => (
                      <div key={row.l}>
                        <p className="label-caps">{row.l}</p>
                        <p className="hmi-readout text-[18px] leading-none text-[#e6e8eb]">
                          {row.v}
                          <span className="ml-0.5 text-[10px] text-[#5c636e]">{row.u}</span>
                        </p>
                      </div>
                    ))}
                  </div>

                  {nextModule && (
                    <button
                      type="button"
                      onClick={() => openModule(nextModule.section.id, nextModule.locked)}
                      className="flex w-full items-center gap-3 border border-[#1d2026] border-l-2 border-l-[#3aa8b8] py-2.5 pl-3 pr-2 text-left"
                    >
                      <span className="hmi-readout w-6 text-[11px] text-[#5c636e]">
                        {String(nextModule.index + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="label-caps text-[#3aa8b8]">Continue</span>
                        <span className="mt-0.5 block truncate text-[13px] font-semibold text-[#e6e8eb]">
                          {nextModule.section.title}
                        </span>
                      </span>
                      <ChevronRight size={16} className="shrink-0 text-[#5c636e]" />
                    </button>
                  )}

                  <div className="space-y-2">
                    <p className="label-caps">Certificate</p>
                    {certPass ? (
                      <button
                        type="button"
                        onClick={claimCertificate}
                        className="flex w-full items-center gap-3 border border-[#1d2026] py-2.5 pl-3 pr-2 text-left"
                      >
                        <Trophy size={16} className="shrink-0 text-[#3ecf8e]" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-[13px] font-semibold text-[#e6e8eb]">MWD Professional</span>
                          <span className="hmi-readout text-[11px] text-[#8a9099]">Issued {formatDay(certIssued)}</span>
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-[#5c636e]" />
                      </button>
                    ) : (
                      <p className="text-[12px] leading-relaxed text-[#8a9099]">
                        Pass the Final Assessment at 80% to issue the certificate.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="label-caps">Badge rack · {badges.length} / {mwdCurriculum.length}</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {profileLog.map((row) => {
                        const earned = badges.some((b) => b.id === `badge-${row.section.id}`);
                        return (
                          <button
                            key={row.section.id}
                            type="button"
                            onClick={() => openModule(row.section.id, row.locked)}
                            className="flex flex-col items-center gap-1 border border-[#1d2026] py-2"
                            title={row.section.title}
                          >
                            <span className={`hmi-readout text-[11px] ${earned ? 'text-[#3ecf8e]' : 'text-[#5c636e]'}`}>
                              {String(row.index + 1).padStart(2, '0')}
                            </span>
                            {earned ? (
                              <Award size={12} className="text-[#3ecf8e]" />
                            ) : (
                              <span className="h-3 w-3 border border-[#2a2d33]" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="label-caps">Well log</p>
                    {profileLog.map((row) => {
                      const send = (row.best ?? -1) >= 80;
                      const rail = row.locked
                        ? '#2a2d33'
                        : send
                          ? '#3ecf8e'
                          : row.attempts
                            ? '#d4a017'
                            : '#2a2d33';
                      return (
                        <button
                          key={row.section.id}
                          type="button"
                          onClick={() => openModule(row.section.id, row.locked)}
                          className="flex w-full items-center gap-3 border-b border-[#1d2026] py-2 pl-2 text-left"
                          style={{ borderLeft: `2px solid ${rail}` }}
                        >
                          <span className="hmi-readout w-6 text-[11px] text-[#5c636e]">
                            {String(row.index + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className={`block truncate text-[13px] ${row.locked ? 'text-[#8a9099]' : 'text-[#e6e8eb]'}`}>
                              {row.section.title}
                            </span>
                            <span className="hmi-readout text-[10px] text-[#5c636e]">
                              {row.locked
                                ? 'Locked'
                                : row.attempts
                                  ? `${row.attempts} run${row.attempts === 1 ? '' : 's'} · ${formatDay(resultDate(row.last?.completedAt))}`
                                  : 'Not started'}
                            </span>
                          </span>
                          <span
                            className={`hmi-readout shrink-0 text-[13px] ${
                              send ? 'text-[#3ecf8e]' : row.attempts ? 'text-[#d4a017]' : 'text-[#5c636e]'
                            }`}
                          >
                            {row.locked ? <Lock size={12} /> : row.best === null ? '—' : row.best}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {emailHasFullAccess(user.email) && (
                    <button
                      type="button"
                      onClick={() => setShowCinemaAd(true)}
                      className="hmi-key w-full"
                    >
                      <PlayCircle size={14} /> Studio
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4 py-8">
                  <p className="text-[13px] text-[#e6e8eb]">Sign in to track the tour.</p>
                  <p className="text-[12px] leading-relaxed text-[#8a9099]">
                    Quiz scores, badges, and the certificate stay on this well.
                  </p>
                  <button type="button" onClick={() => login()} className="hmi-key is-on" style={{ borderColor: '#3ecf8e99', color: '#3ecf8e' }}>
                    <LogIn size={14} /> Sign in with Google
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto px-3 py-2.5 flex justify-around items-center bg-canvas/90 backdrop-blur-xl border-t border-white/5 z-50">
        <button 
          onClick={() => { setView('curriculum'); setCurrentSectionId(null); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === 'curriculum' || view === 'quiz' || view === 'results' ? 'text-emerald-400' : 'text-zinc-500'}`}
        >
          <BookOpen size={20} />
          <span className="text-[10px] font-medium tracking-wide">Learn</span>
        </button>
        <button 
          onClick={() => { setView('simlab'); setCurrentSectionId(null); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === 'simlab' ? 'text-emerald-400' : 'text-zinc-500'}`}
        >
          <FlaskConical size={20} />
          <span className="text-[10px] font-medium tracking-wide">Sim Lab</span>
        </button>
        <button 
          onClick={() => setView('profile')}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === 'profile' || view === 'certification' ? 'text-emerald-400' : 'text-zinc-500'}`}
        >
          <UserIcon size={20} />
          <span className="text-[10px] font-medium tracking-wide">Profile</span>
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
          <div className="surface-card border border-red-500/20 p-4 flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="text-red-500 w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-zinc-100 text-xs font-medium leading-tight">{purchaseError}</p>
            </div>
            <button 
              onClick={() => setPurchaseError(null)}
              className="text-zinc-500 hover:text-zinc-100 text-xs font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}
