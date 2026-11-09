require('dotenv').config({ quiet: true });
const app = require('./app');
const connectDB = require('./config/db');

for (const key of ['MONGO_URI', 'JWT_SECRET']) {
  if (!process.env[key]) { console.error(`Missing ${key}. Copy .env.example to .env and fill it in.`); process.exit(1); }
}

const PORT = process.env.PORT || 5000;
connectDB(process.env.MONGO_URI)
  .then(() => app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`)))
  .catch((e) => { console.error('Database connection failed:', e.message); process.exit(1); });
