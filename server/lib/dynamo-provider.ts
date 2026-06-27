/**
 * DynamoDB provider — mirrors the MongoDB Collection API so API routes need no changes.
 * Table design (per collection):
 *   checkins, avaliacoes, programas-treino  →  PK: _id (UUID)  GSI: userId-index (PK: userId)
 *   perfis                                  →  PK: userId
 *   users                                   →  PK: _id
 *
 * Tables are created via scripts/dynamo-bootstrap.ts.
 * Set DYNAMO_TABLE_PREFIX (default: "gymdesk-") to namespace tables per environment.
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

// ── Client ────────────────────────────────────────────────────────────────────

const dynamoClient = new DynamoDBClient({
  region: process.env['AWS_REGION'] ?? 'us-east-1',
});
const dynamo = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: { removeUndefinedValues: true },
});

const TABLE_PREFIX = process.env['DYNAMO_TABLE_PREFIX'] ?? 'gymdesk-';

function tableName(collection: string): string {
  return TABLE_PREFIX + collection;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type DocRecord = Record<string, unknown>;

/** Normalise any ID value to a string (handles MongoDB ObjectId objects). */
function idStr(v: unknown): string {
  return typeof v === 'string' ? v : String(v);
}

/** Collections where PK is userId (no separate _id key). */
const USER_PK_TABLES = new Set(['perfis']);

/** Fields that hold arrays and should use contains() in filter expressions. */
const ARRAY_FIELDS = new Set(['teacherIds', 'roles', 'sharedWithTeacherIds']);

// ── Cursor (for .find().sort().toArray() chain) ───────────────────────────────

class DynamoCursor {
  private _sort: [string, 1 | -1] | null = null;

  constructor(private readonly exec: () => Promise<DocRecord[]>) {}

  sort(spec: Record<string, 1 | -1>): this {
    const entry = Object.entries(spec)[0];
    if (entry) this._sort = entry as [string, 1 | -1];
    return this;
  }

  async toArray(): Promise<DocRecord[]> {
    const docs = await this.exec();
    if (this._sort) {
      const [key, dir] = this._sort;
      docs.sort((a, b) => {
        const av = a[key];
        const bv = b[key];
        if (av == null && bv == null) return 0;
        if (av == null) return dir;
        if (bv == null) return -dir;
        if (av < bv) return -dir;
        if (av > bv) return dir;
        return 0;
      });
    }
    return docs;
  }
}

// ── DynamoCollection ──────────────────────────────────────────────────────────

export class DynamoCollection {
  private readonly table: string;
  private readonly userPk: boolean;

  constructor(collection: string) {
    this.table = tableName(collection);
    this.userPk = USER_PK_TABLES.has(collection);
  }

  // ── find ────────────────────────────────────────────────────────────────────

  find(filter: DocRecord): DynamoCursor {
    return new DynamoCursor(() => this._query(filter));
  }

  private async _query(filter: DocRecord): Promise<DocRecord[]> {
    // perfis table: single item per user, PK = userId
    if (this.userPk) {
      if (typeof filter['userId'] === 'string') {
        const r = await dynamo.send(
          new GetCommand({
            TableName: this.table,
            Key: { userId: filter['userId'] },
          }),
        );
        return r.Item ? [r.Item] : [];
      }
      // $in on userId → batch gets
      const userFilter = filter['userId'] as DocRecord | undefined;
      if (userFilter && '$in' in userFilter) {
        const ids = userFilter['$in'] as string[];
        const results = await Promise.all(
          ids.map(async (uid) => {
            const r = await dynamo.send(
              new GetCommand({
                TableName: this.table,
                Key: { userId: uid },
              }),
            );
            return r.Item ?? null;
          }),
        );
        return results.filter(Boolean) as DocRecord[];
      }
    }

    // Regular collections: try GSI userId-index first
    if (typeof filter['userId'] === 'string') {
      const { userId, ...rest } = filter;
      const r = await dynamo.send(
        new QueryCommand({
          TableName: this.table,
          IndexName: 'userId-index',
          KeyConditionExpression: '#uid = :uid',
          ExpressionAttributeNames: { '#uid': 'userId' },
          ExpressionAttributeValues: { ':uid': userId },
        }),
      );
      const items = r.Items ?? [];
      return this._clientFilter(items, rest);
    }

    // $in on userId → parallel queries
    const userFilter = filter['userId'] as DocRecord | undefined;
    if (userFilter && '$in' in userFilter) {
      const ids = userFilter['$in'] as string[];
      const results = await Promise.all(
        ids.map((uid) =>
          dynamo
            .send(
              new QueryCommand({
                TableName: this.table,
                IndexName: 'userId-index',
                KeyConditionExpression: '#uid = :uid',
                ExpressionAttributeNames: { '#uid': 'userId' },
                ExpressionAttributeValues: { ':uid': uid },
              }),
            )
            .then((r) => r.Items ?? []),
        ),
      );
      return results.flat();
    }

    // Fallback: Scan with FilterExpression
    return this._scan(filter);
  }

  private _clientFilter(items: DocRecord[], filter: DocRecord): DocRecord[] {
    return items.filter((item) => {
      for (const [k, v] of Object.entries(filter)) {
        if (k === '$or') continue; // handled separately
        const itemVal = item[k];
        if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
          const ops = v as DocRecord;
          if ('$gte' in ops && !((itemVal as any) >= (ops['$gte'] as any))) return false;
          if ('$lte' in ops && !((itemVal as any) <= (ops['$lte'] as any))) return false;
          if ('$in' in ops && !(ops['$in'] as unknown[]).includes(itemVal)) return false;
        } else if (itemVal !== v) {
          return false;
        }
      }
      return true;
    });
  }

  private async _scan(filter: DocRecord): Promise<DocRecord[]> {
    const exprs: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    let i = 0;

    for (const [k, v] of Object.entries(filter)) {
      if (k === '$or') continue;
      const nk = `#k${i}`;
      const vk = `:v${i}`;
      names[nk] = k;

      if (ARRAY_FIELDS.has(k)) {
        values[vk] = v;
        exprs.push(`contains(${nk}, ${vk})`);
      } else if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
        const ops = v as DocRecord;
        if ('$gte' in ops) {
          values[`${vk}a`] = ops['$gte'];
          exprs.push(`${nk} >= ${vk}a`);
        }
        if ('$lte' in ops) {
          values[`${vk}b`] = ops['$lte'];
          exprs.push(`${nk} <= ${vk}b`);
        }
      } else {
        values[vk] = v;
        exprs.push(`${nk} = ${vk}`);
      }
      i++;
    }

    const scanParams: Record<string, unknown> = { TableName: this.table };
    if (exprs.length > 0) {
      scanParams['FilterExpression'] = exprs.join(' AND ');
      scanParams['ExpressionAttributeNames'] = names;
      scanParams['ExpressionAttributeValues'] = values;
    }
    const r = await dynamo.send(new ScanCommand(scanParams as any));
    return (r.Items ?? []) as DocRecord[];
  }

  // ── findOne ─────────────────────────────────────────────────────────────────

  async findOne(filter: DocRecord): Promise<DocRecord | null> {
    // $or support: check each branch, return first match
    if ('$or' in filter) {
      const { $or, ...base } = filter;
      const branches = $or as DocRecord[];
      for (const branch of branches) {
        const merged = { ...base, ...branch };
        const doc = await this.findOne(merged);
        if (doc) return doc;
      }
      return null;
    }

    // Direct _id lookup
    if ('_id' in filter) {
      const id = idStr(filter['_id']);
      if (this.userPk) {
        // perfis: use userId as key
        const uid = typeof filter['userId'] === 'string' ? filter['userId'] : id;
        const r = await dynamo.send(
          new GetCommand({ TableName: this.table, Key: { userId: uid } }),
        );
        if (!r.Item) return null;
        return this._verifyFilter(r.Item, filter) ? r.Item : null;
      }
      const r = await dynamo.send(new GetCommand({ TableName: this.table, Key: { _id: id } }));
      if (!r.Item) return null;
      return this._verifyFilter(r.Item, filter) ? r.Item : null;
    }

    // userId lookup (perfis)
    if (this.userPk && typeof filter['userId'] === 'string') {
      const r = await dynamo.send(
        new GetCommand({
          TableName: this.table,
          Key: { userId: filter['userId'] },
        }),
      );
      return r.Item ?? null;
    }

    // Fallback: query and return first
    const docs = await this._query(filter);
    return docs[0] ?? null;
  }

  private _verifyFilter(item: DocRecord, filter: DocRecord): boolean {
    for (const [k, v] of Object.entries(filter)) {
      if (k === '_id' || k === '$or') continue;
      if (item[k] !== v) return false;
    }
    return true;
  }

  // ── insertOne ────────────────────────────────────────────────────────────────

  async insertOne(doc: DocRecord): Promise<{ insertedId: { toString(): string } }> {
    const _id = (doc['_id'] != null ? idStr(doc['_id']) : null) ?? randomUUID();
    const item: DocRecord = { ...doc, _id };

    // Convert any Date values to ISO strings (DynamoDB doesn't store Date objects)
    const serialised = this._serialise(item);

    if (this.userPk) {
      await dynamo.send(new PutCommand({ TableName: this.table, Item: serialised }));
      return { insertedId: { toString: () => idStr(serialised['userId']) } };
    }

    await dynamo.send(new PutCommand({ TableName: this.table, Item: serialised }));
    return { insertedId: { toString: () => _id } };
  }

  // ── updateOne ────────────────────────────────────────────────────────────────

  async updateOne(
    filter: DocRecord,
    update: DocRecord,
    opts?: { upsert?: boolean },
  ): Promise<{ matchedCount: number; upsertedCount?: number }> {
    // Resolve key
    let key: DocRecord | null = null;

    if (this.userPk && typeof filter['userId'] === 'string') {
      key = { userId: filter['userId'] };
    } else if ('_id' in filter) {
      key = { _id: idStr(filter['_id']) };
    } else {
      const existing = await this.findOne(filter);
      if (!existing) {
        if (opts?.upsert) {
          const merged: DocRecord = { ...filter };
          const $set = update['$set'] as DocRecord | undefined;
          if ($set) Object.assign(merged, $set);
          await this.insertOne(merged);
          return { matchedCount: 0, upsertedCount: 1 };
        }
        return { matchedCount: 0 };
      }
      key = this.userPk ? { userId: idStr(existing['userId']) } : { _id: idStr(existing['_id']) };
    }

    // Check existence for upsert
    const current = await dynamo.send(new GetCommand({ TableName: this.table, Key: key }));
    if (!current.Item) {
      if (opts?.upsert) {
        const merged: DocRecord = { ...key };
        const $set = update['$set'] as DocRecord | undefined;
        if ($set) Object.assign(merged, this._serialise($set));
        await dynamo.send(new PutCommand({ TableName: this.table, Item: merged }));
        return { matchedCount: 0, upsertedCount: 1 };
      }
      return { matchedCount: 0 };
    }

    const existing = current.Item;
    const setClauses: string[] = [];
    const names: Record<string, string> = {};
    const values: Record<string, unknown> = {};
    let i = 0;

    const addSet = (k: string, v: unknown) => {
      const nk = `#u${i}`;
      const vk = `:u${i}`;
      names[nk] = k;
      values[vk] = v;
      setClauses.push(`${nk} = ${vk}`);
      i++;
    };

    const $set = update['$set'] as DocRecord | undefined;
    if ($set) {
      for (const [k, v] of Object.entries(this._serialise($set))) {
        addSet(k, v);
      }
    }

    const $push = update['$push'] as DocRecord | undefined;
    if ($push) {
      for (const [k, v] of Object.entries($push)) {
        const list = (existing[k] as unknown[] | undefined) ?? [];
        addSet(k, [...list, this._serialiseValue(v)]);
      }
    }

    const $addToSet = update['$addToSet'] as DocRecord | undefined;
    if ($addToSet) {
      for (const [k, v] of Object.entries($addToSet)) {
        const list = (existing[k] as unknown[] | undefined) ?? [];
        if (!list.includes(v)) addSet(k, [...list, v]);
      }
    }

    const $pull = update['$pull'] as DocRecord | undefined;
    if ($pull) {
      for (const [k, v] of Object.entries($pull)) {
        const list = (existing[k] as unknown[] | undefined) ?? [];
        addSet(
          k,
          list.filter((x) => x !== v),
        );
      }
    }

    if (setClauses.length === 0) return { matchedCount: 1 };

    await dynamo.send(
      new UpdateCommand({
        TableName: this.table,
        Key: key,
        UpdateExpression: `SET ${setClauses.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    );

    return { matchedCount: 1 };
  }

  // ── deleteOne ────────────────────────────────────────────────────────────────

  async deleteOne(filter: DocRecord): Promise<{ deletedCount: number }> {
    let key: DocRecord;

    if (this.userPk && typeof filter['userId'] === 'string') {
      key = { userId: filter['userId'] };
    } else if ('_id' in filter) {
      const id = idStr(filter['_id']);
      // Ownership check
      if (typeof filter['userId'] === 'string') {
        const r = await dynamo.send(new GetCommand({ TableName: this.table, Key: { _id: id } }));
        if (!r.Item || r.Item['userId'] !== filter['userId']) return { deletedCount: 0 };
      }
      key = { _id: id };
    } else {
      const existing = await this.findOne(filter);
      if (!existing) return { deletedCount: 0 };
      key = this.userPk ? { userId: idStr(existing['userId']) } : { _id: idStr(existing['_id']) };
    }

    await dynamo.send(new DeleteCommand({ TableName: this.table, Key: key }));
    return { deletedCount: 1 };
  }

  // ── Serialisation ────────────────────────────────────────────────────────

  private _serialise(obj: DocRecord): DocRecord {
    const out: DocRecord = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = this._serialiseValue(v);
    }
    return out;
  }

  private _serialiseValue(v: unknown): unknown {
    if (v instanceof Date) return v.toISOString();
    if (Array.isArray(v)) return v.map((x) => this._serialiseValue(x));
    if (v !== null && typeof v === 'object' && !(v instanceof Date)) {
      return this._serialise(v as DocRecord);
    }
    return v;
  }
}

export async function getDynamoCollection(name: string): Promise<DynamoCollection> {
  return new DynamoCollection(name);
}
