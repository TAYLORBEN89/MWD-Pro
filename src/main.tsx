import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { FirebaseProvider } from './FirebaseContext';
import { Analytics } from "@vercel/analytics/react";

// App Entry Point
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Failed to find the root element');
}

// Global Error Catch for Android/Mobile Debug
window.addEventListener('error', (event) => {
  console.error("GLOBAL ERROR:", event.error);
  if (rootElement.innerHTML === "" || rootElement.innerHTML.includes("Loading")) {
    rootElement.innerHTML = `
      <div style="background: #1a1a1a; color: #ff4444; padding: 20px; font-family: sans-serif; font-size: 14px; border: 2px solid #ff4444; margin: 20px; border-radius: 8px;">
        <h2 style="margin: 0 0 10px 0;">Global Script Error</h2>
        <p style="margin: 0 0 10px 0; color: #fff;">${event.message}</p>
        <div style="font-size: 10px; color: #888;">File: ${event.filename}:${event.lineno}</div>
        <button onclick="window.location.reload()" style="margin-top: 15px; padding: 8px 15px; background: #ff4444; border: none; color: white; border-radius: 4px;">Reload</button>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error("UNHANDLED REJECTION:", event.reason);
});

try {
  createRoot(rootElement).render(
    <StrictMode>
      <FirebaseProvider>
        <App />
        <Analytics />
      </FirebaseProvider>
    </StrictMode>
  );
} catch (error: any) {
  console.error("CRITICAL BOOT ERROR:", error);
  rootElement.innerHTML = `
    <div style="background: #1a1a1a; color: #ff4444; padding: 20px; font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; border: 1px solid #333;">
      <h1 style="margin-bottom: 10px; font-size: 24px;">App Launch Failed</h1>
      <p style="color: #888; font-size: 14px; max-width: 80%; line-height: 1.5;">${error?.message || 'Unknown error occurred during boot'}</p>
      <hr style="width: 50%; border: 0; border-top: 1px solid #333; margin: 20px 0;" />
      <div style="font-size: 10px; color: #555; margin-bottom: 20px;">Check browser/Logcat console for details</div>
      <button onclick="window.location.reload()" style="padding: 10px 25px; background: #ff4444; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;">RELOAD APP</button>
    </div>
  `;
}
