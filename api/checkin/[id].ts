/**
 * DELETE /api/checkin/:id  — remove a check-in owned by the current user
 */
import { setCors, handleOptions } from '../../server/lib/cors.js';
import { getCollection } from '../../server/lib/mongo.js';
import { requireSession } from '../../server/lib/session.js';
import { ObjectId } from 'mongodb';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  if (req.method !== 'DELETE') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query as { id: string };
  if (!ObjectId.isValid(id)) {
    res.status(400).json({ error: 'Invalid id' });
    return;
  }

  const col = await getCollection('checkins');
  const result = await col.deleteOne({ _id: new ObjectId(id), userId });

  if (result.deletedCount === 0) {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  res.status(200).json({ deleted: true });
}
