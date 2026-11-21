const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const errorHandler = require('./middleware/error');

const app = express();
const isProd = process.env.NODE_ENV === 'production';
const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);

// Behind a host's proxy (Render, Heroku...) the real client IP comes from X-Forwarded-For.
// Without this, every visitor would share one rate-limit bucket.
if (isProd || process.env.TRUST_PROXY) app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", 'https://fonts.googleapis.com'],
      styleSrcAttr: ["'unsafe-inline'"], // React inline style attributes (post cover gradients)
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: isProd ? [] : null,
    },
  },
}));
app.use(compression());
app.use(cors({ origin: origins.length ? origins : true, credentials: true })); // credentials: lets the browser send the refresh cookie
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => {
  const up = mongoose.connection.readyState === 1;
  res.status(up ? 200 : 503).json({ status: up ? 'ok' : 'degraded', db: up ? 'up' : 'down', uptime: Math.round(process.uptime()) });
});

app.use('/api', (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api', (_req, res) => res.status(404).json({ message: 'Route not found.' }));

// Serve the built React app (client/dist). Hashed files under /assets are cached for a year;
// index.html is always revalidated so new deployments show up immediately.
const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist, {
    index: false,
    setHeaders: (res, file) => {
      if (file.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    },
  }));
  app.get('/{*splat}', (req, res) => {
    if (path.extname(req.path)) return res.status(404).end(); // a missing file, not a page
    res.set('Cache-Control', 'no-cache');
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.use(errorHandler);
module.exports = app;
