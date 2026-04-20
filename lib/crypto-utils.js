const { createCipheriv, createDecipheriv, randomBytes, createHash } = require('crypto');

function getKey() {
  const secret = process.env.ENCRYPTION_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-dev-key-32-chars-min!!';
  return createHash('sha256').update(secret).digest();
}

function encrypt(text) {
  const key = getKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(encryptedData) {
  // Legacy base64 fallback (pre-AES credentials)
  if (!encryptedData.includes(':')) {
    return Buffer.from(encryptedData, 'base64').toString('utf-8');
  }
  const [ivHex, authTagHex, encryptedHex] = encryptedData.split(':');
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

module.exports = { encrypt, decrypt };
