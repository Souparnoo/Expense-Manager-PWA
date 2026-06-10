/**
 * AES-256-GCM encryption with PBKDF2-SHA-256 key derivation.
 * Nothing is stored except ciphertext + salt + iv + version.
 * Password is never stored or transmitted.
 */

const PBKDF2_ITERATIONS = 310_000; // NIST recommendation 2023
const KEY_LENGTH = 256;
const VERSION = 1;

export interface EncryptedPayload {
  version: number;
  salt: string;   // hex
  iv: string;     // hex
  ciphertext: string; // hex
}

function bufToHex(buf: ArrayBuffer | ArrayBufferView): string {
  const bytes = buf instanceof Uint8Array 
    ? buf 
    : new Uint8Array(buf as ArrayBuffer);
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBuf(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bytes;
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { 
      name: 'PBKDF2', 
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS, 
      hash: 'SHA-256' 
    },
    keyMaterial,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(plaintext: string, password: string): Promise<EncryptedPayload> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(32));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const key  = await deriveKey(password, salt);

  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );

  return {
    version: VERSION,
    salt: bufToHex(salt),
    iv: bufToHex(iv),
    ciphertext: bufToHex(cipherBuf),
  };
}

export async function decryptData(payload: EncryptedPayload, password: string): Promise<string> {
  const salt       = hexToBuf(payload.salt);
  const iv         = hexToBuf(payload.iv);
  const ciphertext = hexToBuf(payload.ciphertext);
  const key        = await deriveKey(password, salt);

  const plainBuf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    ciphertext as BufferSource
  );

  return new TextDecoder().decode(plainBuf);
}

export function isEncryptedPayload(data: unknown): data is EncryptedPayload {
  return (
    typeof data === 'object' && data !== null &&
    'version' in data && 'salt' in data && 'iv' in data && 'ciphertext' in data
  );
}
