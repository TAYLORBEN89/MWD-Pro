import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { 
  initializeFirestore,
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
  getDocFromServer
} from 'firebase/firestore';
// Public Firebase identifiers live in the committed applet config.
// The browser API key is not committed — GitHub secret scanning flags it.
// Set VITE_FIREBASE_API_KEY in .env / Vercel.
import firebaseConfig from '../firebase-applet-config.json';

const firebaseParams = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId
};

if (!firebaseParams.apiKey || !firebaseParams.projectId || !firebaseParams.appId) {
  throw new Error('Missing Firebase client config. Set VITE_FIREBASE_API_KEY.');
}

const app = initializeApp(firebaseParams);
export const auth = getAuth(app);

// Initialize Firestore (default DB unless a named database ID is configured)
const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
const firestoreSettings = { experimentalForceLongPolling: true as const };
export const db =
  !databaseId || databaseId === '(default)'
    ? initializeFirestore(app, firestoreSettings)
    : initializeFirestore(app, firestoreSettings, databaseId);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = async () => {
  try {
    return await signInWithPopup(auth, googleProvider);
  } catch (err: any) {
    const code = err?.code as string | undefined;
    if (
      code === 'auth/popup-blocked' ||
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/operation-not-supported-in-this-environment'
    ) {
      await signInWithRedirect(auth, googleProvider);
      return null;
    }
    throw err;
  }
};

/** Call once on app boot to finish redirect-based Google sign-in */
export const completeRedirectLogin = () => getRedirectResult(auth);
export const completeGoogleRedirectLogin = completeRedirectLogin;

export const logout = () => signOut(auth);

// Firestore Error Handler
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Firestore Error:', operationType, path, message);
  throw new Error('Data request failed. Please try again.');
}

// Connection Test removed to reduce log noise
// testConnection();

export { 
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
  onAuthStateChanged
};
export type { User };
