/*
Copyright 2022 Adobe
All Rights Reserved.

NOTICE: Adobe permits you to use, modify, and distribute this file in
accordance with the terms of the Adobe license agreement accompanying
it.
*/

/**
 * Authentication service for Adobe AEM Headless
 * Handles different authentication methods including service tokens
 */

// Environment variables for authentication
const {
  REACT_APP_AUTH_METHOD,
  REACT_APP_DEV_TOKEN,
  REACT_APP_BASIC_AUTH_USER,
  REACT_APP_BASIC_AUTH_PASS,
  REACT_APP_SERVICE_TOKEN,
  REACT_APP_IMS_ENDPOINT,
  REACT_APP_CLIENT_ID,
  REACT_APP_CLIENT_SECRET,
  REACT_APP_TECHNICAL_ACCOUNT_ID,
  REACT_APP_ORG_ID,
  REACT_APP_META_SCOPES,
} = process.env;

/**
 * Service token cache to avoid unnecessary token refreshes
 */
let serviceTokenCache = {
  token: null,
  expiresAt: null,
};

/**
 * Get authorization configuration based on environment variables
 * @returns {string|Array|null} Authorization configuration
 */
export const getAuthConfig = () => {
  console.log('Getting auth config, method:', REACT_APP_AUTH_METHOD);
  
  switch (REACT_APP_AUTH_METHOD) {
    case 'basic':
      if (!REACT_APP_BASIC_AUTH_USER || !REACT_APP_BASIC_AUTH_PASS) {
        console.warn('Basic auth credentials not found in environment variables');
        return null;
      }
      console.log('Using basic authentication');
      return [REACT_APP_BASIC_AUTH_USER, REACT_APP_BASIC_AUTH_PASS];
      
    case 'dev-token':
      if (!REACT_APP_DEV_TOKEN) {
        console.warn('Dev token not found in environment variables');
        return null;
      }
      console.log('Using dev token authentication');
      return REACT_APP_DEV_TOKEN;
      
    case 'service-token':
      console.log('Using service token authentication');
      // For service tokens, we'll handle this separately
      const token = getServiceToken();
      if (token) {
        console.log('Service token obtained successfully');
      } else {
        console.error('Failed to obtain service token');
      }
      return token;
      
    default:
      console.log('No authentication method specified or using default (none)');
      return null;
  }
};

/**
 * Get service token from cache or environment variable
 * @returns {string|null} Service token
 */
export const getServiceToken = () => {
  // If we have a cached token that's still valid, use it
  if (serviceTokenCache.token && serviceTokenCache.expiresAt && Date.now() < serviceTokenCache.expiresAt) {
    console.log('Using cached service token');
    return serviceTokenCache.token;
  }

  // Check if token is provided via environment variable
  if (REACT_APP_SERVICE_TOKEN) {
    console.log('Using service token from environment variable');
    // Cache the token (assume 1 hour expiry if not specified)
    serviceTokenCache.token = REACT_APP_SERVICE_TOKEN;
    serviceTokenCache.expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
    return REACT_APP_SERVICE_TOKEN;
  }

  console.warn('Service token not found. Please set REACT_APP_SERVICE_TOKEN or use server-side token generation.');
  return null;
};

/**
 * Set service token in cache (useful when token is obtained from server)
 * @param {string} token - The access token
 * @param {number} expiresIn - Token expiry time in seconds
 */
export const setServiceToken = (token, expiresIn = 3600) => {
  serviceTokenCache.token = token;
  serviceTokenCache.expiresAt = Date.now() + (expiresIn * 1000);
};

/**
 * Clear cached service token
 */
export const clearServiceToken = () => {
  serviceTokenCache.token = null;
  serviceTokenCache.expiresAt = null;
};

/**
 * Check if current authentication method is service token
 * @returns {boolean}
 */
export const isServiceTokenAuth = () => {
  return REACT_APP_AUTH_METHOD === 'service-token';
};

/**
 * Get service configuration for server-side token generation
 * @returns {object|null} Service configuration object
 */
export const getServiceConfig = () => {
  if (!REACT_APP_IMS_ENDPOINT || !REACT_APP_CLIENT_ID || !REACT_APP_CLIENT_SECRET) {
    return null;
  }

  return {
    imsEndpoint: REACT_APP_IMS_ENDPOINT,
    clientId: REACT_APP_CLIENT_ID,
    clientSecret: REACT_APP_CLIENT_SECRET,
    technicalAccountId: REACT_APP_TECHNICAL_ACCOUNT_ID,
    orgId: REACT_APP_ORG_ID,
    metaScopes: REACT_APP_META_SCOPES || 'ent_aem_cloud_api',
  };
};

/**
 * Fetch service token from your backend API
 * This is the recommended approach for production applications
 * @returns {Promise<string|null>} Service token
 */
export const fetchServiceTokenFromAPI = async () => {
  try {
    // Replace with your actual API endpoint
    const response = await fetch('/api/auth/service-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch service token: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data.access_token) {
      // Cache the token
      setServiceToken(data.access_token, data.expires_in);
      return data.access_token;
    }

    throw new Error('No access token in response');
  } catch (error) {
    console.error('Error fetching service token from API:', error);
    return null;
  }
};

export default {
  getAuthConfig,
  getServiceToken,
  setServiceToken,
  clearServiceToken,
  isServiceTokenAuth,
  getServiceConfig,
  fetchServiceTokenFromAPI,
}; 