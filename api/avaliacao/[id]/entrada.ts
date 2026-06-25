/**
 * POST /api/avaliacao/:id/entrada
 * Adiciona uma nova medição (linha) a uma ficha de avaliação existente.
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../../../server/lib/cors.js';
import { getCollection, toObjectId } from '../../../server/lib/mongo.js';
import { requireSession } from '../../../server/lib/session.js';
import { AddEntradaAvaliacaoSchema } from '../../../server/schemas/avaliacao.schema.js';

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
    const _id = toObjectId(id);
    const entrada = AddEntradaAvaliacaoSchema.parse(req.body);

    const result = await col.updateOne(
      { _id },
      {
        $push: { avaliacoes: entrada } as any,
        $set: { updatedAt: new Date() },
      },
    );

    if (result.matchedCount === 0) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

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
