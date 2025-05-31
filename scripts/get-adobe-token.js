#!/usr/bin/env node
/*jshint node:true */
"use strict";

const fs = require('fs');
const path = require('path');

// Check if @adobe/aemcs-api-client-lib is available
let exchange;
try {
  exchange = require("@adobe/aemcs-api-client-lib");
} catch (error) {
  console.error("@adobe/aemcs-api-client-lib not found.");
  console.error("Install it from GitHub with: npm install https://github.com/adobe/aemcs-api-client-lib.git");
  console.error("Or run: npm install");
  process.exit(1);
}

const jsonfile = path.join(__dirname, "..", "service.json");

// Check if service.json exists
if (!fs.existsSync(jsonfile)) {
  console.error(`service.json not found at ${jsonfile}`);
  process.exit(1);
}

try {
  const serviceConfig = JSON.parse(fs.readFileSync(jsonfile, 'utf8'));
  
  console.log('Exchanging service credentials for access token...');
  
  // The Adobe API client library expects the complete service configuration object
  // as it appears in the service.json file
  exchange(serviceConfig).then(accessToken => {
    // output the access token in json form including when it will expire.
    console.log('✅ Access token generated successfully:');
    console.log(JSON.stringify(accessToken, null, 2));
    
    // Also output just the token for easy copying
    console.log('\n📋 Token for environment variable:');
    console.log(`REACT_APP_SERVICE_TOKEN=${accessToken.access_token}`);
  }).catch(e => {
    console.error("❌ Failed to exchange for access token:", e);
    process.exit(1);
  });
} catch (error) {
  console.error("❌ Error reading or parsing service.json:", error);
  process.exit(1);
} 