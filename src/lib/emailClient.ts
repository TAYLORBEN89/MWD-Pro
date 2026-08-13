import { getApiUrl } from './api';
import { httpClient } from './httpClient';

/** Fire-and-forget welcome email after first sign-in. */
export async function requestWelcomeEmail(params: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<void> {
  if (!params.email) return;
  try {
    const res = await httpClient(getApiUrl('/api/email/welcome'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        uid: params.uid,
        email: params.email,
        displayName: params.displayName || '',
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn('Welcome email request failed:', res.status, text.slice(0, 120));
    }
  } catch (e) {
    console.warn('Welcome email request error:', e);
  }
}
