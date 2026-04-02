import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Load env vars before anything else — especially before firebase-admin initialises
dotenv.config();

// ─── App setup ─────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '50kb' })); // Reject oversized request bodies early

// ─── Route imports ─────────────────────────────────────────────────────────────
// auth.middleware initialises firebase-admin; must import after dotenv.config()
import moderationRoutes from './routes/moderation.routes';

// ─── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/moderation', moderationRoutes);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
});
