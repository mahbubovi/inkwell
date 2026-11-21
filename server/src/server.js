require('dotenv').config({ quiet: true });
const mongoose = require('mongoose');
const app = require('./app');
const connectDB = require('./config/db');

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) { console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`); process.exit(1); }
}
if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters in production.');
  process.exit(1);
}

const PORT = process.env.PORT || 5000;
let server;

connectDB(process.env.MONGO_URI)
  .then(() => { server = app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)); })
  .catch((e) => { console.error('Database connection failed:', e.message); process.exit(1); });

// Hosts send SIGTERM when redeploying: finish open requests, close the database, then exit.
function shutdown(signal) {
  console.log(`${signal} received, shutting down`);
  const done = () => mongoose.disconnect().finally(() => process.exit(0));
  server ? server.close(done) : done();
  setTimeout(() => process.exit(1), 10000).unref();
}
['SIGTERM', 'SIGINT'].forEach((s) => process.on(s, () => shutdown(s)));
