import { auth } from '../firebase';

/** Bearer token for API routes that must match the signed-in Firebase user. */
export async function bearerHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch (err) {
    console.warn('Could not get Firebase ID token:', err);
    return {};
  }
}
