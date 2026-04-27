/**
 * Auth.js configuration.
 *
 * - Database session strategy: sessions live in MongoDB, looked up by cookie.
 * - MongoDBAdapter handles users, accounts, sessions, verification tokens.
 * - Providers: GitHub + Google. Add/remove as needed.
 *
 * Required env vars (set in .env.local + Vercel project settings):
 *   AUTH_SECRET           — 32+ byte random string (generate: openssl rand -hex 32)
 *   AUTH_GITHUB_ID        — GitHub OAuth app client id
 *   AUTH_GITHUB_SECRET    — GitHub OAuth app client secret
 *   AUTH_GOOGLE_ID        — Google OAuth client id
 *   AUTH_GOOGLE_SECRET    — Google OAuth client secret
 *   MONGODB_URI           — Mongo connection string (already used by /api/* handlers)
 */
import type { AuthConfig } from '@auth/core';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import GitHub from '@auth/core/providers/github';
import Google from '@auth/core/providers/google';
import { MongoClient } from 'mongodb';

const uri = process.env['MONGODB_URI'];
if (!uri) throw new Error('MONGODB_URI is not defined');

const dbName = process.env['MONGODB_DB_NAME'] || 'ginasio-xl';

// Dedicated client for Auth.js (the adapter manages its own pool).
const authClient = new MongoClient(uri, { appName: 'auth' });
export const clientPromise: Promise<MongoClient> = authClient.connect();

export const authConfig: AuthConfig = {
  providers: [
    GitHub({
      clientId: process.env['AUTH_GITHUB_ID']!,
      clientSecret: process.env['AUTH_GITHUB_SECRET']!,
    }),
    Google({
      clientId: process.env['AUTH_GOOGLE_ID']!,
      clientSecret: process.env['AUTH_GOOGLE_SECRET']!,
    }),
  ],
  adapter: MongoDBAdapter(clientPromise, { databaseName: dbName }),
  basePath: '/api/auth',
  trustHost: true,
  secret: process.env['AUTH_SECRET']!,
  session: { strategy: 'database' },
  pages: { signIn: '/login' },
  callbacks: {
    session({ session, user }) {
      if (session.user && user?.id) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
};

export const AUTH_DB_NAME = dbName;
