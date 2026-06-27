import express from 'express';
import { sendWatcherCheckin, handleWatcherResponse } from '../agents/watcher.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

/**
 * POST /api/agent/watcher/trigger
 * Manually trigger a WATCHER check-in for a specific session.
 * Protected by nurse JWT for security.
 * Body: { sessionId, language? }
 */
router.post('/watcher/trigger', authMiddleware, async (req, res, next) => {
  try {
    const { sessionId, language = 'te' } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    await sendWatcherCheckin(sessionId, language);

    res.json({ success: true, message: 'WATCHER check-in sent to session', sessionId });
  } catch (err) {
    next(err);
  }
});

export default router;
