#!/usr/bin/env node

const dotenv = require('dotenv');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const cron = require('../backend/node_modules/node-cron');

dotenv.config({ path: './backend/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function runPredictionJob() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for the prediction job');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await supabase.from('users').select('id, auth_user_id');

  if (error) {
    throw new Error(error.message);
  }

  let generatePredictionsForUser;

  try {
    ({ generatePredictionsForUser } = require('../backend/dist/services/predictionService.js'));
  } catch {
    throw new Error('Build backend first so scripts can import dist/services/predictionService.js');
  }

  for (const user of users || []) {
    try {
      await generatePredictionsForUser({ userId: user.id });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unknown prediction request error';
      console.error(`Prediction job failed for user ${user.id}: ${message}`);
    }
  }

  console.log('Prediction job completed');
}

const cronExpr = process.env.PREDICTION_CRON || '0 * * * *';

if (process.env.RUN_ONCE === 'true') {
  runPredictionJob().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  cron.schedule(cronExpr, () => {
    void runPredictionJob();
  });
  console.log(`Prediction cron started on schedule: ${cronExpr}`);
}
