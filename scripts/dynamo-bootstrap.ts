#!/usr/bin/env node
/**
 * scripts/dynamo-bootstrap.ts
 * Creates all DynamoDB tables required by gymdesk.
 *
 * Usage:
 *   AWS_REGION=us-east-1 DB_PROVIDER=dynamo npx tsx scripts/dynamo-bootstrap.ts
 *
 * Tables created:
 *   {PREFIX}checkins         PK: _id          GSI: userId-index (userId)
 *   {PREFIX}avaliacoes       PK: _id          GSI: userId-index (userId)
 *   {PREFIX}programas-treino PK: _id          GSI: userId-index (userId)
 *   {PREFIX}perfis           PK: userId
 *   {PREFIX}users            PK: _id
 */
import {
  DynamoDBClient,
  CreateTableCommand,
  DescribeTableCommand,
  ResourceInUseException,
  BillingMode,
} from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({ region: process.env['AWS_REGION'] ?? 'us-east-1' });
const PREFIX = process.env['DYNAMO_TABLE_PREFIX'] ?? 'gymdesk-';

async function tableExists(name: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: name }));
    return true;
  } catch {
    return false;
  }
}

async function createTable(
  name: string,
  pk: string,
  sk?: string,
  gsi?: { name: string; pk: string }[],
) {
  const full = PREFIX + name;
  if (await tableExists(full)) {
    console.log(`  ✓ ${full} (already exists)`);
    return;
  }

  const keys = [{ AttributeName: pk, KeyType: 'HASH' as const }];
  if (sk) keys.push({ AttributeName: sk, KeyType: 'RANGE' as const });

  const attrs = new Set([pk, sk, ...(gsi ?? []).map((g) => g.pk)].filter(Boolean) as string[]);
  const attrDefs = [...attrs].map((a) => ({ AttributeName: a, AttributeType: 'S' as const }));

  const globalIndexes = (gsi ?? []).map((g) => ({
    IndexName: g.name,
    KeySchema: [{ AttributeName: g.pk, KeyType: 'HASH' as const }],
    Projection: { ProjectionType: 'ALL' as const },
  }));

  try {
    await client.send(new CreateTableCommand({
      TableName: full,
      KeySchema: keys,
      AttributeDefinitions: attrDefs,
      BillingMode: 'PAY_PER_REQUEST' as BillingMode,
      ...(globalIndexes.length > 0 && { GlobalSecondaryIndexes: globalIndexes }),
    }));
    console.log(`  ✓ ${full} created`);
  } catch (err) {
    if (err instanceof ResourceInUseException) {
      console.log(`  ✓ ${full} (already exists)`);
    } else {
      throw err;
    }
  }
}

async function main() {
  console.log(`\nBootstrapping DynamoDB tables (prefix: "${PREFIX}") ...\n`);

  // Collections with PK=_id and GSI on userId
  for (const col of ['checkins', 'avaliacoes', 'programas-treino']) {
    await createTable(col, '_id', undefined, [{ name: 'userId-index', pk: 'userId' }]);
  }

  // perfis: single item per user, PK = userId
  await createTable('perfis', 'userId');

  // users: auth table, PK = _id (email or userId)
  await createTable('users', '_id');

  console.log('\nDone!');
}

main().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
