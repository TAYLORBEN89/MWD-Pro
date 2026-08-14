import { isNative } from './platform';

const PRODUCTION_APP_URL = 'https://compessential.com';

export const getApiUrl = (path: string) => {
  let baseUrl = (import.meta.env.VITE_APP_URL as string) || '';
  if (baseUrl) {
    baseUrl = baseUrl.replace(/['"]+/g, '').trim();
  }
  if (isNative() && !baseUrl) {
    baseUrl = PRODUCTION_APP_URL;
  }

  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  let handlePath = path.startsWith('/') ? path : `/${path}`;
  if (!handlePath.startsWith('/api/') && handlePath !== '/api') {
    handlePath = `/api${handlePath}`;
  }

  if (isNative()) {
    const cleanBase = (baseUrl || PRODUCTION_APP_URL).replace(/\/$/, '');
    return cleanBase.endsWith('/api')
      ? `${cleanBase}${handlePath.substring(4)}`
      : `${cleanBase}${handlePath}`;
  }

  return handlePath;
};
