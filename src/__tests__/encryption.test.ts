import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const TEST_DIR = path.join(os.tmpdir(), '.daily_enc_test_' + Date.now());

beforeAll(() => {
  fs.mkdirSync(TEST_DIR, { recursive: true });
});

afterAll(() => {
  fs.rmSync(TEST_DIR, { recursive: true, force: true });
});

import {
  initEncryption,
  isEncryptionEnabled,
  isEncryptedBuffer,
  encrypt,
  decrypt,
  encryptFile,
  decryptFile,
  decryptToTemp,
  _initSessionForTest,
  _resetEncryptionForTest,
} from '../encryption';

beforeEach(() => {
  _resetEncryptionForTest();
  initEncryption('test', TEST_DIR);
  _initSessionForTest('test-passphrase');
});

afterEach(() => {
  _resetEncryptionForTest();
});

describe('isEncryptedBuffer', () => {
  it('returns false for plain text', () => {
    expect(isEncryptedBuffer(Buffer.from('hello world'))).toBe(false);
  });

  it('returns false for short buffers', () => {
    expect(isEncryptedBuffer(Buffer.from('SHORT'))).toBe(false);
  });

  it('returns false for a buffer starting with wrong magic', () => {
    expect(isEncryptedBuffer(Buffer.from('WRONG_MAGIC_XX' + 'x'.repeat(30)))).toBe(false);
  });

  it('returns true for an encrypted buffer', () => {
    const encrypted = encrypt(Buffer.from('some data'));
    expect(isEncryptedBuffer(encrypted)).toBe(true);
  });
});

describe('encrypt / decrypt roundtrip', () => {
  it('decrypts back to original plaintext', () => {
    const original = Buffer.from('Hello, World!');
    const encrypted = encrypt(original);
    const decrypted = decrypt(encrypted);
    expect(decrypted.toString('utf-8')).toBe('Hello, World!');
  });

  it('encrypts to different ciphertext each time (random nonce)', () => {
    const data = Buffer.from('same data');
    const enc1 = encrypt(data);
    const enc2 = encrypt(data);
    expect(enc1.equals(enc2)).toBe(false);
  });

  it('decrypts arbitrary binary data correctly', () => {
    const data = Buffer.from([0x00, 0xff, 0xab, 0x12, 0x34]);
    expect(decrypt(encrypt(data)).equals(data)).toBe(true);
  });

  it('decrypts JSON content correctly', () => {
    const json = JSON.stringify({ todos: [{ id: '1', text: 'Test', completed: false }] });
    const decrypted = decrypt(encrypt(Buffer.from(json, 'utf-8'))).toString('utf-8');
    expect(JSON.parse(decrypted).todos[0].text).toBe('Test');
  });
});

describe('decrypt with wrong key', () => {
  it('throws when decrypting with a different key', () => {
    const encrypted = encrypt(Buffer.from('secret'));

    // Switch to a different key
    _initSessionForTest('wrong-passphrase');

    expect(() => decrypt(encrypted)).toThrow();
  });

  it('throws for corrupt ciphertext', () => {
    const encrypted = encrypt(Buffer.from('secret'));
    // Flip a byte in the ciphertext area
    encrypted[encrypted.length - 1] ^= 0xff;
    expect(() => decrypt(encrypted)).toThrow();
  });

  it('throws for invalid format (too short)', () => {
    expect(() => decrypt(Buffer.from('DAILY_ENC_V1'))).toThrow();
  });
});

describe('encrypt / decrypt require unlocked session', () => {
  it('throws when session key is cleared', () => {
    _resetEncryptionForTest();
    expect(() => encrypt(Buffer.from('data'))).toThrow('Encryption session not unlocked');
    expect(() => decrypt(Buffer.from('x'.repeat(50)))).toThrow('Encryption session not unlocked');
  });
});

describe('encryptFile / decryptFile', () => {
  it('encrypts a file in-place and decrypts it back', () => {
    const filePath = path.join(TEST_DIR, 'test.json');
    const original = '{"todos":[]}';
    fs.writeFileSync(filePath, original, 'utf-8');

    encryptFile(filePath);

    const raw = fs.readFileSync(filePath);
    expect(isEncryptedBuffer(raw)).toBe(true);

    const decrypted = decryptFile(filePath);
    expect(decrypted.toString('utf-8')).toBe(original);
  });

  it('encryptFile is idempotent (does not double-encrypt)', () => {
    const filePath = path.join(TEST_DIR, 'idempotent.json');
    fs.writeFileSync(filePath, '{"todos":[]}', 'utf-8');

    encryptFile(filePath);
    const afterFirst = fs.readFileSync(filePath);

    encryptFile(filePath); // call again
    const afterSecond = fs.readFileSync(filePath);

    // Content unchanged (not re-encrypted)
    expect(afterFirst.equals(afterSecond)).toBe(true);
  });

  it('decryptFile returns raw buffer for non-encrypted file', () => {
    const filePath = path.join(TEST_DIR, 'plain.md');
    fs.writeFileSync(filePath, 'plain text', 'utf-8');

    const result = decryptFile(filePath);
    expect(result.toString('utf-8')).toBe('plain text');
  });
});

describe('decryptToTemp', () => {
  it('writes decrypted content to a temp file and returns its path', () => {
    const srcPath = path.join(TEST_DIR, 'note.md');
    const content = '# My Note\n\nSome content.';
    fs.writeFileSync(srcPath, encrypt(Buffer.from(content)));

    const tempPath = decryptToTemp(srcPath);
    try {
      expect(fs.existsSync(tempPath)).toBe(true);
      expect(fs.readFileSync(tempPath, 'utf-8')).toBe(content);
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  });

  it('temp file is in os.tmpdir()', () => {
    const srcPath = path.join(TEST_DIR, 'note2.md');
    fs.writeFileSync(srcPath, encrypt(Buffer.from('content')));

    const tempPath = decryptToTemp(srcPath);
    try {
      expect(tempPath.startsWith(os.tmpdir())).toBe(true);
    } finally {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }
  });
});

describe('isEncryptionEnabled', () => {
  it('returns false when .encrypted marker is absent', () => {
    const markerPath = path.join(TEST_DIR, '.encrypted');
    if (fs.existsSync(markerPath)) fs.unlinkSync(markerPath);
    expect(isEncryptionEnabled(TEST_DIR)).toBe(false);
  });

  it('returns true when .encrypted marker is present', () => {
    const markerPath = path.join(TEST_DIR, '.encrypted');
    fs.writeFileSync(markerPath, '', 'utf-8');
    try {
      expect(isEncryptionEnabled(TEST_DIR)).toBe(true);
    } finally {
      fs.unlinkSync(markerPath);
    }
  });
});
