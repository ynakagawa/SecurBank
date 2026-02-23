const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const app = express();

// Security middleware - must be first
app.use(helmet({
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
}));

// General rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// Trust proxy (important for rate limiting with reverse proxies)
app.set('trust proxy', 1);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));

// Centralised allowlist — used for both CORS and CSRF origin validation.
const ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'https://securbankdemo.vercel.app',
  'https://publish-p18253-e46622.adobeaemcloud.com',
]);

// Enhanced CORS configuration
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Only reflect origins that are explicitly allow-listed.
  // Never echo an unknown origin or fall back to '*' with credentials.
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }

  res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRF-Token');

  // Security headers
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

/**
 * CSRF origin validation middleware.
 * Checks the Origin (or Referer as fallback) header against the allow-list.
 * Applied to every state-mutating API route (POST, DELETE, PATCH, PUT).
 */
function validateCsrfOrigin(req, res, next) {
  // Safe methods and same-origin requests (no Origin header) are allowed through.
  const origin = req.headers.origin;
  if (!origin) return next();

  if (!ALLOWED_ORIGINS.has(origin)) {
    return res.status(403).json({
      error: 'CSRF protection: request origin is not permitted',
    });
  }
  next();
}

app.use('/api/auth', validateCsrfOrigin);

// Auth routes for service token management
const authRoutes = require('./src/api/routes/auth');
app.use('/api/auth', authRoutes);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, 'build')));

// Proxy other API requests to your backend (if needed)
app.use('/api/aem', createProxyMiddleware({
  target: 'http://localhost:3000',
  changeOrigin: true,
  onProxyRes: function(proxyRes, req) {
    const origin = req.headers.origin;
    // Only set ACAO for allow-listed origins — never reflect an arbitrary origin
    // or fall back to '*', which would bypass the Same-Origin Policy.
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      proxyRes.headers['Access-Control-Allow-Origin'] = origin;
      proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    } else {
      delete proxyRes.headers['access-control-allow-origin'];
      delete proxyRes.headers['access-control-allow-credentials'];
    }
    proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS';
    proxyRes.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Authorization';
  }
}));

// For any other request, send back the React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🔒 Secure server is running on port ${PORT}`);
  console.log(`🛡️  Security features enabled: Rate limiting, CORS, CSP, HSTS`);
}); 