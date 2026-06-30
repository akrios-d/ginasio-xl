/**
 * GET  /api/anamnesis            — returns the authenticated user's own anamnesis
 * GET  /api/anamnesis?userId=xxx — teacher reads a linked student's anamnesis
 * PUT  /api/anamnesis            — upserts the authenticated user's own anamnesis
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';
import { UpsertAnamnesisSchema } from '../server/schemas/anamnesis.schema.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const col = await getCollection('anamnesis');

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const targetUserId = (req.query as any).userId as string | undefined;

      if (targetUserId && targetUserId !== userId) {
        // Teacher requesting a student's anamnesis — verify association
        const perfisCol = await getCollection('perfis');
        const studentPerfil = await perfisCol.findOne({ userId: targetUserId });
        const isAssociated =
          Array.isArray(studentPerfil?.teacherIds) && studentPerfil.teacherIds.includes(userId);
        if (!isAssociated) {
          res.status(403).json({ error: 'Forbidden: student not associated with this teacher' });
          return;
        }
        const doc = await col.findOne({ userId: targetUserId });
        res.status(200).json(doc ? mapDocumentId(doc) : null);
        return;
      }

      const doc = await col.findOne({ userId });
      res.status(200).json(doc ? mapDocumentId(doc) : null);
      return;
    }

    // ── PUT (upsert) ─────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const body = UpsertAnamnesisSchema.parse(req.body);
      const now = new Date();

      await col.updateOne(
        { userId },
        {
          $set: { ...body, updatedAt: now },
          $setOnInsert: { userId, createdAt: now },
        },
        { upsert: true },
      );

      res.status(200).json({ saved: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation error', details: err.issues });
      return;
    }
    console.error('[anamnesis]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
