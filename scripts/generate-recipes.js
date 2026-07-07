#!/usr/bin/env node

const dotenv = require('dotenv');
const { createClient } = require('../backend/node_modules/@supabase/supabase-js');
const cron = require('../backend/node_modules/node-cron');

dotenv.config({ path: './backend/.env' });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function runRecipeJob() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY are required for the recipe job');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: users, error } = await supabase.from('users').select('id');

  if (error) {
    throw new Error(error.message);
  }

  let generateRecipesForUser;

  try {
    ({ generateRecipesForUser } = require('../backend/dist/services/recipeService.js'));
  } catch {
    throw new Error('Build backend first so scripts can import dist/services/recipeService.js');
  }

  for (const user of users || []) {
    try {
      await generateRecipesForUser({ userId: user.id });
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unknown recipe request error';
      console.error(`Recipe job failed for user ${user.id}: ${message}`);
    }
  }

  console.log('Recipe job completed');
}

const cronExpr = process.env.RECIPE_CRON || '0 8 * * *';

if (process.env.RUN_ONCE === 'true') {
  runRecipeJob().catch((error) => {
    console.error(error);
    process.exit(1);
  });
} else {
  cron.schedule(cronExpr, () => {
    void runRecipeJob();
  });
  console.log(`Recipe cron started on schedule: ${cronExpr}`);
}
