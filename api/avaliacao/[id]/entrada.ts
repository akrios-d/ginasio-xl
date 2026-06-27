/**
 * POST /api/avaliacao/:id/entrada
 * Adiciona uma nova medicao (linha) a uma ficha de avaliacao existente.
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../../../server/lib/cors.js';
import { getCollection, toId } from '../../../server/lib/db.js';
import { requireSession } from '../../../server/lib/session.js';
import { AddEntradaAvaliacaoSchema } from '../../../server/schemas/avaliacao.schema.js';
import { auditLog } from '../../../server/lib/audit.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = req.query as { id: string };
  const col = await getCollection('avaliacoes');

  try {
    const _id = toId(id);
    const entrada = AddEntradaAvaliacaoSchema.parse(req.body);

    // Snapshot the current avaliacoes array before pushing
    const before = await col.findOne({ _id }, { projection: { avaliacoes: 1 } });
    if (!before) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    const now = new Date();
    const result = await col.updateOne(
      { _id },
      {
        $push: { avaliacoes: entrada } as any,
        $set: { updatedAt: now },
      },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    await auditLog({
      timestamp: now,
      userId,
      collection: 'avaliacoes',
      documentId: id,
      action: 'add_entrada',
      before: { avaliacoes: before['avaliacoes'] ?? [] } as Record<string, unknown>,
      payload: entrada as Record<string, unknown>,
    });

    res.status(201).json({ added: true });
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
