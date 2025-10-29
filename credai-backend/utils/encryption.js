import crypto from "crypto";

const ALGORITHM = 'aes-256-gcm';

// Validate encryption key at startup
if (!process.env.DID_ENCRYPTION_KEY) {
  throw new Error('DID_ENCRYPTION_KEY environment variable is required');
}

if (!/^[0-9a-fA-F]{64}$/.test(process.env.DID_ENCRYPTION_KEY)) {
  throw new Error('DID_ENCRYPTION_KEY must be 64 hexadecimal characters (32 bytes)');
}

const KEY = Buffer.from(process.env.DID_ENCRYPTION_KEY, 'hex');

/**
 * Encrypts a private key using AES-256-GCM
 * @param {string} privateKey - The private key to encrypt
 * @returns {string} Base64-encoded encrypted data (includes IV and auth tag)
 * @throws {Error} If privateKey is invalid or encryption fails
 */
export function encryptPrivateKey(privateKey) {
  // Input validation
  if (typeof privateKey !== 'string' || !privateKey) {
    throw new Error('privateKey must be a non-empty string');
  }

  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    
    // Optimized: Direct buffer operations without base64 round-trip
    let encrypted = cipher.update(privateKey, 'utf8');
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    
    const authTag = cipher.getAuthTag();
    
    // Format: [encrypted data][IV][auth tag]
    return Buffer.concat([
      encrypted,
      iv,
      authTag
    ]).toString('base64');
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypts a private key encrypted with encryptPrivateKey()
 * @param {string} encryptedData - Base64-encoded encrypted data
 * @returns {string} The decrypted private key
 * @throws {Error} If encryptedData is invalid or decryption fails
 */
export function decryptPrivateKey(encryptedData) {
  // Input validation
  if (typeof encryptedData !== 'string' || !encryptedData) {
    throw new Error('encryptedData must be a non-empty string');
  }

  try {
    const buffer = Buffer.from(encryptedData, 'base64');
    
    // Validate buffer length (at least IV + auth tag = 32 bytes)
    if (buffer.length < 32) {
      throw new Error('Invalid encrypted data: too short');
    }
    
    // Extract components: [encrypted data][IV (16 bytes)][auth tag (16 bytes)]
    const authTag = buffer.slice(-16);
    const iv = buffer.slice(-32, -16);
    const encrypted = buffer.slice(0, -32);
    
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    decipher.setAuthTag(authTag);
    
    // Optimized: Direct buffer operations
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted.toString('utf8');
  } catch (error) {
    // Don't expose sensitive details in error message
    if (error.message.includes('Unsupported state') || error.message.includes('bad decrypt')) {
      throw new Error('Decryption failed: invalid key or corrupted data');
    }
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generates a secure encryption key (32 bytes) for DID_ENCRYPTION_KEY
 * @returns {string} 64-character hex string suitable for .env
 */
export function generateEncryptionKey() {
  return crypto.randomBytes(32).toString('hex');
}


