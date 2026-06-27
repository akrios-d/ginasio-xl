/**
 * DB abstraction layer.
 * Set  DB_PROVIDER=mongo  (default) or  DB_PROVIDER=dynamo  to switch backends.
 *
 * Both providers expose the same Collection interface so API routes are identical.
 */
import { ObjectId } from 'mongodb';
import {
  getCollection as mongoGetCollection,
  mapDocumentId as mongoMapDocumentId,
} from './mongo.js';
import { getDynamoCollection } from './dynamo-provider.js';

const PROVIDER = (process.env['DB_PROVIDER'] ?? 'mongo').toLowerCase();

export const isDynamo = PROVIDER === 'dynamo';

// ── getCollection ─────────────────────────────────────────────────────────────

export async function getCollection(name: string): Promise<any> {
  if (isDynamo) {
    return getDynamoCollection(name);
  }
  return mongoGetCollection(name);
}

// ── mapDocumentId ─────────────────────────────────────────────────────────────
// Works for both: MongoDB returns ObjectId (needs .toString()), DynamoDB returns string UUID.

export function mapDocumentId<T extends Record<string, unknown>>(document: T) {
  const { _id, ...rest } = document;
  return { _id: String(_id), ...rest };
}

// ── toId ──────────────────────────────────────────────────────────────────────
// Use this instead of new ObjectId(id) in API routes.
// MongoDB mode: returns ObjectId; DynamoDB mode: returns plain string.

export function toId(id: string): ObjectId | string {
  if (isDynamo) return id;
  if (!ObjectId.isValid(id)) {
    const err = new Error(`Invalid ID: ${id}`);
    (err as any).status = 400;
    throw err;
  }
  return new ObjectId(id);
}

// Keep toObjectId as alias for backwards-compat (mongo-only routes)
export { toId as toObjectId };

// ── isValidId ─────────────────────────────────────────────────────────────────

export function isValidId(id: string): boolean {
  if (isDynamo) return typeof id === 'string' && id.length > 0;
  return ObjectId.isValid(id);
}
