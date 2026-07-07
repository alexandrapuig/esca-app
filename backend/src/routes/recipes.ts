import { Router, type Request } from 'express';

import { generateRecipesForUser, listRecipesForUser, updateRecipeSuggestionFlags } from '../services/recipeService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';

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

  const result = await generateRecipesForUser({
    userId: request.user.id,
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

router.get('/', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await listRecipesForUser({
    userId: request.user.id,
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
    userId: string;
    recipeId: string;
    saved?: boolean;
    cooked?: boolean;
  } = {
    userId: request.user.id,
    recipeId,
  };

  if (typeof body.saved === 'boolean') {
    updateInput.saved = body.saved;
  }

  if (typeof body.cooked === 'boolean') {
    updateInput.cooked = body.cooked;
  }

  const result = await updateRecipeSuggestionFlags(updateInput);

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
