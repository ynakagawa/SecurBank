/*
Copyright 2022 Adobe
All Rights Reserved.

NOTICE: Adobe permits you to use, modify, and distribute this file in
accordance with the terms of the Adobe license agreement accompanying
it.
*/

const express = require('express');
const fs = require('fs');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const helmet = require('helmet');
const router = express.Router();

// Security configuration
const {
  SECURITY_CONFIG,
  encryptData,
  decryptData,
  generateSecureId,
  validateServiceConfig,
  sanitizeConfigForLogging,
  createSecureCacheKey
} = require('../securityConfig');

// Import Adobe API client library
let exchange;
try {
  exchange = require("@adobe/aemcs-api-client-lib");
} catch (error) {
  console.error("@adobe/aemcs-api-client-lib not found.");
  console.error("Install it from GitHub with: npm install https://github.com/adobe/aemcs-api-client-lib.git");
  console.error("Or run: npm install");
}

// Apply security headers
router.use(helmet(SECURITY_CONFIG.HELMET_CONFIG));

// Rate limiting for authentication endpoints
const tokenRateLimit = rateLimit(SECURITY_CONFIG.RATE_LIMIT);

// Secure cache for service tokens (encrypted)
const secureTokenCache = new Map();

/**
 * Security audit log for token operations
 */
function auditLog(operation, details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    operation,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    success: details.success || false,
    error: details.error || null
  };
  
  // In production, this should go to a secure logging service
  console.log('SECURITY_AUDIT:', JSON.stringify(logEntry));
}

/**
 * Input validation middleware for token requests
 */
const validateTokenRequest = [
  body('client_id').optional().isLength({ min: 1, max: 100 }).trim().escape(),
  body('scope').optional().isLength({ min: 1, max: 200 }).trim(),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      auditLog('token_request_validation_failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: false,
        error: 'Invalid input parameters'
      });
      
      return res.status(400).json({
        error: 'Invalid request parameters',
        details: errors.array()
      });
    }
    next();
  }
];

/**
 * Get cached token securely
 * @param {string} cacheKey - Cache key
 * @returns {object|null} - Cached token or null
 */
function getSecureCachedToken(cacheKey) {
  try {
    const cached = secureTokenCache.get(cacheKey);
    if (!cached) return null;
    
    // Check if token is still valid
    if (cached.expiresAt <= Date.now()) {
      secureTokenCache.delete(cacheKey);
      return null;
    }
    
    // Decrypt the token
    const decryptedToken = decryptData(cached.encryptedToken);
    
    return {
      token: decryptedToken,
      expiresAt: cached.expiresAt,
      id: cached.id
    };
  } catch (error) {
    console.error('Error retrieving cached token:', error);
    secureTokenCache.delete(cacheKey);
    return null;
  }
}

/**
 * Store token securely in cache
 * @param {string} cacheKey - Cache key
 * @param {string} token - Access token
 * @param {number} expiresIn - Expiry time in seconds
 * @returns {string} - Token ID for tracking
 */
function setSecureCachedToken(cacheKey, token, expiresIn) {
  try {
    const tokenId = generateSecureId();
    const expiresAt = Date.now() + ((expiresIn - SECURITY_CONFIG.TOKEN_SAFETY_MARGIN) * 1000);
    
    // Encrypt the token before caching
    const encryptedToken = encryptData(token);
    
    secureTokenCache.set(cacheKey, {
      encryptedToken,
      expiresAt,
      id: tokenId,
      createdAt: Date.now()
    });
    
    return tokenId;
  } catch (error) {
    console.error('Error caching token:', error);
    throw new Error('Failed to cache token securely');
  }
}

/**
 * Generate service token for Adobe AEM authentication
 * POST /api/auth/service-token
 */
router.post('/service-token', 
  tokenRateLimit,
  validateTokenRequest,
  async (req, res) => {
    const startTime = Date.now();
    let serviceConfig = null;
    
    try {
      // Create secure cache key
      const cacheKey = createSecureCacheKey('adobe-service-token');
      
      // Check for valid cached token
      const cachedToken = getSecureCachedToken(cacheKey);
      if (cachedToken) {
        auditLog('token_cache_hit', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: true,
          tokenId: cachedToken.id
        });
        
        return res.json({
          access_token: cachedToken.token,
          expires_in: Math.floor((cachedToken.expiresAt - Date.now()) / 1000),
          token_type: 'Bearer',
          cached: true,
          token_id: cachedToken.id
        });
      }

      // Load and validate service configuration
      const serviceJsonPath = path.join(__dirname, '..', '..', '..', 'service.json');
      
      if (!fs.existsSync(serviceJsonPath)) {
        auditLog('service_config_missing', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          success: false,
          error: 'Service configuration file not found'
        });
        
        return res.status(500).json({
          error: 'Service configuration not found',
          message: 'service.json file is missing'
        });
      }

      // Read and parse service configuration
      const serviceConfigData = fs.readFileSync(serviceJsonPath, 'utf8');
      serviceConfig = JSON.parse(serviceConfigData);
      
      // Validate service configuration security
      validateServiceConfig(serviceConfig);
      
      // Exchange credentials for access token
      const accessToken = await exchange(serviceConfig);
      
      if (!accessToken || !accessToken.access_token) {
        throw new Error('Invalid token response from Adobe IMS');
      }
      
      // Validate token expiry
      const expiresIn = accessToken.expires_in || 3600;
      if (expiresIn > SECURITY_CONFIG.MAX_TOKEN_AGE) {
        console.warn('Token expiry exceeds maximum allowed age');
      }
      
      // Cache the token securely
      const tokenId = setSecureCachedToken(cacheKey, accessToken.access_token, expiresIn);
      
      auditLog('token_generated', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        tokenId,
        processingTime: Date.now() - startTime,
        serviceConfig: sanitizeConfigForLogging(serviceConfig)
      });

      res.json({
        access_token: accessToken.access_token,
        expires_in: expiresIn,
        token_type: 'Bearer',
        cached: false,
        token_id: tokenId
      });

    } catch (error) {
      console.error('Error generating service token:', error);
      
      auditLog('token_generation_failed', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime,
        serviceConfig: serviceConfig ? sanitizeConfigForLogging(serviceConfig) : null
      });
      
      // Don't expose internal error details in production
      const errorMessage = process.env.NODE_ENV === 'production' 
        ? 'Failed to generate service token'
        : error.message;
      
      res.status(500).json({
        error: 'Failed to generate service token',
        message: errorMessage
      });
    }
  }
);

/**
 * Clear cached service token
 * DELETE /api/auth/service-token
 */
router.delete('/service-token', tokenRateLimit, (req, res) => {
  try {
    const clearedCount = secureTokenCache.size;
    secureTokenCache.clear();
    
    auditLog('token_cache_cleared', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: true,
      clearedTokens: clearedCount
    });
    
    res.json({ 
      message: 'Token cache cleared',
      cleared_tokens: clearedCount
    });
  } catch (error) {
    console.error('Error clearing token cache:', error);
    
    auditLog('token_cache_clear_failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      error: error.message
    });
    
    res.status(500).json({
      error: 'Failed to clear token cache'
    });
  }
});

/**
 * Get service token status
 * GET /api/auth/service-token/status
 */
router.get('/service-token/status', tokenRateLimit, (req, res) => {
  try {
    const cacheKey = createSecureCacheKey('adobe-service-token');
    const cachedToken = getSecureCachedToken(cacheKey);
    
    if (cachedToken) {
      const isValid = cachedToken.expiresAt > Date.now();
      const expiresIn = Math.floor((cachedToken.expiresAt - Date.now()) / 1000);
      
      auditLog('token_status_check', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        tokenId: cachedToken.id,
        isValid
      });
      
      res.json({
        cached: true,
        valid: isValid,
        expires_in: isValid ? expiresIn : 0,
        expires_at: new Date(cachedToken.expiresAt).toISOString(),
        token_id: cachedToken.id
      });
    } else {
      auditLog('token_status_check', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        success: true,
        cached: false
      });
      
      res.json({
        cached: false,
        valid: false,
        expires_in: 0
      });
    }
  } catch (error) {
    console.error('Error checking token status:', error);
    
    auditLog('token_status_check_failed', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      success: false,
      error: error.message
    });
    
    res.status(500).json({
      error: 'Failed to check token status'
    });
  }
});

/**
 * Health check endpoint for monitoring
 * GET /api/auth/health
 */
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    cache_size: secureTokenCache.size
  });
});

module.exports = router; 