/**
 * GET  /api/programa-treino        — lista programas (do aluno autenticado ou de um aluno específico para PTs)
 * POST /api/programa-treino        — cria novo programa
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';
import {
  CreateProgramaTreinoSchema,
  ListProgramaTreinoSchema,
} from '../server/schemas/programa-treino.schema.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const col = await getCollection('programas-treino');

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { alunoId } = ListProgramaTreinoSchema.parse(req.query);

      // Por padrão devolve os programas do próprio utilizador;
      // um professor pode passar ?alunoId=<outro id>
      const filter = { alunoId: alunoId ?? userId, ativo: true };

      const docs = await col.find(filter).sort({ data: -1 }).toArray();
      res.status(200).json(docs.map(mapDocumentId));
      return;
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = CreateProgramaTreinoSchema.parse(req.body);

      const now = new Date();
      const result = await col.insertOne({
        ...body,
        criadoPorId: userId,
        ativo: true,
        createdAt: now,
        updatedAt: now,
      });

      res.status(201).json({ id: result.insertedId.toString() });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.issues });
      return;
    }
    console.error('[programa-treino]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
