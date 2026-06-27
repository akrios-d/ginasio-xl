# DynamoDB Setup Guide

Step-by-step guide to configure AWS DynamoDB for GymDesk.

---

## 1. Create an IAM User

GymDesk needs an IAM user with programmatic access to DynamoDB.

1. Go to [IAM Console](https://console.aws.amazon.com/iam/) → **Users** → **Create user**
2. Username: `gymdesk-dynamo` (or any name)
3. **Permissions** → Attach policies directly → select **AmazonDynamoDBFullAccess**
   (For production, scope this down to only the specific tables — see the minimal policy below)
4. After creation, go to **Security credentials** → **Create access key** → select **Application running outside AWS**
5. Copy the **Access Key ID** and **Secret Access Key** — you will not see the secret again

### Minimal IAM Policy (production)

Replace `YOUR_ACCOUNT_ID` and `YOUR_REGION`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/gymdesk-*",
        "arn:aws:dynamodb:YOUR_REGION:YOUR_ACCOUNT_ID:table/gymdesk-*/index/*"
      ]
    }
  ]
}
```

---

## 2. Configure Environment Variables

Add to `.env.local` (local) and Vercel project settings (production):

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
DYNAMO_TABLE_PREFIX=gymdesk-   # optional, this is the default
```

---

## 3. Bootstrap Tables

Run the bootstrap script once to create all tables:

```bash
AWS_REGION=us-east-1 npx tsx scripts/dynamo-bootstrap.ts
```

This creates four tables, all with **PAY_PER_REQUEST** billing:

| Table | PK | GSI |
|---|---|---|
| `gymdesk-checkins` | `_id` (String) | `userId-index` on `userId` |
| `gymdesk-perfis` | `userId` (String) | — |
| `gymdesk-programas-treino` | `_id` (String) | `userId-index` on `userId` |
| `gymdesk-avaliacoes` | `_id` (String) | `userId-index` on `userId` |

The script is idempotent for new tables but will error if a table already exists with a different schema. Safe to run multiple times if tables don't exist yet.

---

## 4. Verify Tables in AWS Console

1. Go to [DynamoDB Console](https://console.aws.amazon.com/dynamodb/) → **Tables**
2. Confirm all four tables are listed with status **Active**
3. Click `gymdesk-checkins` → **Indexes** tab → confirm `userId-index` GSI is **Active**

---

## 5. Deploy to Vercel

Add the environment variables to your Vercel project:

```bash
vercel env add AWS_REGION
vercel env add AWS_ACCESS_KEY_ID
vercel env add AWS_SECRET_ACCESS_KEY
```

Or set them in the Vercel dashboard under **Project → Settings → Environment Variables**.

---

## Multiple Environments

Use `DYNAMO_TABLE_PREFIX` to isolate environments:

```bash
# .env.local (dev)
DYNAMO_TABLE_PREFIX=gymdesk-dev-

# Vercel preview
DYNAMO_TABLE_PREFIX=gymdesk-preview-

# Vercel production
DYNAMO_TABLE_PREFIX=gymdesk-
```

Then run the bootstrap script once per environment prefix:

```bash
DYNAMO_TABLE_PREFIX=gymdesk-dev- AWS_REGION=us-east-1 npx tsx scripts/dynamo-bootstrap.ts
```

---

## Troubleshooting

**`ResourceNotFoundException: Requested resource not found`** — tables don't exist yet. Run the bootstrap script.

**`UnrecognizedClientException: The security token included in the request is invalid`** — wrong `AWS_ACCESS_KEY_ID` or `AWS_SECRET_ACCESS_KEY`. Double-check the values in `.env.local`.

**`AccessDeniedException`** — the IAM user doesn't have permission for the operation. Check the policy attached to the user includes the required DynamoDB actions and the correct table ARNs.

**`ResourceInUseException` on bootstrap** — table already exists. Safe to ignore if the existing table has the correct schema.
