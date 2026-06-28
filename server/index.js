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

// Allow any localhost port, same-origin Render domains, or custom client URL
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. static assets without crossorigin, curl, Postman),
    // any localhost origin, or any *.onrender.com subdomain
    if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin) || origin.endsWith('.onrender.com')) {
      callback(null, true);
    } else {
      const allowed = process.env.CLIENT_URL || 'http://localhost:5173';
      if (origin === allowed) {
        callback(null, true);
      } else {
        callback(new Error('CORS not allowed'));
      }
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

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static frontend assets in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// Fallback all frontend routes to React's index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/health') || req.path.startsWith('/api-docs')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

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
