import { Router, type Request } from 'express';

import {
  acceptHouseholdInvite,
  createHouseholdInvite,
  getHouseholdSummary,
  revokeHouseholdInvite,
} from '../services/householdService';
import { requireAuth, type AuthenticatedRequest } from '../utils/auth';

const router = Router();

router.use(requireAuth);

function getAuthenticatedRequest(req: Request): AuthenticatedRequest {
  return req as unknown as AuthenticatedRequest;
}

/** Members, pending invites, and whether this user may manage them. */
router.get('/', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await getHouseholdSummary({
    userId: request.user.id,
    householdId: request.user.householdId,
  });

  if (!result.success) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  res.status(200).json({ success: true, data: result.data });
});

/** Mints a single-use "join my household" token. */
router.post('/invites', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await createHouseholdInvite({
    userId: request.user.id,
    householdId: request.user.householdId,
  });

  if (!result.success) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  res.status(201).json({ success: true, data: result.data });
});

router.delete('/invites/:id', async (req, res) => {
  const request = getAuthenticatedRequest(req);

  const result = await revokeHouseholdInvite({
    userId: request.user.id,
    householdId: request.user.householdId,
    inviteId: req.params.id,
  });

  if (!result.success) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  res.status(200).json({ success: true, data: result.data });
});

/**
 * Accepting moves the joiner's items into the new household and deletes the
 * one they came from.
 */
router.post('/join', async (req, res) => {
  const request = getAuthenticatedRequest(req);
  const body = req.body as { token?: string };

  if (typeof body.token !== 'string' || !body.token.trim()) {
    res.status(400).json({ success: false, error: 'An invite token is required' });
    return;
  }

  const result = await acceptHouseholdInvite({
    userId: request.user.id,
    token: body.token.trim(),
  });

  if (!result.success) {
    res.status(result.status).json({ success: false, error: result.error });
    return;
  }

  res.status(200).json({ success: true, data: result.data });
});

export default router;
