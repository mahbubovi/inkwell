const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const errorHandler = require('./middleware/error');

const app = express();
const origins = (process.env.CLIENT_URL || '').split(',').map((s) => s.trim()).filter(Boolean);

// CSP is off because the demo client loads Tailwind from a CDN with inline scripts.
// Turn it on and self-host assets for production.
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: origins.length ? origins : true }));
app.use(express.json({ limit: '100kb' }));

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 }), require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));
app.use('/api', (_req, res) => res.status(404).json({ message: 'Route not found.' }));

// In production, serve the built React app (client/dist) and fall back to index.html for client-side routes.
const dist = path.join(__dirname, '../../client/dist');
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('/{*splat}', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
}

app.use(errorHandler);
module.exports = app;
