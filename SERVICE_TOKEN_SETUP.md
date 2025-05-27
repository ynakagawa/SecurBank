# Service Token Integration Setup

This guide explains how to set up and use Adobe AEM service token authentication in your SecurBank application.

## Overview

Service tokens provide a secure way to authenticate with Adobe AEM Cloud Service APIs. This implementation supports both client-side and server-side token management approaches.

## Prerequisites

1. Adobe AEM Cloud Service instance
2. Service account integration configured in Adobe Developer Console
3. `service.json` file with your integration credentials

## Installation

The Adobe AEM Cloud Service API Client Library is installed directly from the [official GitHub repository](https://github.com/adobe/aemcs-api-client-lib):

```bash
npm install
```

This will automatically install `@adobe/aemcs-api-client-lib` from `https://github.com/adobe/aemcs-api-client-lib.git` as specified in package.json.

## Setup Methods

### Method 1: Server-Side Token Generation (Recommended for Production)

This approach generates tokens on your backend server, keeping sensitive credentials secure.

#### 1. Install Dependencies

```bash
npm install
```

#### 2. Configure Environment Variables

Copy `env.example` to `.env` and configure:

```bash
# Set authentication method to service-token
REACT_APP_AUTH_METHOD=service-token

# AEM instance configuration
REACT_APP_HOST_URI=https://publish-p18253-e46622.adobeaemcloud.com
REACT_APP_GRAPHQL_ENDPOINT=/content/graphql/global/endpoint.json
REACT_APP_USE_PROXY=false
```

#### 3. Start the Application

```bash
# Start the development server with backend API
npm start

# The backend will automatically handle token generation using service.json
```

#### 4. API Endpoints

Your application now provides these endpoints:

- `POST /api/auth/service-token` - Generate a new service token
- `GET /api/auth/service-token/status` - Check token status
- `DELETE /api/auth/service-token` - Clear cached token

### Method 2: Manual Token Generation

Generate tokens manually using the command-line script.

#### 1. Generate Token

```bash
npm run get-adobe-token
```

This will output:
- Full token response with expiration details
- Environment variable format for easy copying

#### 2. Set Environment Variable

Copy the generated token to your `.env` file:

```bash
REACT_APP_SERVICE_TOKEN=your-generated-token-here
```

#### 3. Configure Authentication Method

```bash
REACT_APP_AUTH_METHOD=service-token
```

### Method 3: Client-Side Token Management

For development environments, you can set the token directly.

```bash
# Set the token directly (not recommended for production)
REACT_APP_SERVICE_TOKEN=your-service-token
REACT_APP_AUTH_METHOD=service-token
```

## Authentication Service API

The `authService.js` provides a comprehensive API for token management:

```javascript
import authService from './src/api/authService';

// Get current auth configuration
const auth = authService.getAuthConfig();

// Check if using service token authentication
const isServiceToken = authService.isServiceTokenAuth();

// Get service token (from cache or environment)
const token = authService.getServiceToken();

// Set token programmatically
authService.setServiceToken('your-token', 3600); // token, expires_in_seconds

// Clear cached token
authService.clearServiceToken();

// Fetch token from backend API
const token = await authService.fetchServiceTokenFromAPI();
```

## Service Configuration

Your `service.json` should contain the integration details from Adobe Developer Console:

```json
{
  "integration": {
    "imsEndpoint": "ims-na1.adobelogin.com",
    "metascopes": "ent_aem_cloud_api",
    "technicalAccount": {
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret"
    },
    "email": "your-technical-account@techacct.adobe.com",
    "id": "your-technical-account-id@techacct.adobe.com",
    "org": "your-org-id@AdobeOrg",
    "privateKey": "-----BEGIN RSA PRIVATE KEY-----\n...",
    "publicKey": "-----BEGIN CERTIFICATE-----\n...",
    "certificateExpirationDate": "2026-05-21T14:16:46.000Z"
  }
}
```

## Security Best Practices

1. **Never commit `service.json` to version control** - Add it to `.gitignore`
2. **Use server-side token generation in production** - Keep credentials on the server
3. **Implement token caching** - Avoid unnecessary API calls
4. **Monitor token expiration** - Implement automatic refresh logic
5. **Use HTTPS in production** - Protect tokens in transit

## Troubleshooting

### Common Issues

1. **"Module not found: Error: Can't resolve 'fs'"**
   - This error occurs when Node.js modules are used in browser code
   - Solution: Use the updated `aemHeadlessClient.js` which separates server and client code

2. **"Service token not found"**
   - Check that `REACT_APP_SERVICE_TOKEN` is set in your environment
   - Or ensure the backend API is running for server-side generation

3. **"Failed to exchange for access token"**
   - Verify your `service.json` configuration
   - Check that all required fields are present and valid
   - Ensure the certificate hasn't expired

4. **CORS errors**
   - The server includes CORS headers for development
   - In production, configure your reverse proxy accordingly

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=adobe:*
```

## Production Deployment

1. **Environment Variables**: Set all required `REACT_APP_*` variables
2. **Service Configuration**: Ensure `service.json` is available on the server
3. **HTTPS**: Use HTTPS for all communications
4. **Token Caching**: The backend automatically caches tokens to reduce API calls
5. **Monitoring**: Monitor token generation and usage

## Example Usage

```javascript
// In your React component
import { useEffect, useState } from 'react';
import aemHeadlessClient from './api/aemHeadlessClient';

function MyComponent() {
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // The client automatically handles authentication
        const response = await aemHeadlessClient.runQuery(`
          query {
            articleList {
              items {
                title
                description
              }
            }
          }
        `);
        setData(response.data);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      {data ? (
        <pre>{JSON.stringify(data, null, 2)}</pre>
      ) : (
        <p>Loading...</p>
      )}
    </div>
  );
}
```

## Support

For issues related to:
- Adobe AEM Cloud Service: Check Adobe documentation
- Service account setup: Adobe Developer Console documentation
- This implementation: Check the code comments and error messages 