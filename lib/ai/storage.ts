import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DEFAULT_AI_SETTINGS, sanitizeSettings, type AiSettings } from './config';
import type { UsageEntry } from './contracts';

export type { UsageEntry } from './contracts';

export interface KeyRecord {
  ciphertext: string;
  iv: string;
  tag: string;
  fingerprint: string;
  updatedAt: string;
  provider: 'openrouter';
}

const DATA_DIR = process.env.AI_DATA_DIR || path.join(process.cwd(), '.data');
const SETTINGS_FILE = path.join(DATA_DIR, 'ai-settings.json');
const USAGE_FILE = path.join(DATA_DIR, 'ai-usage.json');
const KEY_FILE = path.join(DATA_DIR, 'ai-key.json');
const SECRET_FILE = path.join(DATA_DIR, 'secret.key');
const MAX_USAGE_ROWS = 500;

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const useSupabase = process.env.AI_STORAGE === 'supabase' && !!SUPABASE_URL && !!SUPABASE_SERVICE_KEY;

let writeQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(job: () => Promise<T>): Promise<T> {
  const next = writeQueue.then(job, job);
  writeQueue = next.catch(() => undefined);
  return next;
}

async function ensureDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, data: unknown) {
  await ensureDir();
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
  await fs.rename(tmp, file);
}

/* ------------------------------------------------------------------ */
/* Supabase (PostgREST) backend                                        */
/* ------------------------------------------------------------------ */

async function sbGet(table: string, query: string): Promise<any[] | null> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as any[];
  } catch {
    return null;
  }
}

async function sbUpsert(table: string, body: unknown, conflict: string): Promise<boolean> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?on_conflict=${conflict}`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(body),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Encryption for the stored API key                                   */
/* ------------------------------------------------------------------ */

async function getSecret(): Promise<Buffer> {
  if (process.env.AI_CONFIG_SECRET) {
    return crypto.createHash('sha256').update(process.env.AI_CONFIG_SECRET).digest();
  }
  try {
    const raw = await fs.readFile(SECRET_FILE, 'utf8');
    const buf = Buffer.from(raw.trim(), 'hex');
    if (buf.length === 32) return buf;
  } catch {
    /* generate below */
  }
  const secret = crypto.randomBytes(32);
  await ensureDir();
  await fs.writeFile(SECRET_FILE, secret.toString('hex'), { mode: 0o600 });
  return secret;
}

async function encryptKey(plain: string): Promise<KeyRecord> {
  const secret = await getSecret();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', secret, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return {
    ciphertext: enc.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    fingerprint: `${plain.slice(0, 6)}…${plain.slice(-4)}`,
    updatedAt: new Date().toISOString(),
    provider: 'openrouter',
  };
}

async function decryptKey(record: KeyRecord): Promise<string | null> {
  try {
    const secret = await getSecret();
    const decipher = crypto.createDecipheriv('aes-256-gcm', secret, Buffer.from(record.iv, 'base64'));
    decipher.setAuthTag(Buffer.from(record.tag, 'base64'));
    const dec = Buffer.concat([decipher.update(Buffer.from(record.ciphertext, 'base64')), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export async function getSettings(): Promise<AiSettings> {
  if (useSupabase) {
    const rows = await sbGet('ai_settings', 'id=eq.global&select=data');
    const data = rows?.[0]?.data;
    if (data) return sanitizeSettings(data, DEFAULT_AI_SETTINGS);
  }
  const stored = await readJson<Partial<AiSettings> | null>(SETTINGS_FILE, null);
  return sanitizeSettings(stored, DEFAULT_AI_SETTINGS);
}

export async function saveSettings(patch: Partial<AiSettings>): Promise<AiSettings> {
  const current = await getSettings();
  const next = sanitizeSettings(patch, current);
  if (useSupabase) {
    await sbUpsert('ai_settings', [{ id: 'global', data: next, updated_at: new Date().toISOString() }], 'id');
  }
  await serialize(() => writeJson(SETTINGS_FILE, next));
  return next;
}

export async function getKeyRecord(): Promise<KeyRecord | null> {
  if (useSupabase) {
    const rows = await sbGet('ai_secrets', 'id=eq.openrouter&select=*');
    if (rows?.[0]) return rows[0] as KeyRecord;
  }
  const stored = await readJson<KeyRecord | null>(KEY_FILE, null);
  return stored && stored.ciphertext ? stored : null;
}

export async function setApiKey(rawKey: string): Promise<{ fingerprint: string; updatedAt: string }> {
  const record = await encryptKey(rawKey);
  if (useSupabase) {
    await sbUpsert(
      'ai_secrets',
      [{ id: 'openrouter', ...record, updated_at: record.updatedAt }],
      'id',
    );
  }
  await serialize(() => writeJson(KEY_FILE, record));
  return { fingerprint: record.fingerprint, updatedAt: record.updatedAt };
}

export async function clearApiKey(): Promise<void> {
  await serialize(() => writeJson(KEY_FILE, null));
}

/** Resolves the OpenRouter key: encrypted stored key first, then environment variables. */
export async function getApiKey(): Promise<{ key: string | null; source: 'stored' | 'env' | 'none'; fingerprint?: string }> {
  const envKey = process.env.OPENROUTER_API_KEY || process.env.AI_API_KEY || '';
  const record = await getKeyRecord();
  if (record) {
    const decrypted = await decryptKey(record);
    if (decrypted) {
      return { key: decrypted, source: 'stored', fingerprint: record.fingerprint };
    }
  }
  if (envKey) {
    return {
      key: envKey,
      source: 'env',
      fingerprint: `${envKey.slice(0, 6)}…${envKey.slice(-4)}`,
    };
  }
  return { key: null, source: 'none' };
}

export async function appendUsage(entry: UsageEntry): Promise<void> {
  if (useSupabase) {
    const ok = await sbUpsert('ai_usage', [{ id: entry.id, at: entry.at, data: entry }], 'id');
    if (ok) return;
  }
  await serialize(async () => {
    const rows = await readJson<UsageEntry[]>(USAGE_FILE, []);
    rows.unshift(entry);
    await writeJson(USAGE_FILE, rows.slice(0, MAX_USAGE_ROWS));
  });
}

export async function listUsage(limit = 200): Promise<UsageEntry[]> {
  if (useSupabase) {
    const rows = await sbGet('ai_usage', `select=data&order=at.desc&limit=${limit}`);
    if (rows) return rows.map((r) => r.data as UsageEntry);
  }
  const rows = await readJson<UsageEntry[]>(USAGE_FILE, []);
  return rows.slice(0, limit);
}

export function storageMode() {
  return useSupabase ? 'supabase' : 'file';
}
