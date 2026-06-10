import { Capacitor } from '@capacitor/core';

export const isNative = () => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = () => {
  return Capacitor.getPlatform();
};

export const isAndroid = () => {
  return getPlatform() === 'android';
};

export const isIOS = () => {
  return getPlatform() === 'ios';
};

export const isWeb = () => {
  return !isNative();
};
