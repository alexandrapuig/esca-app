import { Router, type Request } from 'express';

import { claimPendingRecipeJob, createOrReturnRecipeJob, getRecipeJob, listRecipesForUser, runRecipeJob, updateRecipeSuggestionFlags } from '../services/recipeService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';
import { trackEvent } from '../services/analyticsService';

type UpdateRecipeBody = {
  saved?: boolean;
  cooked?: boolean;
};

const router = Router();

/**
 * Cron worker. Vercel invokes this on a schedule with
 * Authorization: Bearer <CRON_SECRET>.
 *
 * Mounted BEFORE requireAuth: the cron caller has no Supabase session, it
 * authenticates with the shared secret instead.
 *
 * Claims one pending job and runs it to completion, awaited -- the whole
 * point is that the work happens inside an invocation that is kept alive by
 * the pending response, rather than after the response has been sent.
 */
router.post('/process', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    res.status(503).json({ success: false, error: 'Recipe worker is not configured' });
    return;
  }

  if (req.header('authorization') !== `Bearer ${cronSecret}`) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const job = await claimPendingRecipeJob();

  if (!job) {
    res.status(200).json({ success: true, data: { claimed: false } });
    return;
  }

  await runRecipeJob({
    jobId: job.id,
    userId: job.user_id,
    householdId: job.household_id,
  });

  res.status(200).json({ success: true, data: { claimed: true, jobId: job.id } });
});

router.get('/process', async (req, res) => {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error('CRON_SECRET is not configured');
    res.status(503).json({ success: false, error: 'Recipe worker is not configured' });
    return;
  }

  if (req.header('authorization') !== `Bearer ${cronSecret}`) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  const job = await claimPendingRecipeJob();

  if (!job) {
    res.status(200).json({ success: true, data: { claimed: false } });
    return;
  }

  await runRecipeJob({
    jobId: job.id,
    userId: job.user_id,
    householdId: job.household_id,
  });

  res.status(200).json({ success: true, data: { claimed: true, jobId: job.id } });
});

router.use(requireAuth);

function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as unknown as AuthenticatedRequest;
}

router.post('/generate', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await createOrReturnRecipeJob({
    userId: request.user.id,
    householdId: request.user.householdId,
  });

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  // Respond before the work starts. recipes_generated is tracked by the job
  // runner now, since at this point nothing has been generated yet.
  res.status(202).json({
    success: true,
    data: result.data,
  });

  // The job is left pending for the cron worker to claim.
  //
  // This used to call runRecipeJob without awaiting it. That only works on a
  // long-running server: Vercel's Express preset wraps the app as a
  // serverless function, so the instance can be frozen the moment the
  // response is sent, and the work silently never finishes. Confirmed by two
  // jobs stuck in 'running' forever on Sept 19.
});

router.get('/jobs/:id', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await getRecipeJob({
    jobId: req.params.id,
    householdId: request.user.householdId,
  });

  if (!result.success) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  res.status(200).json({ success: true, data: result.data });
});

router.get('/', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await listRecipesForUser({
    householdId: request.user.householdId,
  });

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: result.data,
  });
});

router.put('/:id', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const recipeId = req.params.id;
  const body = req.body as UpdateRecipeBody;

  if (typeof body.saved !== 'boolean' && typeof body.cooked !== 'boolean') {
    res.status(400).json({
      success: false,
      error: 'Provide saved and/or cooked as boolean values',
    });
    return;
  }

  const updateInput: {
    householdId: string;
    recipeId: string;
    saved?: boolean;
    cooked?: boolean;
  } = {
    householdId: request.user.householdId,
    recipeId,
  };

  if (typeof body.saved === 'boolean') {
    updateInput.saved = body.saved;
  }

  if (typeof body.cooked === 'boolean') {
    updateInput.cooked = body.cooked;
  }

  const result = await updateRecipeSuggestionFlags(updateInput);

  if (result.success) {
    void trackEvent({
      eventName: typeof body.saved === 'boolean' ? 'recipe_saved' : 'recipe_cooked',
      userId: request.user.id,
      householdId: request.user.householdId,
      properties: {
        cuisine: result.data.cuisine,
        difficulty: result.data.difficulty,
      },
    });
  }

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: result.data,
  });
});

export default router;
