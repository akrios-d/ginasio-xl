/**
 * GET    /api/perfis?role=teacher|student — list profiles
 * POST   /api/perfis                      — teacher links a student { studentUserId }
 * DELETE /api/perfis?studentUserId=xxx    — teacher unlinks a student
 */
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  try {
    const col = await getCollection('perfis');

    // ── GET ───────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const role = (req.query as any).role as string | undefined;

      let docs: any[];
      if (role === 'student') {
        docs = await col
          .find({ teacherIds: userId })
          .project({ userId: 1, name: 1, email: 1 })
          .toArray();
      } else {
        docs = await col
          .find({ roles: 'teacher' })
          .project({ userId: 1, name: 1, email: 1 })
          .toArray();
      }

      res.status(200).json(docs.map(mapDocumentId));
      return;
    }

    // ── POST — teacher links a student ────────────────────────────────────────
    if (req.method === 'POST') {
      const { studentUserId } = req.body ?? {};
      if (!studentUserId) {
        res.status(400).json({ error: 'studentUserId required' });
        return;
      }

      // Verify caller has teacher role
      const callerPerfil = await col.findOne({ userId });
      if (!Array.isArray(callerPerfil?.roles) || !callerPerfil.roles.includes('teacher')) {
        res.status(403).json({ error: 'Forbidden: teacher role required' });
        return;
      }

      // Verify student exists
      const student = await col.findOne({ userId: studentUserId });
      if (!student) {
        res.status(404).json({ error: 'Student not found' });
        return;
      }

      await col.updateOne(
        { userId: studentUserId },
        { $addToSet: { teacherIds: userId }, $set: { updatedAt: new Date() } },
      );

      res.status(200).json({ linked: true, name: student.name, email: student.email });
      return;
    }

    // ── DELETE — teacher unlinks a student ────────────────────────────────────
    if (req.method === 'DELETE') {
      const studentUserId = (req.query as any).studentUserId as string | undefined;
      if (!studentUserId) {
        res.status(400).json({ error: 'studentUserId required' });
        return;
      }

      await col.updateOne(
        { userId: studentUserId },
        { $pull: { teacherIds: userId }, $set: { updatedAt: new Date() } },
      );

      res.status(200).json({ unlinked: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[perfis]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
