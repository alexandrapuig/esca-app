import { Router, type Request } from 'express';

import { createOrReturnRecipeJob, getRecipeJob, listRecipesForUser, runRecipeJob, updateRecipeSuggestionFlags } from '../services/recipeService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';
import { trackEvent } from '../services/analyticsService';

type UpdateRecipeBody = {
  saved?: boolean;
  cooked?: boolean;
};

const router = Router();

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

  // Deliberately not awaited: the response is already sent.
  if (result.created) {
    void runRecipeJob({
      jobId: result.data.id,
      userId: request.user.id,
      householdId: request.user.householdId,
    });
  }
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
