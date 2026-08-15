import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  loginWithGoogle,
  completeRedirectLogin,
  logout, 
  onAuthStateChanged, 
  User, 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp
} from './firebase';
import { AlertCircle } from 'lucide-react';
import { requestWelcomeEmail } from './lib/emailClient';

import { 
  Badge
} from './types';

interface QuizResult {
  id: string;
  sectionId: string;
  sectionTitle: string;
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  completedAt: any;
}

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<any>;
  logout: () => Promise<void>;
  saveQuizResult: (sectionId: string, sectionTitle: string, score: number, correctAnswers: number, totalQuestions: number) => Promise<void>;
  results: QuizResult[];
  hasPurchased: boolean;
  badges: Badge[];
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

const FULL_ACCESS_EMAILS = new Set([
  'bt4ylor1776@gmail.com',
]);

export function emailHasFullAccess(email?: string | null) {
  return !!email && FULL_ACCESS_EMAILS.has(email.trim().toLowerCase());
}

function resultMillis(completedAt: unknown): number {
  if (!completedAt) return 0;
  const stamp = completedAt as { toMillis?: () => number; toDate?: () => Date };
  if (typeof stamp.toMillis === 'function') return stamp.toMillis();
  if (typeof stamp.toDate === 'function') return stamp.toDate().getTime();
  if (completedAt instanceof Date) return completedAt.getTime();
  if (typeof completedAt === 'number') return completedAt;
  return 0;
}

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<QuizResult[]>([]);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeResults: (() => void) | null = null;
    let unsubscribeUser: (() => void) | null = null;

    // Safety timeout to prevent infinite loading if Firebase fails
    const timeoutId = setTimeout(() => {
      console.warn("Firebase initialization timed out.");
      setAuthError("Still connecting. Check your network if this screen stays up.");
    }, 10000);

    // Complete Google redirect sign-in if we returned from the OAuth page
    void completeRedirectLogin().catch((err) => {
      console.error('OAuth redirect login failed:', err);
      if (err?.code === 'auth/unauthorized-domain') {
        setAuthError(
          "This domain is not authorized in Firebase. Add compessential.com under Authentication → Settings → Authorized domains."
        );
      }
    });

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      clearTimeout(timeoutId);
      
      // Cleanup previous subscriptions
      if (unsubscribeResults) {
        unsubscribeResults();
        unsubscribeResults = null;
      }
      if (unsubscribeUser) {
        unsubscribeUser();
        unsubscribeUser = null;
      }

      setUser(currentUser);
      
      if (currentUser) {
        // Sync user profile to Firestore and listen for purchase status
        const userRef = doc(db, 'users', currentUser.uid);
        
        unsubscribeUser = onSnapshot(userRef, (docSnap) => {
          const data = docSnap.exists() ? docSnap.data() : {};
          setHasPurchased(!!data.hasPurchased || emailHasFullAccess(currentUser.email));
          setBadges(data.badges || []);
        }, (err) => {
          console.error("User profile listener error:", err);
          if (err.message?.includes('permissions')) {
            setError("Permission denied. This often happens if your browser blocks storage in the preview. Try opening the app in a new tab.");
          }
        });

        try {
          const existing = await getDoc(userRef);
          const isNewProfile = !existing.exists();
          const needsWelcome = isNewProfile || !existing.data()?.welcomeEmailSent;

          const profileData: Record<string, unknown> = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
          };

          if (currentUser.email) {
            profileData.email = currentUser.email;
          }
          // Do not write hasPurchased from the client — Admin SDK owns entitlements.
          if (isNewProfile) {
            profileData.createdAt = serverTimestamp();
          }

          await setDoc(userRef, profileData, { merge: true });

          if (needsWelcome && currentUser.email) {
            void requestWelcomeEmail({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
            });
          }
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }

        const applyResults = (docs: { id: string; data: () => Record<string, unknown> }[], sortClientSide: boolean) => {
          const fetchedResults = docs.map((item) => ({
            id: item.id,
            ...item.data(),
          })) as QuizResult[];
          if (sortClientSide) {
            fetchedResults.sort((a, b) => resultMillis(b.completedAt) - resultMillis(a.completedAt));
          }
          setResults(fetchedResults);
        };

        const listenResults = (ordered: boolean) => {
          const resultsQuery = ordered
            ? query(
                collection(db, 'results'),
                where('uid', '==', currentUser.uid),
                orderBy('completedAt', 'desc')
              )
            : query(
                collection(db, 'results'),
                where('uid', '==', currentUser.uid)
              );

          return onSnapshot(resultsQuery, (snapshot) => {
            applyResults(snapshot.docs.map((item) => ({ id: item.id, data: () => item.data() as Record<string, unknown> })), !ordered);
          }, (error) => {
            if (!auth.currentUser) return;
            const code = (error as { code?: string }).code || '';
            const message = error.message || '';
            if (ordered && (code === 'failed-precondition' || /index/i.test(message))) {
              console.warn('Results composite index missing; falling back to unordered query.');
              unsubscribeResults = listenResults(false);
              return;
            }
            if (message.includes('permissions')) {
              setError("Permission denied. This often happens if your browser blocks storage in the preview. Try opening the app in a new tab.");
            }
            console.error('Results listener error:', error);
          });
        };

        unsubscribeResults = listenResults(true);
      } else {
        setResults([]);
        setHasPurchased(false);
        setBadges([]);
      }
      setLoading(false);
    }, (err) => {
      console.error("Auth state change error:", err);
      clearTimeout(timeoutId);
      setError("Failed to connect to authentication services.");
      setLoading(false);
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeResults) unsubscribeResults();
      if (unsubscribeUser) unsubscribeUser();
      clearTimeout(timeoutId);
    };
  }, []);

  const login = async () => {
    setAuthError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      if (error.code === 'auth/user-cancelled' || error.code === 'auth/popup-closed-by-user') {
        console.log('User cancelled the login popup');
        return;
      }
      
      let message = error?.message || "Login failed. Please try again.";
      if (error.code === 'auth/configuration-not-found') {
        message =
          "Firebase Authentication is not fully configured on project mwd-pro-training.";
      } else if (error.code === 'auth/operation-not-allowed') {
        message = "Google sign-in is not enabled in Firebase Console → Authentication.";
      } else if (error.code === 'auth/unauthorized-domain') {
        message =
          "This domain is not authorized in Firebase. Add it under Authentication → Settings → Authorized domains.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked. Allow popups, or the app will try a full-page redirect next time.";
      } else if (error.code === 'auth/network-request-failed') {
        message = "Network error during login. Check your connection and try again.";
      } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/internal-error') {
        message = "Firebase auth error. Confirm Google sign-in is enabled in the Firebase Console.";
      }
      
      console.error('Login error:', error);
      setAuthError(message);
    }
  };

  const saveQuizResult = async (sectionId: string, sectionTitle: string, score: number, correctAnswers: number, totalQuestions: number) => {
    if (!user) return;

    try {
      const resultData = {
        uid: user.uid,
        sectionId,
        sectionTitle,
        score,
        correctAnswers,
        totalQuestions,
        completedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'results'), resultData);

      // Award badge if score >= 80 and not already earned
      if (score >= 80) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const currentBadges = userData.badges || [];
          const alreadyEarned = currentBadges.some((b: any) => b.id === `badge-${sectionId}`);
          
          if (!alreadyEarned) {
            const newBadge: Badge = {
              id: `badge-${sectionId}`,
              title: `${sectionTitle} Master`,
              icon: 'Award', // Default icon, can be customized per section
              description: `Completed the ${sectionTitle} module with a score of ${score}%`,
              earnedAt: Date.now()
            };
            
            await setDoc(userRef, {
              badges: [...currentBadges, newBadge]
            }, { merge: true });
          }
        }
      }
    } catch (error) {
      console.error('Failed to save quiz result:', error);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="bg-zinc-900/50 border border-red-500/20 p-6 rounded-2xl max-w-sm w-full text-center">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="text-red-500 w-6 h-6" />
          </div>
          <h2 className="text-white font-medium mb-2">Connection Error</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-emerald-500 text-black font-bold py-3 rounded-xl hover:bg-emerald-400 transition-colors"
            >
              Retry Connection
            </button>
            <button 
              onClick={() => window.open(window.location.href, '_blank')}
              className="w-full bg-zinc-800 text-white font-bold py-3 rounded-xl hover:bg-zinc-700 transition-colors"
            >
              Open in New Tab
            </button>
          </div>
        </div>
      </div>
    );
  }

  const logoutUser = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, login, logout: logoutUser, saveQuizResult, results, hasPurchased, badges }}>
      {children}
      
      {/* Auth Error Toast */}
      {authError && (
        <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="bg-zinc-900 border border-red-500/20 p-4 rounded-xl shadow-2xl flex items-center gap-3">
            <div className="w-8 h-8 bg-red-500/10 rounded-full flex items-center justify-center shrink-0">
              <AlertCircle className="text-red-500 w-4 h-4" />
            </div>
            <div className="flex-1">
              <p className="text-white text-xs font-medium leading-tight">{authError}</p>
            </div>
            <button 
              onClick={() => setAuthError(null)}
              className="text-zinc-500 hover:text-white text-xs font-bold px-2 py-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </FirebaseContext.Provider>
  );
};

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};
