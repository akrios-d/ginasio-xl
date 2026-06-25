/**
 * GET  /api/perfil  — devolve o perfil do utilizador autenticado
 * PUT  /api/perfil  — cria ou actualiza o perfil (upsert)
 */
import { ZodError } from 'zod';
import { setCors, handleOptions } from '../server/lib/cors.js';
import { getCollection, mapDocumentId } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';
import { clientPromise, AUTH_DB_NAME } from '../server/lib/auth.config.js';
import { UpsertPerfilSchema } from '../server/schemas/perfil.schema.js';

/** Reads the display name and email for a userId from Auth.js users collection. */
async function getAuthUser(userId: string): Promise<{ name: string | null; email: string | null }> {
  try {
    const client = await clientPromise;
    const user = await client
      .db(AUTH_DB_NAME)
      .collection('users')
      .findOne({ _id: userId as unknown as import('mongodb').ObjectId });
    return {
      name: (user?.['name'] as string | null) ?? null,
      email: (user?.['email'] as string | null) ?? null,
    };
  } catch {
    return { name: null, email: null };
  }
}

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  const userId = await requireSession(req, res);
  if (!userId) return;

  const col = await getCollection('perfis');

  try {
    // ── GET ──────────────────────────────────────────────────────────────────
    if (req.method === 'GET') {
      const doc = await col.findOne({ userId });
      if (!doc) {
        res.status(404).json({ error: 'Perfil não encontrado' });
        return;
      }
      res.status(200).json(mapDocumentId(doc));
      return;
    }

    // ── PUT (upsert) ─────────────────────────────────────────────────────────
    if (req.method === 'PUT') {
      const body = UpsertPerfilSchema.parse(req.body);
      const now = new Date();

      // Auto-populate nome from Google on first insert
      const authUser = await getAuthUser(userId);

      await col.updateOne(
        { userId },
        {
          $set: { ...body, updatedAt: now },
          $setOnInsert: {
            userId,
            role: 'aluno',
            nome: authUser.name ?? authUser.email ?? userId,
            email: authUser.email ?? '',
            createdAt: now,
          },
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
    console.error('[perfil]', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}
