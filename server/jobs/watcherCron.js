import cron from 'node-cron';
import { runWatcherCheckins } from '../agents/watcher.js';
import { checkNoResponse } from '../agents/commander.js';
import dotenv from 'dotenv';

dotenv.config();

const HOSPITAL_ID = process.env.HOSPITAL_ID;

/**
 * WATCHER cron — every 15 minutes, send check-in to all waiting patients.
 */
cron.schedule('*/15 * * * *', async () => {
  console.log('[WATCHER CRON] Running 15-minute check-in job...');
  try {
    await runWatcherCheckins();
  } catch (err) {
    console.error('[WATCHER CRON] Error:', err.message);
  }
});

/**
 * No-response check — every 30 minutes, alert nurse about unresponsive patients.
 */
cron.schedule('*/30 * * * *', async () => {
  console.log('[COMMANDER CRON] Running no-response check...');
  try {
    await checkNoResponse(HOSPITAL_ID);
  } catch (err) {
    console.error('[COMMANDER CRON] Error:', err.message);
  }
});

console.log('[CRON] Watcher (15min) and no-response check (30min) jobs scheduled.');
