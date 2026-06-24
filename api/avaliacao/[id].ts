/**
 * GET    /api/avaliacao/:id           — detalhe
 * PUT    /api/avaliacao/:id           — actualiza ficha (metas, objetivo, etc.)
 * DELETE /api/avaliacao/:id           — remove
 * POST   /api/avaliacao/:id/entrada   — adiciona uma nova medição  →  ver [id]/entrada.ts
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../../server/lib/cors.js';
import { getCollection, toObjectId, mapDocumentId } from '../../server/lib/mongo.js';
import { requireSession } from '../../server/lib/session.js';
import { UpdateAvaliacaoSchema } from '../../server/schemas/avaliacao.schema.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const { id } = req.query as { id: string };
  const col = await getCollection('avaliacoes');

  try {
    const _id = toObjectId(id);

    if (req.method === 'GET') {
      const doc = await col.findOne({ _id });
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(mapDocumentId(doc));
      return;
    }

    if (req.method === 'PUT') {
      const body = UpdateAvaliacaoSchema.parse(req.body);
      const result = await col.updateOne({ _id }, { $set: { ...body, updatedAt: new Date() } });
      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json({ updated: true });
      return;
    }

    if (req.method === 'DELETE') {
      const result = await col.deleteOne({ _id });
      if (result.deletedCount === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.errors });
      return;
    }
    const status = (err as any).status ?? 500;
    res
      .status(status)
      .json({ error: status === 400 ? (err as Error).message : 'Internal server error' });
  }
}
