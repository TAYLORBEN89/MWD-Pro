import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  auth, 
  db, 
  loginWithGoogle, 
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
  serverTimestamp,
  handleFirestoreError,
  OperationType
} from './firebase';
import { AlertCircle } from 'lucide-react';

import { 
  Badge,
  UserProgress
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
      if (loading) {
        console.warn("Firebase initialization timed out. Proceeding anyway.");
        setLoading(false);
      }
    }, 5000);

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
          if (docSnap.exists()) {
            const data = docSnap.data();
            setHasPurchased(!!data.hasPurchased);
            setBadges(data.badges || []);
          }
        }, (err) => {
          console.error("User profile listener error:", err);
          if (err.message?.includes('permissions')) {
            setError("Permission denied. This often happens if your browser blocks storage in the preview. Try opening the app in a new tab.");
          }
        });

        try {
          const profileData: any = {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            createdAt: serverTimestamp()
          };
          
          if (currentUser.email) {
            profileData.email = currentUser.email;
          }

          await setDoc(userRef, profileData, { merge: true });
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }

        // Listen for quiz results
        const resultsQuery = query(
          collection(db, 'results'),
          where('uid', '==', currentUser.uid),
          orderBy('completedAt', 'desc')
        );

        unsubscribeResults = onSnapshot(resultsQuery, (snapshot) => {
          const fetchedResults = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as QuizResult[];
          setResults(fetchedResults);
        }, (error) => {
          // Only report if we are still logged in
          if (auth.currentUser) {
            if (error.message?.includes('permissions')) {
              setError("Permission denied. This often happens if your browser blocks storage in the preview. Try opening the app in a new tab.");
            }
            handleFirestoreError(error, OperationType.LIST, 'results');
          }
        });
      } else {
        setResults([]);
        setHasPurchased(false);
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
      
      let message = "Login failed. Please try again.";
      if (error.code === 'auth/unauthorized-domain') {
        message = "This domain is not authorized in Firebase. Please add it to 'Authorized Domains' in the Firebase Console.";
      } else if (error.code === 'auth/popup-blocked') {
        message = "Login popup was blocked by your browser. Please allow popups for this site.";
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
      handleFirestoreError(error, OperationType.CREATE, 'results');
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
