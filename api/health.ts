/**
 * GET /api/health
 *
 * Lightweight liveness probe. Use this endpoint as a template for new handlers:
 *   1. setCors + short-circuit OPTIONS
 *   2. validate req (Zod) if inputs exist
 *   3. do the work
 *   4. return JSON, handle ZodError → 400, everything else → 500
 */
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection } from '../server/lib/db.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);

  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let db = 'ok';
  try {
    await getCollection('_health_ping');
  } catch (e: any) {
    db = e?.message ?? 'error';
  }

  res.status(200).json({
    status: 'ok',
    service: 'ginasio-xl',
    timestamp: new Date().toISOString(),
    db,
  });
}
