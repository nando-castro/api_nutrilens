import { mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { join } from 'node:path';

export function ensureGoogleCredentialsFile() {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

  console.log('GOOGLE_APPLICATION_CREDENTIALS_JSON', raw);

  if (!raw) {
    console.warn('⚠ GOOGLE_APPLICATION_CREDENTIALS_JSON não definido');
    return;
  }

  let jsonText = raw.trim();

  // Se veio entre aspas (ex: "{...}" ou '{...}'), remove as aspas externas
  if (
    (jsonText.startsWith('"') && jsonText.endsWith('"')) ||
    (jsonText.startsWith("'") && jsonText.endsWith("'"))
  ) {
    jsonText = jsonText.slice(1, -1);
  }

  // Se veio escapado (com \" e \n), tenta converter para objeto e voltar para JSON "normal"
  try {
    const parsed = JSON.parse(jsonText);
    jsonText = JSON.stringify(parsed);
  } catch (e) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS_JSON inválido. Cole o JSON do service account corretamente (sem aspas externas).',
    );
  }

  const dir = join(os.tmpdir(), 'nutrilens');
  mkdirSync(dir, { recursive: true });

  const tmpPath = join(dir, 'google-vision.json');
  writeFileSync(tmpPath, jsonText, { encoding: 'utf-8' });

  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
}
