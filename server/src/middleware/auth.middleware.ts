import { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';

// ─── Typed user attached to request ───────────────────────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string;
      };
    }
  }
}

// ─── Firebase Admin initialisation (runs once on first import) ────────────────
if (!admin.apps.length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccountKey))
      });
    } catch (err) {
      console.error('[AUTH] Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY — check the env var format:', err);
      process.exit(1);
    }
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    // Works in GCP / Cloud Run environments
    admin.initializeApp({ credential: admin.credential.applicationDefault() });
  } else {
    // Development fallback: project-ID only (works with Firebase Auth emulator)
    const projectId = process.env.FIREBASE_PROJECT_ID || 'haelr-462818';
    console.warn(
      `[AUTH] No service-account credentials found. Initialising Firebase Admin with projectId="${projectId}" only. ` +
      'Set FIREBASE_SERVICE_ACCOUNT_KEY for production.'
    );
    admin.initializeApp({ projectId });
  }
}

export { admin };

// ─── Authentication middleware ─────────────────────────────────────────────────
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. Provide a Firebase ID token as "Bearer <token>".'
      });
      return;
    }

    const idToken = authHeader.split(' ')[1];
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Only expose what downstream handlers actually need
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token.'
    });
  }
};

// Alias kept for existing import sites
export const authenticateToken = authenticate;
