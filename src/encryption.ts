import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { randomUUID } from 'crypto';

const MAGIC = Buffer.from('DAILY_ENC_V1'); // 12 bytes
const MAGIC_LENGTH = 12;
const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;
const SALT_LENGTH = 32;

const sessionKeys = new Map<string, Buffer>();
let activeWorkspaceName = '';

export function initEncryption(workspaceName: string, _dir: string): void {
  activeWorkspaceName = workspaceName;
}

function encryptedMarkerPath(dir: string): string {
  return path.join(dir, '.encrypted');
}

function saltPath(dir: string): string {
  return path.join(dir, '.salt');
}

export function isEncryptionEnabled(dir: string): boolean {
  return dir !== '' && fs.existsSync(encryptedMarkerPath(dir));
}

function getOrCreateSalt(dir: string): Buffer {
  const p = saltPath(dir);
  if (fs.existsSync(p)) {
    return Buffer.from(fs.readFileSync(p, 'utf-8').trim(), 'hex');
  }
  const salt = crypto.randomBytes(SALT_LENGTH);
  fs.writeFileSync(p, salt.toString('hex'), 'utf-8');
  return salt;
}

function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.scryptSync(passphrase, salt, KEY_LENGTH) as Buffer;
}

export function encrypt(plaintext: Buffer): Buffer {
  const key = sessionKeys.get(activeWorkspaceName);
  if (!key) throw new Error('Encryption session not unlocked');
  const nonce = crypto.randomBytes(NONCE_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([MAGIC, nonce, tag, encrypted]);
}

export function decrypt(ciphertext: Buffer): Buffer {
  const key = sessionKeys.get(activeWorkspaceName);
  if (!key) throw new Error('Encryption session not unlocked');
  if (ciphertext.length < MAGIC_LENGTH + NONCE_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted data: too short');
  }
  const magic = ciphertext.subarray(0, MAGIC_LENGTH);
  if (!magic.equals(MAGIC)) {
    throw new Error('Invalid encrypted file format');
  }
  const nonce = ciphertext.subarray(MAGIC_LENGTH, MAGIC_LENGTH + NONCE_LENGTH);
  const tag = ciphertext.subarray(MAGIC_LENGTH + NONCE_LENGTH, MAGIC_LENGTH + NONCE_LENGTH + TAG_LENGTH);
  const encrypted = ciphertext.subarray(MAGIC_LENGTH + NONCE_LENGTH + TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, nonce);
  decipher.setAuthTag(tag);
  try {
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  } catch {
    throw new Error('Decryption failed: wrong passphrase or corrupt data');
  }
}

export function isEncryptedBuffer(buf: Buffer): boolean {
  if (buf.length < MAGIC_LENGTH) return false;
  return buf.subarray(0, MAGIC_LENGTH).equals(MAGIC);
}

export function encryptFile(filePath: string): void {
  const plaintext = fs.readFileSync(filePath);
  if (isEncryptedBuffer(plaintext)) return;
  fs.writeFileSync(filePath, encrypt(plaintext));
}

export function decryptFile(filePath: string): Buffer {
  const ciphertext = fs.readFileSync(filePath);
  if (!isEncryptedBuffer(ciphertext)) return ciphertext;
  return decrypt(ciphertext);
}

export function decryptToTemp(filePath: string): string {
  const content = decryptFile(filePath);
  const tempPath = path.join(os.tmpdir(), `daily_note_${randomUUID()}.md`);
  fs.writeFileSync(tempPath, content);
  return tempPath;
}

function promptPassphrase(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    let passphrase = '';
    const stdin = process.stdin as NodeJS.ReadStream;
    stdin.resume();
    if (stdin.isTTY) stdin.setRawMode(true);

    const handler = (chunk: Buffer) => {
      const char = chunk.toString('utf8');
      if (char === '\r' || char === '\n') {
        process.stdout.write('\n');
        stdin.removeListener('data', handler);
        if (stdin.isTTY) stdin.setRawMode(false);
        stdin.pause();
        resolve(passphrase);
      } else if (char === '\u0003') {
        process.stdout.write('\n');
        process.exit(1);
      } else if (char === '\u007f' || char === '\b') {
        passphrase = passphrase.slice(0, -1);
      } else {
        passphrase += char;
      }
    };

    stdin.on('data', handler);
  });
}

function collectDataFiles(dir: string): string[] {
  const files: string[] = [];
  const todosPath = path.join(dir, 'todos.json');
  if (fs.existsSync(todosPath)) files.push(todosPath);

  function walkDir(d: string): void {
    if (!fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walkDir(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  walkDir(path.join(dir, 'notes'));
  return files;
}

async function unlockSession(workspaceName: string, dir: string): Promise<void> {
  const p = saltPath(dir);
  if (!fs.existsSync(p)) {
    console.error('Salt file missing. Cannot unlock encrypted data.');
    process.exit(1);
  }

  const salt = Buffer.from(fs.readFileSync(p, 'utf-8').trim(), 'hex');
  const passphrase = await promptPassphrase('Passphrase: ');
  const key = deriveKey(passphrase, salt);

  const todosPath = path.join(dir, 'todos.json');
  if (fs.existsSync(todosPath)) {
    const raw = fs.readFileSync(todosPath);
    if (isEncryptedBuffer(raw)) {
      sessionKeys.set(workspaceName, key);
      try {
        // Temporarily set active workspace to verify key
        const prev = activeWorkspaceName;
        activeWorkspaceName = workspaceName;
        try {
          decrypt(raw);
        } catch {
          sessionKeys.delete(workspaceName);
          activeWorkspaceName = prev;
          console.error('\n✗ Wrong passphrase');
          process.exit(1);
        }
        activeWorkspaceName = prev;
      } catch {
        // already handled above
      }
    }
  }

  sessionKeys.set(workspaceName, key);
  console.log('');
}

export async function setupEncryption(workspaceName: string, dir: string): Promise<void> {
  if (isEncryptionEnabled(dir)) {
    await unlockSession(workspaceName, dir);
    activeWorkspaceName = workspaceName;
    return;
  }

  console.log('\n🔐 Setting up encryption for your data...');
  console.log('⚠️  WARNING: If you forget your passphrase, your data cannot be recovered.\n');

  const passphrase = await promptPassphrase('Enter new passphrase: ');
  if (!passphrase) {
    console.error('Passphrase cannot be empty');
    process.exit(1);
  }

  const confirm = await promptPassphrase('Confirm passphrase: ');
  if (passphrase !== confirm) {
    console.error('Passphrases do not match');
    process.exit(1);
  }

  const salt = getOrCreateSalt(dir);
  const key = deriveKey(passphrase, salt);
  sessionKeys.set(workspaceName, key);

  const prev = activeWorkspaceName;
  activeWorkspaceName = workspaceName;

  const files = collectDataFiles(dir);
  const backups = new Map<string, Buffer>();

  try {
    for (const filePath of files) {
      backups.set(filePath, fs.readFileSync(filePath));
      encryptFile(filePath);
    }
    fs.writeFileSync(encryptedMarkerPath(dir), '', 'utf-8');
    console.log(`✓ Encryption enabled. ${files.length} file(s) encrypted.\n`);
  } catch (error) {
    for (const [filePath, original] of backups) {
      try { fs.writeFileSync(filePath, original); } catch { /* ignore */ }
    }
    sessionKeys.delete(workspaceName);
    activeWorkspaceName = prev;
    throw error;
  }

  activeWorkspaceName = workspaceName;
}

export async function switchWorkspaceEncryption(workspaceName: string, dir: string): Promise<void> {
  if (sessionKeys.has(workspaceName)) {
    activeWorkspaceName = workspaceName;
    return;
  }

  if (isEncryptionEnabled(dir)) {
    await unlockSession(workspaceName, dir);
  }

  activeWorkspaceName = workspaceName;
}

/** For testing only: set session key directly from a passphrase. */
export function _initSessionForTest(passphrase: string, workspaceName = 'test'): void {
  sessionKeys.set(workspaceName, crypto.scryptSync(passphrase, Buffer.alloc(32, 0), KEY_LENGTH) as Buffer);
  activeWorkspaceName = workspaceName;
}

export function _resetEncryptionForTest(): void {
  sessionKeys.clear();
  activeWorkspaceName = '';
}

/** @deprecated Use _resetEncryptionForTest */
export function _clearSessionForTest(): void {
  _resetEncryptionForTest();
}
