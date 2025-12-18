import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asNonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null;
}

export function ensureGoogleCredentialsFile() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  if (!raw) {
    console.warn('⚠ GOOGLE_APPLICATION_CREDENTIALS_JSON não definido');
    return;
  }

  let jsonText = raw.trim();

  // remove aspas externas se vier "{...}" ou '{...}'
  if (
    (jsonText.startsWith('"') && jsonText.endsWith('"')) ||
    (jsonText.startsWith("'") && jsonText.endsWith("'"))
  ) {
    jsonText = jsonText.slice(1, -1);
  }

  // tenta parsear SEM any
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText) as unknown;
  } catch {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON inválido. Cole o JSON do service account corretamente.',
    );
  }

  // valida campos mínimos
  if (!isObject(parsed)) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON deve ser um objeto JSON.',
    );
  }

  const privateKey = asNonEmptyString(parsed['private_key']);
  const clientEmail = asNonEmptyString(parsed['client_email']);
  const projectId = asNonEmptyString(parsed['project_id']);

  if (!privateKey || !clientEmail || !projectId) {
    throw new Error(
      'JSON de credenciais inválido: faltando "private_key", "client_email" ou "project_id".',
    );
  }

  parsed['private_key'] = privateKey.replace(/\\n/g, '\n');

  // agora sim, garante um JSON válido e "limpo"
  const safeJson = JSON.stringify(parsed);

  const dir = join(os.tmpdir(), 'nutrilens');
  mkdirSync(dir, { recursive: true });

  const tmpPath = join(dir, 'google-vision.json');
  writeFileSync(tmpPath, safeJson, { encoding: 'utf-8' });

  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
}
