/**
 * /api/auth/*  — Auth.js handler.
 *
 * The wildcard route in vercel.json forwards every /api/auth/* path here:
 *   /api/auth/csrf, /api/auth/signin/github, /api/auth/callback/google, ...
 *
 * Auth.js works on Web Fetch primitives, so we adapt Node req/res via the helpers
 * in server/lib/session.ts.
 */
import { Auth } from '@auth/core';
import { authConfig } from '../server/lib/auth.config.js';
import { fromWebResponse, toWebRequest } from '../server/lib/session.js';

export default async function handler(req: any, res: any): Promise<void> {
  const request = toWebRequest(req);
  const response = await Auth(request, authConfig);
  await fromWebResponse(response, res);
}
