#!/usr/bin/env node

const dotenv = require('../backend/node_modules/dotenv');

dotenv.config({ path: './backend/.env' });

const { runRecallCheck } = require('../backend/dist/services/recallService.js');

async function main() {
  console.log(`[${new Date().toISOString()}] Starting recall check...`);

  try {
    const result = await runRecallCheck();
    console.log(
      `[${new Date().toISOString()}] Done. ` +
        `Fetched ${result.recallsFetched} recalls, ` +
        `found ${result.matchesFound} new inventory matches, ` +
        `sent ${result.notificationsSent} notifications.`,
    );
    process.exit(0);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Recall check failed:`, error);
    process.exit(1);
  }
}

void main();