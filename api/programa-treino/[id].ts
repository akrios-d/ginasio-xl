/**
 * GET    /api/programa-treino/:id  — detalhe
 * PUT    /api/programa-treino/:id  — actualiza
 * DELETE /api/programa-treino/:id  — soft-delete (ativo: false)
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../../server/lib/cors.js';
import { getCollection, toObjectId, mapDocumentId } from '../../server/lib/mongo.js';
import { requireSession } from '../../server/lib/session.js';
import { UpdateProgramaTreinoSchema } from '../../server/schemas/programa-treino.schema.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const { id } = req.query as { id: string };
  const col = await getCollection('programas-treino');

  try {
    const _id = toObjectId(id);

    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const doc = await col.findOne({ _id, ativo: true });
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(mapDocumentId(doc));
      return;
    }

    // ── PUT ──────────────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const body = UpdateProgramaTreinoSchema.parse(req.body);

      const result = await col.updateOne({ _id }, { $set: { ...body, updatedAt: new Date() } });
      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json({ updated: true });
      return;
    }

    // ── DELETE (soft) ─────────────────────────────────────────────────────────
    if (req.method === 'DELETE') {
      const result = await col.updateOne(
        { _id },
        { $set: { ativo: false, updatedAt: new Date() } },
      );
      if (result.matchedCount === 0) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json({ deleted: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.issues });
      return;
    }
    const status = (err as any).status ?? 500;
    res
      .status(status)
      .json({ error: status === 400 ? (err as Error).message : 'Internal server error' });
  }
}
