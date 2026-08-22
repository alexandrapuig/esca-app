import { Router, type Request } from 'express';

import { CURRENT_TERMS_VERSION } from '../config/terms';
import { deleteAccount } from '../services/accountService';
import { acceptTerms, getUserProfile, getUserStats, updateUserProfile } from '../services/userService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';

type UpdateProfileBody = {
  name?: string;
  dietary_restrictions?: string[];
};

const router = Router();

router.use(requireAuth);

function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as unknown as AuthenticatedRequest;
}

router.get('/profile', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const result = await getUserProfile(request.user.id);

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  res.status(200).json({
    success: true,
    data: {
      ...result.data,
      termsAccepted: result.data.terms_version === CURRENT_TERMS_VERSION,
    },
  });
});

router.post('/accept-terms', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const result = await acceptTerms(request.user.id, CURRENT_TERMS_VERSION);

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

router.put('/profile', async (req, res) => {
  const body = req.body as UpdateProfileBody;
  const request = getAuthenticatedRequest(req);

  const result = await updateUserProfile(request.user.id, body);

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

router.get('/stats', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const result = await getUserStats(request.user.id);

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

router.delete('/account', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const result = await deleteAccount(request.user.id);

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
