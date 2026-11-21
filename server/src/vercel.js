// Vercel entry point: runs the Express app as a serverless function.
// Locally and on Render the app uses server.js instead (a long-running server).
const mongoose = require('mongoose');
const app = require('./app');

let connecting = null; // shared by requests while this function instance stays warm

async function ensureDb() {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { maxPoolSize: 5, serverSelectionTimeoutMS: 8000 })
      .finally(() => { connecting = null; });
  }
  await connecting;
}

const fail = (res, status, message) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ message }));
};

module.exports = async function handler(req, res) {
  // vercel.json rewrites /api/<path> to this function. Vercel passes the matched <path> as a "path" query value;
  // put the original URL back so the Express routes (/api/posts, /api/auth/login, ...) match.
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/api/index' || url.pathname === '/api/index.js') {
    const p = url.searchParams.get('path') || '';
    url.searchParams.delete('path');
    req.url = `/api/${p}${url.search}`;
  }

  if (!process.env.MONGO_URI || !process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32)) {
    console.error('Missing or weak MONGO_URI / JWT_SECRET. Set them in the Vercel project environment variables.');
    return fail(res, 500, 'The server is not configured correctly.');
  }
  try {
    await ensureDb();
  } catch (e) {
    console.error('Database connection failed:', e.message);
    return fail(res, 503, 'Database unavailable. Try again in a moment.');
  }
  return app(req, res);
};
