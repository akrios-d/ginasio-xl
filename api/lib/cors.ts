/**
 * CORS + security headers for Vercel Serverless Functions.
 *
 * Call `setCors(res, { origin: 'https://yourdomain.com' })` at the top of each handler.
 * In production, prefer an explicit origin over '*' so credentialled requests work.
 */
interface CorsOptions {
  origin?: string;
  methods?: string[];
  headers?: string[];
}

function setCors(res: any, options?: CorsOptions) {
  const {
    origin = '*',
    methods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    headers = ['Content-Type'],
  } = options || {};

  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', methods.join(','));
  res.setHeader('Access-Control-Allow-Headers', headers.join(','));

  // Security headers — cheap defence in depth.
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
}

function handleOptions(req: any, res: any): boolean {
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

module.exports = {
  setCors,
  handleOptions,
};
