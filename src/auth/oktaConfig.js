import { OktaAuth } from "@okta/okta-auth-js";

const {
  REACT_APP_OKTA_ISSUER,
  REACT_APP_OKTA_CLIENT_ID,
  REACT_APP_OKTA_REDIRECT_URI,
  REACT_APP_OKTA_SCOPES,
} = process.env;

if (!REACT_APP_OKTA_ISSUER || !REACT_APP_OKTA_CLIENT_ID) {
  throw new Error(
    "Okta configuration is missing. Ensure REACT_APP_OKTA_ISSUER and REACT_APP_OKTA_CLIENT_ID are set in .env"
  );
}

const scopes = REACT_APP_OKTA_SCOPES
  ? REACT_APP_OKTA_SCOPES.split(" ")
  : ["openid", "profile", "email"];

export const oktaAuth = new OktaAuth({
  issuer: REACT_APP_OKTA_ISSUER,
  clientId: REACT_APP_OKTA_CLIENT_ID,
  redirectUri: REACT_APP_OKTA_REDIRECT_URI || window.location.origin + "/login/callback",
  scopes,
  pkce: true,
  // Suppress SSL validation errors for the self-signed cert used by `react-scripts` on localhost.
  // Has no effect in production builds.
  disableHttpsCheck: process.env.NODE_ENV !== "production",
  // Allow enough time for a user to complete sign-in in a popup window.
  postMessageTimeout: 20000,
  tokenManager: {
    autoRenew: true,
    storage: "sessionStorage",
  },
});
