import { createMiddleware } from '@tanstack/react-start';

export const authMiddleware = createMiddleware({ type: 'function' }).server(async ({ next }) => {
  const { getSessionToken, verifyJwt } = await import('./auth.server');
  const token = getSessionToken();
  if (!token) {
    throw new Error('Unauthorized');
  }

  const session = verifyJwt(token);
  return next({ context: { session } });
});
