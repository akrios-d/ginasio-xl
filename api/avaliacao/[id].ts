/**
 * GET    /api/avaliacao/:id  -- detalhe
 * PUT    /api/avaliacao/:id  -- actualiza ficha (metas, objetivo, sharedWithTeacherIds)
 * DELETE /api/avaliacao/:id  -- remove
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../../server/lib/cors.js';
import { getCollection, toId, mapDocumentId } from '../../server/lib/db.js';
import { requireSession } from '../../server/lib/session.js';
import { UpdateAvaliacaoSchema } from '../../server/schemas/avaliacao.schema.js';
import { auditLog } from '../../server/lib/audit.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const { id } = req.query as { id: string };
  const col = await getCollection('avaliacoes');

  try {
    const _id = toId(id);

    if (req.method === 'GET') {
      const doc = await col.findOne({
        _id,
        $or: [{ studentId: userId }, { createdById: userId }, { sharedWithTeacherIds: userId }],
      });
      if (!doc) {
        res.status(404).json({ error: 'Not found' });
        return;
      }
      res.status(200).json(mapDocumentId(doc));
      return;
    }

    if (req.method === 'PUT') {
      const body = UpdateAvaliacaoSchema.parse(req.body);

      // Snapshot before changing (for audit recovery)
      const before = await col.findOne({
        _id,
        $or: [{ studentId: userId }, { createdById: userId }],
      });
      if (!before) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      const now = new Date();
      await col.updateOne({ _id }, { $set: { ...body, updatedAt: now } });

      // Determine action label: share update vs generic update
      const action =
        Object.keys(body).length === 1 && 'sharedWithTeacherIds' in body ? 'share' : 'update';

      await auditLog({
        timestamp: now,
        userId,
        collection: 'avaliacoes',
        documentId: id,
        action,
        before: before as Record<string, unknown>,
        payload: body as Record<string, unknown>,
      });

      res.status(200).json({ updated: true });
      return;
    }

    if (req.method === 'DELETE') {
      // Snapshot before deleting
      const before = await col.findOne({
        _id,
        $or: [{ studentId: userId }, { createdById: userId }],
      });
      if (!before) {
        res.status(404).json({ error: 'Not found' });
        return;
      }

      await col.deleteOne({ _id });

      await auditLog({
        timestamp: new Date(),
        userId,
        collection: 'avaliacoes',
        documentId: id,
        action: 'delete',
        before: before as Record<string, unknown>,
      });

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
