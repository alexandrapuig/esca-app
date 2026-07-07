import { Router, type Request } from 'express';

import { generatePredictionsForUser, getLatestPredictionsForUser } from '../services/predictionService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';

const router = Router();

router.use(requireAuth);

function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as unknown as AuthenticatedRequest;
}

router.post('/generate', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await generatePredictionsForUser({
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

router.get('/latest', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await getLatestPredictionsForUser({
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

export default router;
