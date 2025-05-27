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
const router = express.Router();

// Import Adobe API client library
let exchange;
try {
  exchange = require("@adobe/aemcs-api-client-lib");
} catch (error) {
  console.error("@adobe/aemcs-api-client-lib not found.");
  console.error("Install it from GitHub with: npm install https://github.com/adobe/aemcs-api-client-lib.git");
  console.error("Or run: npm install");
}

// Cache for service tokens to avoid unnecessary API calls
const tokenCache = new Map();

/**
 * Generate service token for Adobe AEM authentication
 * POST /api/auth/service-token
 */
router.post('/service-token', async (req, res) => {
  try {
    // Check if we have a cached valid token
    const cacheKey = 'adobe-service-token';
    const cachedToken = tokenCache.get(cacheKey);
    
    if (cachedToken && cachedToken.expiresAt > Date.now()) {
      return res.json({
        access_token: cachedToken.token,
        expires_in: Math.floor((cachedToken.expiresAt - Date.now()) / 1000),
        token_type: 'Bearer',
        cached: true
      });
    }

    // Load service configuration
    const serviceJsonPath = path.join(__dirname, '..', '..', '..', 'service.json');
    
    if (!fs.existsSync(serviceJsonPath)) {
      return res.status(500).json({
        error: 'Service configuration not found',
        message: 'service.json file is missing'
      });
    }

    const serviceConfig = JSON.parse(fs.readFileSync(serviceJsonPath, 'utf8'));
    
    // Extract the integration config
    const config = {
      imsEndpoint: serviceConfig.integration.imsEndpoint,
      clientId: serviceConfig.integration.technicalAccount.clientId,
      clientSecret: serviceConfig.integration.technicalAccount.clientSecret,
      technicalAccountId: serviceConfig.integration.id,
      orgId: serviceConfig.integration.org,
      metaScopes: serviceConfig.integration.metascopes,
      privateKey: serviceConfig.integration.privateKey,
    };

    // Exchange credentials for access token
    const accessToken = await exchange(config);
    
    // Cache the token (subtract 5 minutes for safety margin)
    const expiresAt = Date.now() + ((accessToken.expires_in - 300) * 1000);
    tokenCache.set(cacheKey, {
      token: accessToken.access_token,
      expiresAt: expiresAt
    });

    res.json({
      access_token: accessToken.access_token,
      expires_in: accessToken.expires_in,
      token_type: 'Bearer',
      cached: false
    });

  } catch (error) {
    console.error('Error generating service token:', error);
    res.status(500).json({
      error: 'Failed to generate service token',
      message: error.message
    });
  }
});

/**
 * Clear cached service token
 * DELETE /api/auth/service-token
 */
router.delete('/service-token', (req, res) => {
  tokenCache.clear();
  res.json({ message: 'Token cache cleared' });
});

/**
 * Get service token status
 * GET /api/auth/service-token/status
 */
router.get('/service-token/status', (req, res) => {
  const cacheKey = 'adobe-service-token';
  const cachedToken = tokenCache.get(cacheKey);
  
  if (cachedToken) {
    const isValid = cachedToken.expiresAt > Date.now();
    const expiresIn = Math.floor((cachedToken.expiresAt - Date.now()) / 1000);
    
    res.json({
      cached: true,
      valid: isValid,
      expires_in: isValid ? expiresIn : 0,
      expires_at: new Date(cachedToken.expiresAt).toISOString()
    });
  } else {
    res.json({
      cached: false,
      valid: false,
      expires_in: 0
    });
  }
});

module.exports = router; 