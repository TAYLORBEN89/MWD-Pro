import { isNative } from './platform';

export const getApiUrl = (path: string) => {
  let baseUrl = import.meta.env.VITE_APP_URL as string;
  
  // Clean up baseUrl: strip quotes and accidental spacing
  if (baseUrl) {
    baseUrl = baseUrl.replace(/['"]+/g, '').trim();
  }
  
  // 1. Return absolute paths early
  if (path.startsWith('http://') || path.startsWith('https://')) return path;

  // 2. Normalize handlePath: Ensure it has /api prefix
  let handlePath = path.startsWith('/') ? path : `/${path}`;
  if (!handlePath.startsWith('/api/') && handlePath !== '/api') {
    handlePath = `/api${handlePath}`;
  }
  
  // 3. For Native Apps, Base URL is essential
  if (isNative() && baseUrl) {
    // Clean trailing slash if present
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // If the baseUrl already includes /api, don't double it
    const finalUrl = cleanBase.endsWith('/api') 
      ? `${cleanBase}${handlePath.substring(4)}`
      : `${cleanBase}${handlePath}`;
      
    return finalUrl;
  }
  
  // 4. On web or if no base provided, use the normalized relative path
  return handlePath;
};
