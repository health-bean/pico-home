import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * AES-256-GCM encryption for push subscription keys at rest.
 *
 * Ciphertext format: `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 * Plaintext values (legacy rows without prefix) are passed through unchanged
 * so this module is backward-compatible with data written before encryption
 * was enabled.
 *
 * Setup: set PUSH_ENCRYPTION_KEY to a 64-char hex string (32 bytes).
 * Generate one with: `openssl rand -hex 32`
 */

const ALGORITHM = "aes-256-gcm";
const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const hex = process.env.PUSH_ENCRYPTION_KEY;
  if (!hex) return null;
  if (hex.length !== 64) {
    throw new Error(
      "PUSH_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). Generate with: openssl rand -hex 32"
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Encrypts a value if PUSH_ENCRYPTION_KEY is set; otherwise returns plaintext.
 * Callers should always use this before writing push key columns.
 */
export function encryptPushKey(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypts an encrypted value. Legacy plaintext values (no prefix) are
 * returned unchanged, so existing rows continue to work.
 */
export function decryptPushKey(value: string): string {
  if (!value.startsWith(PREFIX)) return value; // Legacy plaintext row

  const key = getKey();
  if (!key) {
    throw new Error(
      "Encrypted push key found but PUSH_ENCRYPTION_KEY is not set"
    );
  }

  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed encrypted push key");
  }

  const [ivHex, tagHex, ciphertextHex] = parts;
  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");
  const ciphertext = Buffer.from(ciphertextHex, "hex");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString(
    "utf8"
  );
}
