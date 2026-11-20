const mongoose = require('mongoose');

// One document per logged-in device. Only a SHA-256 hash of the refresh token is stored,
// so a database leak cannot be used to hijack sessions.
const sessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    prevTokenHash: { type: String, index: true },   // previous token, accepted briefly after rotation (parallel tabs)
    rotatedAt: Date,
    userAgent: { type: String, default: '' },
    expiresAt: { type: Date, required: true, expires: 0 }, // MongoDB deletes the document automatically after this date
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
