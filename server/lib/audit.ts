/**
 * Audit log utility — writes a record to the `audit_logs` collection
 * before every destructive or mutating operation on assessments.
 *
 * Each log entry captures:
 *   - who did it (userId)
 *   - what collection / document was affected
 *   - what action was taken
 *   - the full document snapshot BEFORE the change (for recovery)
 *   - the payload that was applied
 */
import { getCollection } from './mongo.js';

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'add_entrada'
  | 'update_entrada'
  | 'share';

export interface AuditEntry {
  timestamp: Date;
  userId: string;
  collection: string;
  documentId: string;
  action: AuditAction;
  /** Full document state before the change (omit for creates) */
  before?: Record<string, unknown>;
  /** Payload / diff that was applied */
  payload?: Record<string, unknown>;
}

/**
 * Write one audit log entry.
 * Fire-and-forget safe: errors are swallowed so a log failure never
 * blocks the real operation — but they are printed to stderr.
 */
export async function auditLog(entry: AuditEntry): Promise<void> {
  try {
    const col = await getCollection('audit_logs');
    await col.insertOne({ ...entry });
  } catch (err) {
    console.error('[audit] Failed to write log entry:', err);
  }
}
