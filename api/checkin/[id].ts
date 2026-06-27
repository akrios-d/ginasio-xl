/**
 * DELETE /api/checkin/:id  — remove a check-in owned by the current user
 * PATCH  /api/checkin/:id  — update cargas/notas on a check-in
 */
import { setCors, handleOptions } from '../../server/lib/cors.js';
import { getCollection, isValidId } from '../../server/lib/db.js';
import { requireSession } from '../../server/lib/session.js';
import { UpdateCheckinSchema } from '../../server/schemas/checkin.schema.js';
import { ZodError } from 'zod';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const { id } = req.query as { id: string };
  if (!isValidId(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const col = await getCollection('checkins');

  // ── PATCH ─────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    try {
      const body = UpdateCheckinSchema.parse(req.body);
      const result = await col.updateOne({ _id: id, userId }, { $set: body });
      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json({ updated: true });
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({ error: err.issues });
      } else {
        res.status(500).json({ error: 'Internal error' });
      }
    }
    return;
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await col.deleteOne({ _id: id, userId });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.status(200).json({ deleted: true });
}
