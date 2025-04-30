// Main entrypoint for Forex Ring Alerts

import logger from './logger';
import { processUpdate, getUpdates } from './integrations/telegram';
import { loadConfig } from './config';

const config = loadConfig();

async function startPolling() {
  let offset = 0;
  logger.info('Starting Telegram polling loop...');
  while (true) {
    try {
      const updates = await getUpdates(offset);
      logger.info('Fetched updates: %o', updates); // DEBUG: Log all fetched updates
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

startPolling();
