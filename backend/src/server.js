require('dotenv').config();
const express = require('express'), cors = require('cors'), mongoose = require('mongoose');
const { tenant } = require('./middleware/auth');
const app = express();
const mongooseCache = global.__restaurantMongooseCache || (global.__restaurantMongooseCache = { conn: null, promise: null });

async function connectToDatabase() {
  if (mongooseCache.conn) return mongooseCache.conn;
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not configured.');
  if (!mongooseCache.promise) {
    mongooseCache.promise = mongoose.connect(process.env.MONGO_URI)
      .then(connection => {
        mongooseCache.conn = connection;
        return connection;
      })
      .catch(error => {
        mongooseCache.conn = null;
        mongooseCache.promise = null;
        throw error;
      });
  }
  return mongooseCache.promise;
}

if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
const allowedOrigins = (process.env.CORS_ORIGINS === undefined
  ? 'http://localhost:3000,http://localhost:3001'
  : process.env.CORS_ORIGINS)
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);
app.use(cors({
  origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin))
}), express.json({ limit: '24kb' }));
app.use(async (_req, res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (_error) {
    res.status(503).json({ ok: false, error: 'Database connection failed. Check MONGO_URI and Atlas network access.' });
  }
});
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/inquiries', require('./routes/inquiries'));
app.use('/api/super', require('./routes/super'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/r/:slug', tenant, require('./routes/store'));

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 5000;
  app.listen(port, () => console.log('API running on port ' + port));
}
