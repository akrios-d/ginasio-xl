/**
 * GET /api/session
 *
 * Returns the authenticated user's profile, or 401 if no valid session cookie.
 * The frontend calls this once on boot to hydrate AuthService.
 */
import { ObjectId } from 'mongodb';
import { handleOptions, setCors } from '../server/lib/cors.js';
import { getCollection } from '../server/lib/mongo.js';
import { requireSession } from '../server/lib/session.js';

export default async function handler(req: any, res: any): Promise<void> {
  setCors(res, req);
  if (handleOptions(req, res)) return;

  if (req.method !== 'GET') {
    res.status(405).end();
    return;
  }

  const userId = await requireSession(req, res);
  if (!userId) return;

  const users = await getCollection('users');
  const user = await users.findOne({ _id: new ObjectId(userId) });

  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  res.json({
    user: {
      id: userId,
      name: user['name'] ?? null,
      email: user['email'] ?? null,
      image: user['image'] ?? null,
    },
  });
}
