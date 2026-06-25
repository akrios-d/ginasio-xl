/**
 * GET /api/perfis?isProfessor=true — lista perfis de professors/PTs
 */
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const col = await getCollection('perfis');
    const docs = await col
      .find({ isProfessor: true })
      .project({ userId: 1, nome: 1, email: 1 })
      .toArray();

    res.status(200).json(docs.map(mapDocumentId));
  } catch (err) {
    console.error('[perfis]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
