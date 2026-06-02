// Anthropic SDK wrapper. The API key is stored encrypted in better-sqlite3
// via Electron `safeStorage` (macOS Keychain on darwin). Renderer never sees it.

import Anthropic from '@anthropic-ai/sdk';
import { safeStorage } from 'electron';
import { getSetting, setSetting } from '../db/repo';

const KEY_NAME = 'anthropic_api_key_enc';
const MODEL_NAME = 'pulse_model';
const DEFAULT_MODEL = 'claude-sonnet-4-6';

let _client: Anthropic | null = null;

export function setApiKey(plain: string): boolean {
  if (!plain.startsWith('sk-ant-')) return false;
  const enc = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(plain).toString('base64')
    : Buffer.from(plain, 'utf-8').toString('base64'); // dev fallback
  setSetting(KEY_NAME, enc);
  _client = null; // force re-init
  return true;
}

export function clearApiKey() {
  setSetting(KEY_NAME, '');
  _client = null;
}

export function hasApiKey(): boolean {
  return !!loadApiKey();
}

export function getModel(): string {
  return getSetting(MODEL_NAME) ?? process.env.PULSE_MODEL ?? DEFAULT_MODEL;
}

export function setModel(m: string) {
  setSetting(MODEL_NAME, m);
}

export function client(): Anthropic {
  if (_client) return _client;
  const key = loadApiKey();
  if (!key) throw new Error('No Anthropic API key set. Open Settings to add one.');
  _client = new Anthropic({ apiKey: key });
  return _client;
}

function loadApiKey(): string | null {
  const stored = getSetting(KEY_NAME);
  if (stored) {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        return safeStorage.decryptString(Buffer.from(stored, 'base64'));
      }
      return Buffer.from(stored, 'base64').toString('utf-8');
    } catch {
      return null;
    }
  }
  return process.env.ANTHROPIC_API_KEY ?? null;
}
