/**
 * Session helpers — bridges Vercel Node-style req/res to Auth.js Web Request/Response,
 * plus a `requireSession()` guard used by /api/* handlers that need authentication.
 */
import { AUTH_DB_NAME, clientPromise } from './auth.config.js';

// ── Node req → Web Request ─────────────────────────────────────────────────────
export function toWebRequest(req: any): Request {
  const host = (req.headers['x-forwarded-host'] ?? req.headers['host'] ?? 'localhost') as string;
  const proto = (req.headers['x-forwarded-proto'] ?? 'https') as string;
  const url = new URL(req.url ?? '/', `${proto}://${host}`);

  const headers = new Headers();
  for (const [key, val] of Object.entries(
    req.headers as Record<string, string | string[] | undefined>,
  )) {
    if (!val) continue;
    if (Array.isArray(val)) val.forEach((v) => headers.append(key, v));
    else headers.set(key, val);
  }

  const hasBody = req.method !== 'GET' && req.method !== 'HEAD';
  let body: string | null = null;
  if (hasBody) {
    if (typeof req.body === 'string') {
      body = req.body;
    } else {
      const ct = (req.headers['content-type'] ?? '') as string;
      body = ct.includes('application/x-www-form-urlencoded')
        ? new URLSearchParams(req.body as Record<string, string>).toString()
        : JSON.stringify(req.body);
    }
  }

  return new Request(url.toString(), { method: req.method, headers, body });
}

// ── Web Response → Node res ────────────────────────────────────────────────────
export async function fromWebResponse(webRes: Response, res: any): Promise<void> {
  res.status(webRes.status);

  const setCookies: string[] =
    typeof (webRes.headers as any).getSetCookie === 'function'
      ? (webRes.headers as any).getSetCookie()
      : [];

  webRes.headers.forEach((value, key) => {
    if (key.toLowerCase() !== 'set-cookie') res.setHeader(key, value);
  });

  if (setCookies.length > 0) res.setHeader('Set-Cookie', setCookies);

  const body = await webRes.text();
  if (body) res.send(body);
  else res.end();
}

// ── Session guard ──────────────────────────────────────────────────────────────
function parseCookies(header: string): Record<string, string> {
  if (!header) return {};
  return Object.fromEntries(
    header.split(';').map((c) => {
      const [k, ...v] = c.trim().split('=');
      return [k.trim(), decodeURIComponent(v.join('='))];
    }),
  );
}

/**
 * Reads the Auth.js database session from the request cookie.
 * Returns the authenticated userId, or sends 401 + returns null.
 */
export async function requireSession(req: any, res: any): Promise<string | null> {
  const cookies = parseCookies(req.headers['cookie'] ?? '');

  // Auth.js writes either the plain or __Secure-prefixed cookie depending on host
  const token = cookies['authjs.session-token'] ?? cookies['__Secure-authjs.session-token'];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  const client = await clientPromise;
  const session = await client
    .db(AUTH_DB_NAME)
    .collection('sessions')
    .findOne({ sessionToken: token });

  if (!session || new Date(session['expires'] as string) < new Date()) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }

  return (session['userId'] as { toString(): string }).toString();
}
