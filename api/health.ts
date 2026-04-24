/**
 * GET /api/health
 *
 * Lightweight liveness probe. Returns 200 with build info if the function can
 * boot; 500 if Mongo is misconfigured (Mongo throws on import when MONGODB_URI
 * is missing — see api/lib/mongo.ts).
 *
 * Use this endpoint as a template for new handlers. The same pattern applies:
 *   1. setCors + short-circuit OPTIONS
 *   2. validate req (Zod) if inputs exist
 *   3. do the work
 *   4. return JSON, handle ZodError → 400, everything else → 500
 */
const { setCors, handleOptions } = require('./lib/cors');

module.exports = async function handler(req: any, res: any): Promise<any> {
  setCors(res);

  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    status: 'ok',
    service: 'ginasio-xl',
    timestamp: new Date().toISOString(),
  });
};
