/**
 * GET    /api/perfis?role=teacher|student — list profiles
 * POST   /api/perfis                      — teacher links a student { studentUserId }
 * DELETE /api/perfis?studentUserId=xxx    — teacher unlinks a student
 */
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';
import { clientPromise, AUTH_DB_NAME } from '../server/lib/auth.config.js';

/** Look up display name from Auth.js users collection */
async function getAuthName(userId: string): Promise<string | null> {
  try {
    const client = await clientPromise;
    const user = await client
      .db(AUTH_DB_NAME)
      .collection('users')
      .findOne({ _id: userId as unknown as import('mongodb').ObjectId });
    return (user?.['name'] as string | null) ?? (user?.['email'] as string | null) ?? null;
  } catch {
    return null;
  }
}

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
      if (role === 'myteachers') {
        // Return the teachers associated with the current user (student view)
        const myPerfil = await col.findOne({ userId });
        const teacherIds: string[] = Array.isArray(myPerfil?.teacherIds) ? myPerfil.teacherIds : [];
        if (teacherIds.length === 0) {
          res.status(200).json([]);
          return;
        }
        docs = await col
          .find({ userId: { $in: teacherIds } })
          .project({ userId: 1, name: 1, email: 1 })
          .toArray();
        res.status(200).json(docs.map(mapDocumentId));
        return;
      } else if (role === 'student') {
        docs = await col
          .find({ teacherIds: userId })
          .project({ userId: 1, name: 1, email: 1 })
          .toArray();

        // Enrich name from Auth.js for students whose name is missing or equals their userId
        docs = await Promise.all(
          docs.map(async (d) => {
            if (!d.name || d.name === d.userId) {
              const authName = await getAuthName(d.userId);
              if (authName) {
                // Persist the fix so next call is fast
                await col.updateOne({ userId: d.userId }, { $set: { name: authName } });
                return { ...d, name: authName };
              }
            }
            return d;
          }),
        );
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

      // Resolve name from Auth.js if missing/bad
      let displayName = student.name && student.name !== studentUserId ? student.name : null;
      if (!displayName) {
        displayName = await getAuthName(studentUserId);
        if (displayName) {
          await col.updateOne({ userId: studentUserId }, { $set: { name: displayName } });
        }
      }

      res.status(200).json({
        linked: true,
        name: displayName ?? student.email ?? studentUserId,
        email: student.email,
      });
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
        { $pull: { teacherIds: userId } as any, $set: { updatedAt: new Date() } },
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
