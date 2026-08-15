import { isNative } from './platform';

const KEY = 'mwd.ui.v1';

function store(): Storage | null {
  try {
    // Android process death wipes sessionStorage; WebView localStorage survives.
    return isNative() ? localStorage : sessionStorage;
  } catch {
    return null;
  }
}

export type AppView = 'curriculum' | 'quiz' | 'results' | 'certification' | 'profile' | 'simlab';

export type UiSession = {
  hasStarted: boolean;
  view: AppView;
  currentSectionId: string | null;
  activeSimId: string | null;
  quizIndex: number;
  quizAnswers: Record<number, number>;
  quizQuestions: unknown[] | null;
};

export function loadUiSession(): Partial<UiSession> | null {
  try {
    const raw = store()?.getItem(KEY) ?? sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<UiSession>;
  } catch {
    return null;
  }
}

export function saveUiSession(snap: UiSession) {
  try {
    store()?.setItem(KEY, JSON.stringify(snap));
  } catch {
    /* quota / private mode */
  }
}

export function clearUiSession() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
