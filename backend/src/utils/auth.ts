import type { Request, Response, NextFunction } from 'express';

import { authenticateUser, type AuthenticatedUser } from '../services/authService';

type AuthRequestBody = {
  accessToken?: string;
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

function getAccessToken(authorizationHeader: string | undefined, body: AuthRequestBody): string | null {
  if (body.accessToken) {
    return body.accessToken;
  }

  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const accessToken = getAccessToken(req.header('authorization'), req.body as AuthRequestBody);

  if (!accessToken) {
    res.status(401).json({
      success: false,
      error: 'Missing access token',
    });
    return;
  }

  const result = await authenticateUser(accessToken);

  if (!result.success) {
    res.status(result.status).json({
      success: false,
      error: result.error,
    });
    return;
  }

  (req as AuthenticatedRequest).user = result.data;
  next();
}
