const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Like protect, but never blocks: sets req.user when a valid token is sent, otherwise carries on as a guest.
module.exports = async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try {
      const { id } = jwt.verify(header.slice(7), process.env.JWT_SECRET);
      req.user = await User.findById(id);
    } catch { /* invalid token: treat as guest */ }
  }
  next();
};
