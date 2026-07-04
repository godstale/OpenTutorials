import fetch from 'node-fetch';

const CRON_SECRET = process.env.CRON_SECRET || 'dev-cron-secret';
const URL = 'http://localhost:3000/api/agent/schedule-tick';

console.log('Starting local scheduler...');

setInterval(async () => {
  try {
    const res = await fetch(URL, {
      headers: { 'Authorization': `Bearer ${CRON_SECRET}` }
    });
    const data = await res.json();
    console.log(`[${new Date().toISOString()}] Tick:`, data);
  } catch (e) {
    console.error('Scheduler fetch error:', e.message);
  }
}, 60000); // 60 seconds
