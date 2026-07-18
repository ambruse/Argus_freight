const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';

// Generate a 32-byte key from the environment variable (or a secure default)
const getEncryptionKey = () => {
  const secret = process.env.ENCRYPTION_KEY || 'default-fallback-argus-secret-key-32b';
  return crypto.createHash('sha256').update(String(secret)).digest();
};

const encrypt = (text) => {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
};

const decrypt = (text) => {
  if (!text) return text;
  try {
    const parts = text.split(':');
    if (parts.length !== 2) return text; // fallback to text if not in 'iv:hex' format
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // If decryption fails, return plain text (handles pre-migration legacy data)
    return text;
  }
};

module.exports = {
  encrypt,
  decrypt
};
