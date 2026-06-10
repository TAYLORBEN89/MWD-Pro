import { CapacitorHttp } from '@capacitor/core';
import { isNative } from './platform';

/**
 * A robust fetch wrapper that uses CapacitorHttp on native platforms
 * and standard fetch on the web. This bypasses CORS and standard 
 * browser security restrictions when running as a native app.
 */
export async function httpClient(url: string, options: RequestInit = {}) {
  if (isNative()) {
    try {
      // Use Native HTTP for Android/iOS
      const response = await CapacitorHttp.request({
        url: url,
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers as any),
        },
        data: (options.body && typeof options.body === 'string') 
          ? JSON.parse(options.body) 
          : options.body,
      });

      // Map Capacitor response to a Fetch-like response object
      return {
        ok: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: String(response.status),
        json: async () => response.data,
        text: async () => typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
        headers: {
          get: (name: string) => response.headers[name] || response.headers[name.toLowerCase()]
        }
      } as unknown as Response;
    } catch (error) {
      console.error("Native HTTP Error:", error);
      // Fallback to regular fetch if native fails
      return fetch(url, options);
    }
  }

  // Standard fetch for Web
  return fetch(url, options);
}
