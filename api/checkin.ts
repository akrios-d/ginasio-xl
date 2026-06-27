/**
 * GET  /api/checkin        — list check-ins for the authenticated user
 *                            ?from=YYYY-MM-DD&to=YYYY-MM-DD
 * POST /api/checkin        — create a check-in
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/db.js';
import { requireSession } from '../server/lib/session.js';
import { CreateCheckinSchema, ListCheckinSchema } from '../server/schemas/checkin.schema.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const col = await getCollection('checkins');

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const { from, to } = ListCheckinSchema.parse(req.query);
      const studentId = (req.query as any).studentId as string | undefined;

      // Teacher querying a student's check-ins — verify association
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

      const targetUserId = studentId ?? userId;
      const filter: Record<string, unknown> = { userId: targetUserId };
      if (from ?? to) {
        filter['data'] = {
          ...(from ? { $gte: new Date(from) } : {}),
          ...(to ? { $lte: new Date(to) } : {}),
        };
      }

      const docs = await col.find(filter).sort({ data: -1 }).toArray();
      res.status(200).json(docs.map(mapDocumentId));
      return;
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (req.method === 'POST') {
      const body = CreateCheckinSchema.parse(req.body);

      const result = await col.insertOne({
        ...body,
        userId,
        createdAt: new Date(),
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
    console.error('[checkin]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
