const crypto = require('crypto');

// Security configuration constants
const SECURITY_CONFIG = {
  // Rate limiting configuration
  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // limit each IP to 10 requests per windowMs
    message: 'Too many token requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
  },
  
  // Helmet security configuration
  HELMET_CONFIG: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://ims-na1.adobelogin.com", "https://*.adobeaemcloud.com"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  },
  
  // Token configuration
  MAX_TOKEN_AGE: 3600, // 1 hour in seconds
  TOKEN_SAFETY_MARGIN: 300, // 5 minutes safety margin
  
  // Encryption configuration
  ENCRYPTION_ALGORITHM: 'aes-256-gcm',
  ENCRYPTION_KEY_LENGTH: 32,
  IV_LENGTH: 16,
  AUTH_TAG_LENGTH: 16,
  
  // Cache configuration
  CACHE_MAX_SIZE: 100,
  CACHE_TTL: 3600000, // 1 hour in milliseconds
};

// Generate encryption key from environment variable or create a default one
function getEncryptionKey() {
  const envKey = process.env.ENCRYPTION_KEY;
  if (envKey && envKey.length >= SECURITY_CONFIG.ENCRYPTION_KEY_LENGTH) {
    return Buffer.from(envKey, 'hex');
  }
  
  // Fallback to a default key (not recommended for production)
  console.warn('ENCRYPTION_KEY not set, using default key. Set ENCRYPTION_KEY environment variable for production.');
  return crypto.scryptSync('default-securbank-key', 'salt', SECURITY_CONFIG.ENCRYPTION_KEY_LENGTH);
}

const encryptionKey = getEncryptionKey();

/**
 * Encrypt data using AES-256-GCM
 * @param {string} data - Data to encrypt
 * @returns {string} - Encrypted data as hex string
 */
function encryptData(data) {
  try {
    const iv = crypto.randomBytes(SECURITY_CONFIG.IV_LENGTH);
    const cipher = crypto.createCipher(SECURITY_CONFIG.ENCRYPTION_ALGORITHM, encryptionKey);
    cipher.setAAD(Buffer.from('securbank-auth', 'utf8'));
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    // Combine IV, encrypted data, and auth tag
    return iv.toString('hex') + ':' + encrypted + ':' + authTag.toString('hex');
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedData - Encrypted data as hex string
 * @returns {string} - Decrypted data
 */
function decryptData(encryptedData) {
  try {
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    
    const decipher = crypto.createDecipher(SECURITY_CONFIG.ENCRYPTION_ALGORITHM, encryptionKey);
    decipher.setAAD(Buffer.from('securbank-auth', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Generate a secure random ID
 * @returns {string} - Secure random ID
 */
function generateSecureId() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Validate service configuration for security
 * @param {object} config - Service configuration object
 */
function validateServiceConfig(config) {
  if (!config) {
    throw new Error('Service configuration is required');
  }
  
  if (!config.client_id || typeof config.client_id !== 'string') {
    throw new Error('Invalid client_id in service configuration');
  }
  
  if (!config.client_secret || typeof config.client_secret !== 'string') {
    throw new Error('Invalid client_secret in service configuration');
  }
  
  if (!config.technical_account_id || typeof config.technical_account_id !== 'string') {
    throw new Error('Invalid technical_account_id in service configuration');
  }
  
  if (!config.org_id || typeof config.org_id !== 'string') {
    throw new Error('Invalid org_id in service configuration');
  }
  
  if (!config.private_key || typeof config.private_key !== 'string') {
    throw new Error('Invalid private_key in service configuration');
  }
  
  // Validate private key format (should be a valid PEM format)
  if (!config.private_key.includes('-----BEGIN PRIVATE KEY-----')) {
    throw new Error('Invalid private key format');
  }
}

/**
 * Sanitize configuration for logging (remove sensitive data)
 * @param {object} config - Service configuration object
 * @returns {object} - Sanitized configuration
 */
function sanitizeConfigForLogging(config) {
  if (!config) return null;
  
  return {
    client_id: config.client_id ? `${config.client_id.substring(0, 8)}...` : 'missing',
    technical_account_id: config.technical_account_id ? `${config.technical_account_id.substring(0, 8)}...` : 'missing',
    org_id: config.org_id ? `${config.org_id.substring(0, 8)}...` : 'missing',
    private_key: config.private_key ? '***PRESENT***' : 'missing',
    client_secret: config.client_secret ? '***PRESENT***' : 'missing',
    meta_scopes: config.meta_scopes || [],
    ims_org_id: config.ims_org_id ? `${config.ims_org_id.substring(0, 8)}...` : 'missing'
  };
}

/**
 * Create a secure cache key
 * @param {string} prefix - Key prefix
 * @returns {string} - Secure cache key
 */
function createSecureCacheKey(prefix) {
  const timestamp = Math.floor(Date.now() / (SECURITY_CONFIG.CACHE_TTL));
  return `${prefix}:${timestamp}`;
}

module.exports = {
  SECURITY_CONFIG,
  encryptData,
  decryptData,
  generateSecureId,
  validateServiceConfig,
  sanitizeConfigForLogging,
  createSecureCacheKey
}; 