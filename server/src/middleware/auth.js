const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protects a route: expects "Authorization: Bearer <token>"
module.exports = async function protect(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Log in to continue.' });

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id);
    if (!user) throw new Error('user not found');
    req.user = user;
    next();
  } catch {
    res.status(401).json({ message: 'Your session has expired. Log in again.' });
  }
};
