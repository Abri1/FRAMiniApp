// Main entrypoint for Forex Ring Alerts

import express from 'express';
import path from 'path';
import logger from './logger';
import { setupApiRoutes } from './api';
import { processUpdate, getUpdates } from './integrations/telegram';
import { loadConfig } from './config';
import { fetchAndCacheForexPairs } from './integrations/forex';
import { initializeSubscriptions } from './priceMonitor';

const config = loadConfig();

async function startTelegramPolling() {
  let offset = 0;
  logger.info('Starting Telegram polling loop...');
  while (true) {
    try {
      const updates = await getUpdates(offset);
      for (const update of updates) {
        await processUpdate(update);
        offset = update.update_id + 1;
      }
    } catch (err) {
      logger.error('Polling error: %o', err);
    }
    await new Promise(res => setTimeout(res, 1000)); // Poll every second
  }
}

async function initializeApp() {
  try {
    // --- Forex Pair Cache: Fetch on startup ---
    await fetchAndCacheForexPairs();
  } catch (err) {
    console.error('[Startup] Failed to initialize forex pairs cache:', err);
  }

  // --- Initialize Polygon.io subscriptions for all active pairs ---
  try {
    await initializeSubscriptions();
  } catch (err) {
    console.error('[Startup] Failed to initialize Polygon.io subscriptions:', err);
  }

  // --- Schedule hourly refresh of forex pairs cache ---
  setInterval(async () => {
    try {
      await fetchAndCacheForexPairs();
    } catch (err) {
      console.error('[Scheduled] Failed to refresh forex pairs cache:', err);
    }
  }, 60 * 60 * 1000); // every hour

  // --- Start Express server ---
  const app = express();
  setupApiRoutes(app);

  // Serve Mini App static files
  app.use('/webapp', express.static(path.resolve(__dirname, 'webapp', 'dist')));

  // Redirect root to /webapp
  app.get('/', (req, res) => res.redirect('/webapp'));

  // Catch-all: serve Mini App for any other route (SPA support)
  app.get('*', (req, res) => {
    const indexPath = path.resolve(__dirname, 'webapp', 'dist', 'index.html');
    logger.info(`Serving Mini App index.html from: ${indexPath}`);
    res.sendFile(indexPath);
  });

  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });

  // --- Start Telegram polling loop (non-blocking) ---
  startTelegramPolling();
}

// Start the app
initializeApp();
