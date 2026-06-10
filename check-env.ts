
import dotenv from 'dotenv';
dotenv.config();
console.log('ENV CHECK:', {
  VITE_STRIPE_PUBLISHABLE_KEY: !!process.env.VITE_STRIPE_PUBLISHABLE_KEY,
  STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
  keys: Object.keys(process.env).filter(k => k.includes('STRIPE') || k.includes('VITE'))
});
