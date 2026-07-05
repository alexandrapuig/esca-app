import { Router } from 'express';

import { authenticateUser } from '../services/authService';

type AuthRequestBody = {
  accessToken?: string;
};

const router = Router();

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

async function handleAuthenticate(
  authorizationHeader: string | undefined,
  body: AuthRequestBody,
): Promise<{ status: number; payload: Record<string, unknown> }> {
  const accessToken = getAccessToken(authorizationHeader, body);

  if (!accessToken) {
    return {
      status: 400,
      payload: {
        success: false,
        error: 'Provide an access token in the request body or Authorization header',
      },
    };
  }

  const result = await authenticateUser(accessToken);

  if (!result.success) {
    return {
      status: result.status,
      payload: {
        success: false,
        error: result.error,
      },
    };
  }

  return {
    status: 200,
    payload: {
      success: true,
      data: {
        user: result.data,
      },
    },
  };
}

router.post('/login', async (req, res) => {
  const response = await handleAuthenticate(req.header('authorization'), req.body as AuthRequestBody);

  res.status(response.status).json(response.payload);
});

router.post('/session', async (req, res) => {
  const response = await handleAuthenticate(req.header('authorization'), req.body as AuthRequestBody);

  res.status(response.status).json(response.payload);
});

export default router;