import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import Stripe from "stripe";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import admin from "firebase-admin";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import fs from "fs";
import { google } from "googleapis";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load optional local config if it exists
const configPath = path.join(process.cwd(), "firebase-applet-config.json");
let localConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    localConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  } catch (e) {
    console.warn("Could not parse firebase-applet-config.json");
  }
}

// Global Environment Sanitizer
const getEnv = (key: string, fallback: string = ""): string => {
  let val = process.env[key] || fallback;
  if (!val) return "";
  val = val.trim();
  // Only strip outer quotes if they exist (common in some env editors)
  if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
    val = val.slice(1, -1);
  }
  return val;
};

const firebaseConfig = {
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || localConfig.projectId,
  firestoreDatabaseId: getEnv("VITE_FIREBASE_DATABASE_ID") || localConfig.firestoreDatabaseId || "(default)"
};

// Log configuration status on startup
const appUrl = getEnv("APP_URL") || getEnv("VITE_APP_URL");
console.log("-----------------------------------------");
console.log("BACKEND BOOTUP DIAGNOSTICS");
console.log(`Time: ${new Date().toISOString()}`);
console.log(`Port: 3000`);
console.log(`Node Env: ${process.env.NODE_ENV}`);
console.log(`Vercel: ${!!process.env.VERCEL}`);
console.log(`App URL Detected: ${appUrl || "NOT SET"}`);
if (appUrl && (appUrl.startsWith('"') || appUrl.startsWith("'"))) {
  console.warn("WARNING: App URL contains literal quotes. The root cause of many 404 issues!");
}
console.log("-----------------------------------------");

if (!appUrl) {
  console.warn("WARNING: APP_URL is not set. Native mobile apps will not be able to connect to this API unless it is explicitly provided.");
}

// Initialize Firebase Admin
if (!admin.apps.length && firebaseConfig.projectId) {
  try {
    // Check for service account in env var first (Vercel friendly)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
    } else {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: firebaseConfig.projectId
      });
    }
  } catch (error) {
    console.warn("Firebase Admin could not initialize:", error);
  }
}

const app = express();
app.set('strict routing', false);
app.set('case sensitive routing', false);

// 1. BASIC MIDDLEWARE
const baseAppUrl = getEnv("APP_URL") || getEnv("VITE_APP_URL");
const allowedOrigins = [
  "https://mwdpro.app",
  "https://www.mwdpro.app",
  "https://compessential.com",
  "https://www.compessential.com",
  baseAppUrl,
  "http://localhost:3000",
  "http://localhost:5173",
  "capacitor://localhost",
  "https://localhost",
  "http://localhost"
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or same-origin)
    if (!origin) return callback(null, true);
    
    const isAllowed = allowedOrigins.some(o => o === origin) || 
                      origin.endsWith('.run.app') || 
                      origin.startsWith('http://localhost:');

    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json({
  verify: (req: any, res, buf) => {
    if (req.url.startsWith('/api/webhook')) {
      req.rawBody = buf;
    }
  }
}));

// 1. LOGGING & API HEADER FORCING
app.use((req, res, next) => {
  // If it's a native app or explicitly asks for JSON, ensure we don't send HTML
  const isApiRequest = req.url.startsWith('/api') || 
                       req.url.includes('/api/') ||
                       req.headers['x-requested-with'] === 'com.mwdpro.app' || 
                       req.headers['user-agent']?.includes('Capacitor');
  
  if (isApiRequest) {
    const originalSend = res.send;
    res.send = function(body) {
      if (typeof body === 'string' && (body.trim().startsWith('<!doctype') || body.trim().startsWith('<html'))) {
        console.warn(`[SAFETY] Interception! HTML sent for API request: ${req.method} ${req.url}`);
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ 
          error: "API_ROUTE_NOT_FOUND", 
          message: `The server received your request for ${req.url} but didn't find an API route matching it. This usually means your VITE_APP_URL is correct (it reached the server) but the path is wrong or the server hasn't registered that route.`,
          serverTime: new Date().toISOString(),
          requestedPath: req.url,
          method: req.method
        });
      }
      return originalSend.call(this, body);
    };
  }
  next();
});

// Global Request Logger
app.use((req, res, next) => {
  console.log(`[REQUEST] ${req.method} ${req.url} (Origin: ${req.headers.origin || 'none'})`);
  next();
});

// 2. LOGGING (Move to top for better visibility)
app.use((req, res, next) => {
  if (req.url.startsWith('/api/') || req.url === '/hb' || req.url.includes('.well-known')) {
    console.log(`[API_MATCH] ${req.method} ${req.url}`);
  }
  next();
});

// 3. HEARTBEAT & SYSTEM ROUTES
app.get("/hb", (req, res) => res.send("ALIVE"));

// Digital Asset Links for Android App Verification
app.get("/.well-known/assetlinks.json", (req, res) => {
  res.json([
    {
      "relation": [
        "delegate_permission/common.handle_all_urls",
        "delegate_permission/common.get_login_creds"
      ],
      "target": {
        "namespace": "android_app",
        "package_name": "com.mwdpro.app",
        "sha256_cert_fingerprints": [
          "D7:07:5F:56:7F:8F:AC:91:42:A4:39:68:7C:A1:58:A1:10:6A:B5:EF:EF:62:8C:B4:43:48:CE:66:0E:AD:49:01"
        ]
      }
    }
  ]);
});

// 4. API ROUTES
const apiRouter = express.Router({
  caseSensitive: false,
  mergeParams: true,
  strict: false
});

// Helper to register routes on both router and app
const handleApiRoute = (path: string, handler: express.RequestHandler, method: 'get' | 'post' = 'get') => {
  apiRouter[method](path, handler);
  // Also register on app with full path for absolute certainty to prevent HTML fallbacks
  const fullPath = `/api${path.startsWith('/') ? path : `/${path}`}`;
  app[method](fullPath, handler);
};

handleApiRoute("/config", (req, res) => {
  const pubKey = getEnv("VITE_STRIPE_PUBLISHABLE_KEY") || getEnv("STRIPE_PUBLISHABLE_KEY") || "";
  const secKey = getEnv("STRIPE_SECRET_KEY") || getEnv("VITE_STRIPE_SECRET_KEY") || "";
  const appUrl = getEnv("APP_URL") || getEnv("VITE_APP_URL") || "";
  
  // Get all keys that look like Stripe keys to see if there's a typo in the secret name
  const allEnvKeys = Object.keys(process.env);
  const stripeKeys = allEnvKeys.filter(k => k.toLocaleUpperCase().includes('STRIPE'));
  const urlKeys = allEnvKeys.filter(k => k.toLocaleUpperCase().includes('URL'));
  
  console.log("API: Config Request Diagnostics", {
    hasPubKey: !!pubKey,
    hasSecKey: !!secKey,
    hasAppUrl: !!appUrl,
    stripeKeysFound: stripeKeys,
    urlKeysFound: urlKeys,
    rawAppUrlValue: process.env.VITE_APP_URL // Help debug quote issues
  });

  res.setHeader('Content-Type', 'application/json');
  res.json({ 
    stripePublishableKey: pubKey,
    serverTime: new Date().toISOString(),
    config: {
      hasPubKey: !!pubKey,
      hasSecKey: !!secKey,
      hasAppUrl: !!appUrl,
      envKeysDetected: [...stripeKeys, ...urlKeys],
      serverMode: process.env.NODE_ENV || 'development'
    }
  });
});

handleApiRoute("/ping", (req, res) => {
  res.json({ 
    message: "pong", 
    time: new Date().toISOString(),
    env: {
      hasAppUrl: !!(process.env.APP_URL || process.env.VITE_APP_URL),
      nodeEnv: process.env.NODE_ENV
    }
  });
});

handleApiRoute("/health", (req, res) => {
  res.json({ status: "ok", env: process.env.NODE_ENV, vercel: !!process.env.VERCEL });
});

// Mount the router
app.use("/api", apiRouter);

// Helper to get Firestore instance
const getFirestore = () => {
  return getAdminFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
};

// Lazy initialize Stripe
let stripe: Stripe | null = null;
const getStripe = () => {
  if (!stripe) {
    const key = process.env.STRIPE_SECRET_KEY || process.env.VITE_STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set.");
    }
    stripe = new Stripe(key);
  }
  return stripe;
};

// Helper for Stripe Product
let cachedPriceId: string | null = null;
const getOrCreateMwdProduct = async () => {
  if (cachedPriceId) return cachedPriceId;
  const stripeInstance = getStripe();
  const products = await stripeInstance.products.list({ limit: 100 });
  const existingProduct = products.data.find(p => p.name === "MWD Pro: Full Course Access");
  if (existingProduct && existingProduct.default_price) {
    cachedPriceId = existingProduct.default_price as string;
    return cachedPriceId;
  }
  const product = await stripeInstance.products.create({
    name: "MWD Pro: Full Course Access",
    description: "Lifetime access to all 15 modules and certification.",
    default_price_data: {
      currency: "usd",
      unit_amount: 4900,
    },
  });
  cachedPriceId = product.default_price as string;
  return cachedPriceId;
};

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests." }
});
app.use("/api/", limiter);

// Webhook endpoint
handleApiRoute("/webhook", async (req: any, res) => {
  try {
    const stripeInstance = getStripe();
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!sig || !webhookSecret) {
      throw new Error("Missing signature or secret.");
    }
    const event = stripeInstance.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;
      if (userId) {
        const db = getFirestore();
        await db.collection("users").doc(userId).set({
          hasPurchased: true,
          purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
          stripeSessionId: session.id
        }, { merge: true });
      }
    }
    res.json({ received: true });
  } catch (err: any) {
    console.error(`Webhook Error: ${err.message}`);
    res.status(400).json({ error: err.message });
  }
}, 'post');

// Stripe Checkout
handleApiRoute("/create-checkout-session", async (req, res) => {
  try {
    const { userId, userEmail } = req.body;
    
    // Robust Input Validation
    if (!userId || typeof userId !== 'string' || userId.length > 128) {
      return res.status(400).json({ error: "Invalid or missing userId" });
    }
    
    const emailRegex = /^[^\s@]+@[^@\s.]+(?:\.[^@\s.]+)+$/;
    if (!userEmail || !emailRegex.test(userEmail) || userEmail.length > 255) {
      return res.status(400).json({ error: "Invalid or missing userEmail" });
    }

    const stripeInstance = getStripe();
    const priceId = await getOrCreateMwdProduct();
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripeInstance.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/?payment=success`,
      cancel_url: `${origin}/?payment=cancel`,
      customer_email: userEmail,
      metadata: { userId: userId },
    });
    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error("Stripe Error:", error);
    res.status(500).json({ error: error.message });
  }
}, 'post');

// Verify Native Purchase (Google Play / Apple App Store)
handleApiRoute("/verify-native-purchase", async (req, res) => {
  try {
    const { platform, transactionId, productId, purchaseToken, receipt, userId } = req.body;
    console.log(`Verifying ${platform} purchase:`, { transactionId, productId });

    let isValid = false;

    if (platform === 'android') {
      // Real Google Play Verification
      const serviceAccountStr = getEnv("GOOGLE_PLAY_SERVICE_ACCOUNT");
      if (serviceAccountStr) {
        try {
          const serviceAccount = JSON.parse(serviceAccountStr);
          const packageName = getEnv("VITE_GOOGLE_PLAY_PACKAGE_NAME", "com.mwdpro.app");
          
          const auth = new google.auth.GoogleAuth({
            credentials: serviceAccount,
            scopes: ['https://www.googleapis.com/auth/androidpublisher'],
          });
          
          const publisher = google.androidpublisher({ version: 'v3', auth });
          const result = await publisher.purchases.products.get({
            packageName: packageName,
            productId: productId,
            token: purchaseToken
          });

          // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
          if (result.status === 200 && result.data.purchaseState === 0) {
            console.log("Verified Google Play Purchase:", result.data);
            isValid = true;
          } else {
            console.warn("Google Play Verification Rejected:", result.data);
            isValid = false;
          }
        } catch (err: any) {
          console.error("Google Play Verification Technical Error:", err.message);
          return res.status(500).json({ 
            error: "VERIFICATION_TECH_FAILURE", 
            details: err.message 
          });
        }
      } else {
        console.warn("GOOGLE_PLAY_SERVICE_ACCOUNT not set. Denying verification.");
        isValid = false;
      }
    } else if (platform === 'ios') {
      // Apple Verification (Simplified)
      console.warn("Apple verification is mock-only in this version.");
      isValid = !!transactionId;
    }

    if (isValid && userId) {
      const db = getFirestore();
      await db.collection("users").doc(userId).set({
        hasPurchased: true,
        purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
        platform: platform,
        transactionId: transactionId
      }, { merge: true });
      
      return res.json({ success: true });
    }

    res.status(400).json({ error: "Invalid purchase" });
  } catch (error: any) {
    console.error("Verification Error:", error);
    res.status(500).json({ error: error.message });
  }
}, 'post');

// Catch-all for /api
app.all("/api/*", (req, res) => {
  console.log(`[404 API] Unmatched request: ${req.method} ${req.url}`);
  res.status(404).json({ 
    error: `Not found: ${req.method} ${req.url}`,
    message: "This is a JSON 404 from the /api/ catch-all. If you see HTML, something else is intercepting this.",
    timestamp: new Date().toISOString()
  });
});

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express Error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

async function startServer() {
  // Skip server setup on Vercel - Vercel handles static files and routing
  if (process.env.VERCEL) {
    console.log("Running on Vercel - skipping local server setup");
    return;
  }

  const PORT = 3000;
  console.log(`Starting local server in ${process.env.NODE_ENV || 'development'} mode...`);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("Initializing Vite middleware...");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to initialize Vite middleware:", err);
    }
  } else {
    console.log("Serving static files from dist...");
    const distPath = path.join(process.cwd(), "dist");
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get("*", limiter, (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    } else {
      console.error("DIST FOLDER NOT FOUND! Falling back to Vite...");
      try {
        const { createServer: createViteServer } = await import("vite");
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: "spa",
        });
        app.use(vite.middlewares);
      } catch (err) {
        console.error("Failed to initialize fallback Vite middleware:", err);
      }
    }
  }

  console.log(`Attempting to start server on port ${PORT}...`);
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

export default app;
