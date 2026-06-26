/**
 * GET  /api/avaliacao   — lista fichas de avaliacao
 * POST /api/avaliacao   — cria nova ficha
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';
import { CreateAvaliacaoSchema } from '../server/schemas/avaliacao.schema.js';
import { auditLog } from '../server/lib/audit.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const col = await getCollection('avaliacoes');

  try {
    // GET
    if (req.method === 'GET') {
      const studentId = (req.query as any).studentId as string | undefined;

      if (studentId) {
        const perfisCol = await getCollection('perfis');
        const studentPerfil = await perfisCol.findOne({ userId: studentId });
        const isAssociated =
          Array.isArray(studentPerfil?.teacherIds) && studentPerfil.teacherIds.includes(userId);

        if (!isAssociated) {
          res.status(403).json({ error: 'Forbidden: student not associated with this teacher' });
          return;
        }
      }

      const query = studentId
        ? { studentId }
        : { $or: [{ studentId: userId }, { sharedWithTeacherIds: userId }] };

      const docs = await col.find(query).sort({ createdAt: -1 }).toArray();
      res.status(200).json(docs.map(mapDocumentId));
      return;
    }

    // POST
    if (req.method === 'POST') {
      const body = CreateAvaliacaoSchema.parse(req.body);

      const now = new Date();
      const result = await col.insertOne({
        ...body,
        createdById: userId,
        createdAt: now,
        updatedAt: now,
      });

      await auditLog({
        timestamp: now,
        userId,
        collection: 'avaliacoes',
        documentId: result.insertedId.toString(),
        action: 'create',
        payload: body as Record<string, unknown>,
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
    console.error('[avaliacao]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
