import { getApiUrl } from './api';
import { httpClient } from './httpClient';

async function postEmail(path: string, body: Record<string, unknown>): Promise<void> {
  try {
    const res = await httpClient(getApiUrl(path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.warn(`Email ${path} failed:`, res.status, text.slice(0, 120));
    }
  } catch (e) {
    console.warn(`Email ${path} error:`, e);
  }
}

/** Fire-and-forget welcome email after first sign-in. */
export async function requestWelcomeEmail(params: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<void> {
  if (!params.email) return;
  await postEmail('/api/email/welcome', {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName || '',
  });
}

/** Fire-and-forget certificate email when user claims cert. */
export async function requestCertificateEmail(params: {
  uid: string;
  email: string;
  displayName?: string | null;
}): Promise<void> {
  if (!params.email) return;
  await postEmail('/api/email/certificate', {
    uid: params.uid,
    email: params.email,
    displayName: params.displayName || '',
  });
}