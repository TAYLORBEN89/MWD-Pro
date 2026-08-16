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
  FlaskConical
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { mwdCurriculum } from './data/mwdData';
import { simLabCatalog, getSimLabCover } from './data/simLab';
import { getModuleCover } from './data/moduleCovers';
import { CurriculumSection, QuizQuestion } from './types';
import { useFirebase } from './FirebaseContext';
import { CinemaAdMode } from './components/CinemaAdMode';
import { App as CapApp } from '@capacitor/app';
import { isNative } from './lib/platform';
import { getApiUrl } from './lib/api';
import { payments } from './lib/payments';
import { httpClient } from './lib/httpClient';
import { loadUiSession, saveUiSession, clearUiSession } from './lib/session';
import type { AppView } from './lib/session';
import { requestCertificateEmail } from './lib/emailClient';
import { bearerHeaders } from './lib/authToken';

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

function firstName(displayName?: string | null, email?: string | null) {
  const fromName = displayName?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = email?.split('@')[0];
  return fromEmail || null;
}

function timeHello() {
  const h = new Date().getHours();
  if (h < 5) return 'Welcome back';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  if (h < 22) return 'Good evening';
  return 'Welcome back';
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
  const [hasStarted, setHasStarted] = useState(() => Boolean(loadUiSession()?.hasStarted));
  const prevUserRef = useRef(user);
  const envStripeKey = (import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string | undefined)?.trim() || null;
  const [stripePubKey, setStripePubKey] = useState<string | null>(
    envStripeKey && envStripeKey.length > 5 && !envStripeKey.includes('TODO') ? envStripeKey : null
  );
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
        // Firestore listener updates hasPurchased after server verify
      });
    }

    const configUrl = getApiUrl(`/api/config?t=${Date.now()}`);

    httpClient(configUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      }
    })
      .then(async res => {
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
        setApiStatus('connected');
        
        if (data.config) {
          setServerConfig(data.config);
        }
        
        if (data.stripePublishableKey && data.stripePublishableKey.length > 5) {
          setStripePubKey(data.stripePublishableKey);
        } else if (!isNative() && !envStripeKey) {
          console.error('The server returned an empty or invalid Stripe key.');
        }
        
        if (data.serverTime) {
          setServerTime(data.serverTime);
        }
      })
      .catch(err => {
        console.error('Failed to fetch /api/config:', err);
        setApiStatus('error');
      });
  }, [user]);

  // Stripe initialization
  const stripePromise = useMemo(() => {
    return stripePubKey ? loadStripe(stripePubKey) : null;
  }, [stripePubKey]);

  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [gateNotice, setGateNotice] = useState<string | null>(null);
  const skipHistoryPush = useRef(true);

  // Check if Stripe keys are configured
  const showDiagnostics = Boolean(import.meta.env.DEV) || import.meta.env.VITE_SHOW_DIAGNOSTICS === 'true';

  const isStripeConfigured = useMemo(() => {
    return typeof stripePubKey === 'string' && stripePubKey.length > 5 && !stripePubKey.includes('TODO');
  }, [stripePubKey]);

  // Web needs Stripe; Android/iOS use Play Billing / App Store (cordova-plugin-purchase)
  const canPurchase = isNative() || isStripeConfigured;

  // Handle payment success from URL (Stripe Checkout return)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('payment') === 'success' && params.get('session_id')) {
      sessionStorage.setItem('mwdCheckoutSession', params.get('session_id') as string);
      window.history.replaceState({ mwd: true }, document.title, window.location.pathname);
    }

    const sessionId = sessionStorage.getItem('mwdCheckoutSession');
    if (sessionId && user?.uid) {
      void bearerHeaders().then((auth) =>
        httpClient(getApiUrl('/api/confirm-checkout-session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...auth },
          body: JSON.stringify({ sessionId, userId: user.uid }),
        })
          .then(async (res) => {
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              console.warn('confirm-checkout-session failed', data);
              return;
            }
            sessionStorage.removeItem('mwdCheckoutSession');
          })
          .catch((err) => console.warn('confirm-checkout-session error', err))
      );
    }
  }, [user?.uid, stripePubKey, isStripeConfigured, canPurchase]);

  const handlePurchase = async () => {
    if (!user) {
      sessionStorage.setItem('mwdPendingPurchase', '1');
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
        /* unlock arrives via the user snapshot */
      },
      onError: (err) => setPurchaseError(err),
      onProgress: (loading) => setIsPurchasing(loading)
    });
  };

  useEffect(() => {
    if (!user || !canPurchase) return;
    if (sessionStorage.getItem('mwdPendingPurchase') !== '1') return;
    sessionStorage.removeItem('mwdPendingPurchase');
    void handlePurchase();
  }, [user?.uid, canPurchase]);

  // Reset to landing page on logout
  useEffect(() => {
    if (prevUserRef.current && !user && hasStarted) {
      setHasStarted(false);
      setView('curriculum');
      setCurrentSectionId(null);
      setActiveSimId(null);
      clearUiSession();
    }
    prevUserRef.current = user;
  }, [user, hasStarted]);

  const [currentSectionId, setCurrentSectionId] = useState<string | null>(() => loadUiSession()?.currentSectionId ?? null);
  const [view, setView] = useState<AppView>(() => loadUiSession()?.view ?? 'curriculum');
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>(() => loadUiSession()?.quizAnswers ?? {});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [currentQuizQuestions, setCurrentQuizQuestions] = useState<QuizQuestion[]>(() => {
    const saved = loadUiSession()?.quizQuestions;
    return Array.isArray(saved) ? (saved as QuizQuestion[]) : [];
  });
  const [quizIndex, setQuizIndex] = useState(() => loadUiSession()?.quizIndex ?? 0);

  const [searchTerm, setSearchTerm] = useState('');
  const [activeSimId, setActiveSimId] = useState<string | null>(() => loadUiSession()?.activeSimId ?? null);
  const ActiveSim = activeSimId ? simLabRenderers[activeSimId] : null;
  const [certEmailStatus, setCertEmailStatus] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const [showCinemaAd, setShowCinemaAd] = useState(false);

  useEffect(() => {
    setCertEmailStatus('idle');
  }, [user?.uid]);

  useEffect(() => {
    if (isNative()) return;
    const saved = loadUiSession();
    if (!saved?.hasStarted) return;
    history.replaceState({ mwd: 'root' }, '');
    if (saved.view !== 'curriculum' || saved.currentSectionId || saved.activeSimId) {
      history.pushState({ mwd: 'child' }, '');
    }
    skipHistoryPush.current = true;
  }, []);

  useEffect(() => {
    if ((view === 'quiz' || view === 'results') && currentQuizQuestions.length === 0) {
      setView('curriculum');
    }
  }, [view, currentQuizQuestions.length]);

  useEffect(() => {
    if (!hasStarted) {
      clearUiSession();
      return;
    }
    saveUiSession({
      hasStarted,
      view,
      currentSectionId,
      activeSimId,
      quizIndex,
      quizAnswers,
      quizQuestions: view === 'quiz' || view === 'results' ? currentQuizQuestions : null,
    });
  }, [hasStarted, view, currentSectionId, activeSimId, quizIndex, quizAnswers, currentQuizQuestions]);

  const goBackInApp = () => {
    if (showCinemaAd) {
      setShowCinemaAd(false);
      return true;
    }
    if (view === 'certification') {
      setView('profile');
      return true;
    }
    if (view === 'quiz' || view === 'results') {
      setView('curriculum');
      return true;
    }
    if (view === 'simlab' && activeSimId) {
      setActiveSimId(null);
      return true;
    }
    if (view === 'simlab' || view === 'profile') {
      setView('curriculum');
      setCurrentSectionId(null);
      return true;
    }
    if (currentSectionId) {
      setCurrentSectionId(null);
      return true;
    }
    if (hasStarted) {
      setHasStarted(false);
      return true;
    }
    return false;
  };

  useEffect(() => {
    const onPop = () => {
      skipHistoryPush.current = true;
      goBackInApp();
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [hasStarted, view, currentSectionId, activeSimId, showCinemaAd]);

  useEffect(() => {
    if (isNative()) return;
    if (skipHistoryPush.current) {
      skipHistoryPush.current = false;
      return;
    }
    if (!hasStarted && !showCinemaAd) return;
    history.pushState({ mwd: true }, '');
  }, [hasStarted, view, currentSectionId, activeSimId, showCinemaAd]);

  useEffect(() => {
    if (!isNative()) return;
    const sub = CapApp.addListener('backButton', () => {
      const handled = goBackInApp();
      if (!handled) void CapApp.exitApp();
    });
    return () => {
      void sub.then((handle) => handle.remove());
    };
  }, [hasStarted, view, currentSectionId, activeSimId, showCinemaAd]);

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

  const certIssuedAt = useMemo(() => {
    const passing = results
      .filter((r) => r.sectionId === 'section-15' && r.score >= 80)
      .map((r) => resultDate(r.completedAt))
      .filter((d): d is Date => !!d);
    if (!passing.length) return null;
    return new Date(Math.min(...passing.map((d) => d.getTime())));
  }, [results]);

  const claimCertificate = async () => {
    setView('certification');
    if (!user?.email || certEmailStatus === 'sending' || certEmailStatus === 'sent') return;
    setCertEmailStatus('sending');
    const ok = await requestCertificateEmail({
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
    });
    setCertEmailStatus(ok ? 'sent' : 'failed');
  };

  const overallProgress = useMemo(() => {
    if (!results || results.length === 0) return 0;
    const completedUniqueSections = new Set(results.filter(r => r.score >= 80).map(r => r.sectionId));
    return Math.round((completedUniqueSections.size / mwdCurriculum.length) * 100);
  }, [results]);

  const filteredCurriculum = useMemo(() => {
    if (!searchTerm) return mwdCurriculum;
    return mwdCurriculum.filter(s =>
      s.title.toLowerCase().includes(searchTerm.toLowerCase())
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
      setGateNotice('Quiz content for this section is coming soon.');
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
    setQuizIndex(0);
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
    if (!currentQuizQuestions.length) {
      setView('results');
      return;
    }
    const score = Math.round((calculateScore() / currentQuizQuestions.length) * 100);
    if (user && currentSection) {
      try {
        await saveQuizResult(
          currentSection.id,
          currentSection.title,
          score,
          calculateScore(),
          currentQuizQuestions.length
        );
      } catch (err) {
        console.error('Quiz score could not be saved:', err);
      }
    }
    setView('results');
  };

  if (!hasStarted) {
    return (
      <div className="landing-screen">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] bg-[radial-gradient(circle_at_50%_50%,#1a1a1a_0%,transparent_70%)] opacity-50" />
          <div className="absolute top-[20%] right-[-20%] w-[80%] h-[80%] bg-[radial-gradient(circle_at_50%_50%,#10b981_0%,transparent_70%)] opacity-10 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="landing-inner"
        >
          <div className="space-y-6">
            <div className="w-20 h-20 bg-emerald-500/100 rounded-2xl flex items-center justify-center text-zinc-950 mx-auto shadow-glow sm:w-24 sm:h-24">
              <GraduationCap size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="landing-title">MWD PRO</h1>
              <p className="label-caps">Petro Academy Training</p>
            </div>
          </div>

          <div className="space-y-4">
            <p className="landing-copy">
              Master the art of <span className="text-white font-semibold">Measurement While Drilling</span> with our professional certification program.
            </p>
          </div>

          <button
            onClick={() => {
              skipHistoryPush.current = false;
              setHasStarted(true);
            }}
            className="w-full btn-primary py-4 text-base"
          >
            Get Started
          </button>

          <p className="label-caps text-zinc-600">
            Version 1.11 • Professional Edition
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app-shell">
      {/* Header */}
      <header className="app-header">
        <div className="app-rail app-header-row">
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
              onClick={() => { setView('curriculum'); setCurrentSectionId(null); setActiveSimId(null); }}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-zinc-100 transition-colors"
            >
              <LayoutGrid size={20} />
              <span className="app-chrome-label">Menu</span>
            </button>
          )}
          
          {user ? (
            <button 
              onClick={() => logout()}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-red-400 transition-colors"
            >
              <LogOut size={20} />
              <span className="app-chrome-label">Logout</span>
            </button>
          ) : (
            <button 
              onClick={() => login()}
              className="flex flex-col items-center gap-0.5 text-zinc-500 hover:text-emerald-400 transition-colors"
            >
              <LogIn size={20} />
              <span className="app-chrome-label">Login</span>
            </button>
          )}
        </div>
        </div>
      </header>

      <main className="app-main app-rail">
        {gateNotice && (
          <div className="mb-4 surface-card border border-emerald-500/25 p-3 flex items-start gap-3">
            <p className="flex-1 text-sm text-zinc-200 leading-relaxed">{gateNotice}</p>
            <button
              type="button"
              className="text-xs font-semibold text-zinc-400 hover:text-zinc-100"
              onClick={() => setGateNotice(null)}
            >
              Dismiss
            </button>
          </div>
        )}
        {gateNotice && !hasPurchased && (
          <div className="mb-4">
            <button type="button" className="btn-primary w-full" onClick={() => (user ? handlePurchase() : login())}>
              {user ? 'Unlock full access — $49' : 'Sign in to unlock'}
            </button>
          </div>
        )}
        <AnimatePresence mode="wait">
          {view === 'curriculum' && (
            <motion.div 
              key="curriculum"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              {currentSection ? (
                <>
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
              </>
              ) : null}

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
                          <h3 className="text-lg title-display">Lab · Advanced LWD Sensor Dashboard</h3>
                          <p className="body-muted">Explore advanced formation evaluation logs including Resistivity, Density, and Neutron porosity.</p>
                          <AdvancedLogs />
                        </div>
                      )}

                      {currentSection.id === 'section-14' && (
                        <div className="mt-6 space-y-4">
                          <h3 className="text-lg title-display">Lab · Survey Quality Control</h3>
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
                  <div className="home-hero">
                  <div className="space-y-2">
                    <p className="label-caps text-[#8a9099]">{timeHello()}</p>
                    <h2 className="page-title">
                      Hello{firstName(user?.displayName, user?.email) ? `, ${firstName(user?.displayName, user?.email)}` : ''}
                    </h2>
                    <p className="page-lede">
                      {(() => {
                        const next = profileLog.find((row) => (row.best ?? -1) < 80);
                        if (!user) {
                          return 'Three modules are open. Open a card, read the lesson, then take the quiz. Sign in from Profile if you want scores to stick.';
                        }
                        if (!next) {
                          return 'Tour is complete. Reopen any card to review, or run a Sim Lab.';
                        }
                        if (next.locked) {
                          return 'You finished the free lane. Unlock modules 4–15 below, or reopen 1–3 to review.';
                        }
                        return `Continue Module ${next.index + 1} — ${next.section.title}. Read it, use the lab if there is one, then pass the quiz at 80%.`;
                      })()}
                    </p>
                  </div>

                  <div className="surface-card p-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="label-meta">Your Progress</span>
                      <span className="hmi-readout text-xs text-[#3ecf8e]">
                        {masteredCount} / {mwdCurriculum.length}
                      </span>
                    </div>
                    <div className="progress-track">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${overallProgress}%` }}
                        className="progress-fill"
                      />
                    </div>
                  </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="module-search" className="sr-only">Search modules</label>
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
                    <input
                      id="module-search"
                      type="search"
                      placeholder="Search modules..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="input-field pl-12"
                    />
                  </div>

                  <div className="module-grid">
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
                            if (isLocked) {
                              if (!user) {
                                setGateNotice('Sign in to unlock the full 15-module course.');
                                login();
                              } else {
                                handlePurchase();
                              }
                              return;
                            }
                            setSearchTerm('');
                            setCurrentSectionId(section.id);
                          }}
                          className={`group module-photo-card ${isCompleted ? 'is-complete' : ''} ${isLocked ? 'is-locked' : ''}`}
                          aria-label={`${isLocked ? 'Locked. ' : ''}Module ${index + 1}: ${section.title}`}
                        >
                          <img
                            src={getModuleCover(section.id)}
                            alt=""
                            role="presentation"
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
                              <span className="font-semibold tracking-wide text-emerald-400">
                                Module {index + 1}
                              </span>
                              <span className="h-1 w-1 rounded-full bg-white/30" />
                              <span className="text-zinc-300/90">{section.quizQuestions.length} questions</span>
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
                        <button type="button" className="btn-secondary text-sm" onClick={() => setSearchTerm('')}>
                          Clear search
                        </button>
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
                <h2 className="text-xl title-display">
                  {currentSectionId === 'section-15' ? 'Final Assessment' : 'Knowledge Check'}
                </h2>
                <span className="instrument-chip">
                  {quizIndex + 1} / {currentQuizQuestions.length}
                </span>
              </div>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${currentQuizQuestions.length ? ((quizIndex + 1) / currentQuizQuestions.length) * 100 : 0}%` }}
                />
              </div>

              {currentQuizQuestions[quizIndex] && (() => {
                const q = currentQuizQuestions[quizIndex];
                const qIdx = quizIndex;
                const isFinal = currentSectionId === 'section-15';
                const isSelected = quizAnswers[qIdx] !== undefined;
                const showFeedback = !isFinal && isSelected;
                return (
                  <div key={q.id} className="space-y-4">
                    <p className="font-semibold text-[15px] leading-snug text-zinc-100">{qIdx + 1}. {q.question}</p>
                    <div className="grid gap-2">
                      {q.options.map((opt, oIdx) => {
                        const picked = quizAnswers[qIdx] === oIdx;
                        const isCorrect = oIdx === q.correctAnswerIndex;
                        let optionClass = 'quiz-option';
                        if (showFeedback && picked) {
                          optionClass += isCorrect ? ' is-correct' : ' is-wrong';
                        } else if (showFeedback && isCorrect) {
                          optionClass += ' is-correct';
                        } else if (picked) {
                          optionClass += ' is-selected';
                        }
                        return (
                          <button
                            key={oIdx}
                            type="button"
                            onClick={() => handleAnswer(qIdx, oIdx)}
                            disabled={isFinal ? false : isSelected}
                            className={optionClass}
                          >
                            <span className="font-medium">{opt}</span>
                            {showFeedback && picked && (isCorrect ? <CheckCircle2 size={18} /> : <XCircle size={18} />)}
                            {showFeedback && !picked && isCorrect && <CheckCircle2 size={18} />}
                          </button>
                        );
                      })}
                    </div>
                    {showFeedback && (
                      <div className="p-4 surface-elevated text-sm text-zinc-400">
                        <p className="font-semibold text-zinc-200 mb-1">Explanation</p>
                        {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex gap-2">
                <button
                  type="button"
                  className="btn-secondary flex-1"
                  disabled={quizIndex <= 0}
                  onClick={() => setQuizIndex((i) => Math.max(0, i - 1))}
                >
                  Previous
                </button>
                {quizIndex < currentQuizQuestions.length - 1 ? (
                  <button
                    type="button"
                    className="btn-primary flex-1"
                    disabled={quizAnswers[quizIndex] === undefined}
                    onClick={() => setQuizIndex((i) => i + 1)}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleViewResults}
                    disabled={Object.keys(quizAnswers).length < currentQuizQuestions.length}
                    className="btn-primary flex-1"
                  >
                    View Results
                  </button>
                )}
              </div>
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
                {currentSectionId === 'section-15' && currentQuizQuestions.length > 0 && calculateScore() / currentQuizQuestions.length >= 0.8 && (
                  <button 
                    onClick={() => { void claimCertificate(); }}
                    className="w-full btn-primary"
                  >
                    <Trophy size={20} /> Claim Certification
                  </button>
                )}
                {!user && (
                  <p className="text-xs text-zinc-500">
                    Sign in from Profile if you want this score saved.
                  </p>
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
                  onClick={() => { if (currentSection) startQuiz(currentSection); }}
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
                  <p className="text-xl title-display border-b border-white/10 pb-2 inline-block min-w-[200px]">
                    {user?.displayName || 'Trainee'}
                  </p>
                </div>

                <p className="text-zinc-500 text-sm leading-relaxed max-w-[240px] mx-auto">
                  Has successfully completed the comprehensive MWD curriculum and demonstrated mastery in drilling dynamics, telemetry, and formation evaluation.
                </p>

                <div className="flex justify-between items-end pt-8">
                  <div className="text-left space-y-1">
                    <p className="text-[8px] font-bold uppercase tracking-widest text-zinc-400">Date Issued</p>
                    <p className="text-xs font-bold">{formatDay(certIssuedAt ?? new Date())}</p>
                  </div>
                  <div className="w-14 h-14 bg-emerald-500/100 rounded-xl flex items-center justify-center text-zinc-950 rotate-6">
                    <Award size={32} />
                  </div>
                </div>
              </div>

              <p className="text-center text-xs text-zinc-500">
                {certEmailStatus === 'sending' && 'Sending your certificate email…'}
                {certEmailStatus === 'sent' && `Confirmation sent to ${user?.email} from info@compessential.com`}
                {certEmailStatus === 'failed' && 'Could not send the certificate email. Open your certificate from Profile to try again.'}
                {certEmailStatus === 'idle' && 'Your certificate is ready on this device.'}
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
                <h2 className="page-title">Practice instruments</h2>
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
                        if (!sim) return;
                        const moduleIndex = mwdCurriculum.findIndex((s) => s.id === sim.sectionId);
                        if (moduleIndex >= 3 && !hasPurchased) {
                          setGateNotice(
                            `${mwdCurriculum[moduleIndex]?.title ?? 'That module'} unlocks with full access.`
                          );
                          return;
                        }
                        setView('curriculum');
                        setCurrentSectionId(sim.sectionId);
                        setActiveSimId(null);
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
              <div className="sim-lab-grid">
                {simLabCatalog.map((sim) => {
                  const Icon = sim.icon;
                  const locked = !sim.isFree && !hasPurchased;
                  return (
                    <button
                      key={sim.id}
                      type="button"
                      onClick={() => {
                        if (locked) {
                          setGateNotice(`Unlock ${sim.title} with full access.`);
                          return;
                        }
                        setGateNotice(null);
                        setActiveSimId(sim.id);
                      }}
                      className={`module-card sim-lab-card text-left ${locked ? 'is-locked' : ''}`}
                      aria-label={`${locked ? 'Locked. ' : ''}${sim.title}`}
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
                            <h3 className="sim-lab-title font-semibold truncate">{sim.title}</h3>
                            {sim.isFree ? (
                              <span className="sim-lab-pill bg-emerald-500/15 text-emerald-400">Free</span>
                            ) : (
                              <span className="sim-lab-pill bg-elevated text-zinc-300">Pro</span>
                            )}
                          </div>
                          <p className="sim-lab-sub mt-0.5">{sim.subtitle}</p>
                        </div>
                        <ChevronRight className="sim-lab-chevron shrink-0" size={18} />
                      </div>
                    </button>
                  );
                })}
              </div>
              )}

              {!hasPurchased && !activeSimId && (
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
              className="space-y-8"
            >
              <div className="flex items-center gap-2 text-zinc-400 mb-2">
                <UserIcon size={16} />
                <span className="label-caps">My Profile</span>
              </div>

              {user ? (
                <div className="space-y-8">
                                    <div className="grid grid-cols-3 gap-3">
                    <div className="surface-card p-3 text-center">
                      <p className="text-xl title-display text-emerald-400">{masteredCount}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Modules mastered</p>
                    </div>
                    <div className="surface-card p-3 text-center">
                      <p className="text-xl title-display">{results.length}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Quizzes taken</p>
                    </div>
                    <div className="surface-card p-3 text-center">
                      <p className="text-xl title-display">{badges.length}</p>
                      <p className="text-[10px] text-zinc-500 mt-1">Badges</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-5 surface-card">
                    <img 
                      src={avatarSrc(user.photoURL, user.displayName, user.email)} 
                      alt={user.displayName || 'User'} 
                      className="w-16 h-16 rounded-2xl shadow-lg object-cover bg-zinc-900"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const el = e.currentTarget;
                        if (el.dataset.fallback === '1') return;
                        el.dataset.fallback = '1';
                        el.src = avatarSrc(null, user.displayName, user.email);
                      }}
                    />
                    <div>
                      <h3 className="text-xl title-display">{user.displayName || firstName(null, user.email) || 'Trainee'}</h3>
                      <p className="body-muted">{user.email}</p>
                      <p className="text-[11px] text-zinc-500 mt-1">
                        {hasPurchased ? 'Full access unlocked' : 'Free modules 1–3'}
                      </p>
                    </div>
                  </div>

                  {/* Badges Section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Award size={16} />
                      <h4 className="label-caps">Earned Badges</h4>
                    </div>
                    {badges && badges.length > 0 ? (
                      <div className="grid grid-cols-2 gap-4">
                        {badges.map((badge) => (
                          <div key={badge.id} className="p-4 surface-card text-center space-y-2 relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/100 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 mx-auto">
                              <Award size={24} />
                            </div>
                            <h5 className="text-[10px] font-bold font-display uppercase tracking-tight line-clamp-1">{badge.title}</h5>
                            <p className="text-[8px] text-zinc-400 leading-tight line-clamp-2">{badge.description}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-elevated rounded-3xl border border-dashed border-zinc-300">
                        <p className="text-sm text-zinc-400 font-medium whitespace-pre-line">
                          {`You haven't earned any badges yet.\nPass a module quiz with 80%+ to earn one!`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <History size={16} />
                      <h4 className="label-caps">Quiz History</h4>
                    </div>

                    {results.length > 0 ? (
                      <div className="space-y-3">
                        {results.map((result) => (
                          <div key={result.id} className="p-4 surface-card flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm">{result.sectionTitle}</p>
                              <p className="text-[10px] text-zinc-400 font-medium">
                                {formatDay(resultDate(result.completedAt)) === '—' && result.completedAt
                                  ? 'Just now'
                                  : formatDay(resultDate(result.completedAt))}
                              </p>
                            </div>
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${result.score >= 80 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-elevated text-zinc-600'}`}>
                              {result.score}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-elevated rounded-3xl border border-dashed border-zinc-300">
                        <p className="text-sm text-zinc-400 font-medium">No quiz results yet.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Award size={16} />
                      <h4 className="label-caps">Certifications</h4>
                    </div>
                    {results.some(r => r.sectionId === 'section-15' && r.score >= 80) ? (
                      <button 
                        onClick={() => { void claimCertificate(); }}
                        className="w-full p-4 surface-card flex items-center gap-4 border border-emerald-500/25 bg-emerald-500/10"
                      >
                        <div className="w-10 h-10 bg-emerald-500/100 rounded-xl flex items-center justify-center text-white shadow-lg">
                          <Trophy size={20} />
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-emerald-400 font-display">MWD Professional</p>
                          <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                            {certIssuedAt ? `Issued ${formatDay(certIssuedAt)}` : 'Verified Certification'}
                          </p>
                        </div>
                      </button>
                    ) : (
                      <div className="p-8 text-center bg-elevated rounded-3xl border border-dashed border-zinc-300">
                        <p className="text-sm text-zinc-400 font-medium">Complete the Final Assessment with 80%+ to earn your certificate.</p>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowCinemaAd(true)}
                    className="btn-primary w-full"
                  >
                    <PlayCircle size={18} /> Watch trailer
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-6 py-12">
                  <div className="w-20 h-20 bg-elevated rounded-3xl flex items-center justify-center text-zinc-300 mx-auto">
                    <UserIcon size={40} />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl title-display">Sign in to track progress</h3>
                    <p className="body-muted max-w-[200px] mx-auto">Save your quiz results and earn your MWD Professional certification.</p>
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
      <nav className="app-nav">
        <div className="app-rail app-nav-row">
        <button 
          onClick={() => { setSearchTerm(''); setView('curriculum'); setCurrentSectionId(null); setActiveSimId(null); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === 'curriculum' || view === 'quiz' || view === 'results' ? 'text-emerald-400' : 'text-zinc-500'}`}
        >
          <BookOpen size={20} />
          <span className="app-nav-label">Learn</span>
        </button>
        <button 
          onClick={() => { setSearchTerm(''); setView('simlab'); setCurrentSectionId(null); setActiveSimId(null); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === 'simlab' ? 'text-emerald-400' : 'text-zinc-500'}`}
        >
          <FlaskConical size={20} />
          <span className="app-nav-label">Sim Lab</span>
        </button>
        <button 
          onClick={() => { setSearchTerm(''); setView('profile'); setActiveSimId(null); }}
          className={`flex flex-col items-center gap-0.5 px-3 py-1 ${view === 'profile' || view === 'certification' ? 'text-emerald-400' : 'text-zinc-500'}`}
        >
          <UserIcon size={20} />
          <span className="app-nav-label">Profile</span>
        </button>
        </div>
      </nav>
    </div>
      {/* Cinema Ad Fullscreen Overlay */}
      {showCinemaAd && (
        <CinemaAdMode onComplete={() => setShowCinemaAd(false)} />
      )}

      {/* Purchase Error Toast */}
      {purchaseError && (
        <div className="app-toast animate-in fade-in slide-in-from-bottom-4 duration-300">
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
