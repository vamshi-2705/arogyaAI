import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Import routes
import patientRoutes from './routes/patient.js';
import nurseRoutes from './routes/nurse.js';
import qrRoutes from './routes/qr.js';
import agentRoutes from './routes/agent.js';

// Import error handler
import { errorHandler } from './middleware/errorHandler.js';

// Import cron jobs (self-initializing)
import './jobs/watcherCron.js';

const app = express();
const PORT = process.env.PORT || 5000;

// ─── Middleware ───────────────────────────────────────────────
// Allow any localhost port (Vite may start on 5173, 5174, etc.)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman) or any localhost origin
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      callback(null, true);
    } else {
      const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
      callback(origin === allowed ? null : new Error('CORS not allowed'), origin === allowed);
    }
  },
  credentials: true,
}));

app.use(express.json());

// ─── Health Check ─────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'AROGYA WATCH AI API', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/patient', patientRoutes);
app.use('/api/nurse', nurseRoutes);
app.use('/api/qr', qrRoutes);
app.use('/api/agent', agentRoutes);

// ─── 404 Handler ──────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🏥 AROGYA WATCH AI Server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Hospital ID: ${process.env.HOSPITAL_ID}`);
  console.log('');
});

export default app;
