/**
 * MongoDB helper for Vercel Serverless Functions.
 *
 * - The client is module-scoped and reused across invocations (warm starts).
 * - `attachDatabasePool` lets Vercel drain connections cleanly between deploys.
 * - DB name defaults to `ginasio-xl` — override via MONGODB_DB_NAME.
 */
import { MongoClient, ObjectId } from 'mongodb';
import { attachDatabasePool } from '@vercel/functions';

const uri = process.env['MONGODB_URI'];
const dbName = process.env['MONGODB_DB_NAME'] || 'gymdesk';

if (!uri) {
  throw new Error('MONGODB_URI is not defined — set it in .env.local or Vercel env settings');
}

const client = new MongoClient(uri, {
  appName: 'ginasio-xl',
  maxIdleTimeMS: 5000,
});

attachDatabasePool(client);

async function getDatabase() {
  await client.connect();
  return client.db(dbName);
}

export async function getCollection(name: string) {
  const db = await getDatabase();
  return db.collection(name);
}

/** Throws a 400-coded error if `id` isn't a valid ObjectId. */
export function toObjectId(id: string): ObjectId {
  if (!ObjectId.isValid(id)) {
    const err = new Error(`Invalid ID: ${id}`);
    (err as any).status = 400;
    throw err;
  }
  return new ObjectId(id);
}

/** Converts Mongo's `_id` to a string `id` while preserving the rest of the document. */
export function mapDocumentId<T extends Record<string, any>>(document: T) {
  const { _id, ...rest } = document;
  return { id: _id.toString(), ...rest };
}
