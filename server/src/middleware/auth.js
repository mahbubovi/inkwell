const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects a route. Expects the short-lived access token: "Authorization: Bearer <token>".
module.exports = async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Log in to continue.' });

  try {
    const { id, iat } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select('+passwordChangedAt');
    if (!user) throw new Error('user not found');
    // A password change invalidates access tokens issued before it.
    if (user.passwordChangedAt && iat * 1000 < user.passwordChangedAt.getTime()) throw new Error('password changed');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Log in again.' });
  }
};
