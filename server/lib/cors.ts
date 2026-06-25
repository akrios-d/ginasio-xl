/**
 * CORS + security headers for Vercel Serverless Functions.
 *
 * Call `setCors(res, req)` at the top of each handler.
 * The request Origin is echoed back so credentialled requests work from any
 * allowed client (local dev on localhost:4200, Vercel preview URLs, etc.).
 * Session auth provides the real access control.
 */
export function setCors(res: any, req?: any): void {
  const origin = req?.headers?.origin ?? '*';

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type,Authorization,X-Dev-Token,X-Dev-User-Id',
  );
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

export function handleOptions(req: any, res: any): boolean {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}
