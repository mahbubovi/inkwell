const jwt = require('jsonwebtoken');
const User = require('../models/User');

const signToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email }))
    return res.status(409).json({
      message: 'An account with this email already exists.',
      errors: { email: 'An account with this email already exists. Log in instead.' },
    });
  const user = await User.create({ name, email, password });
  res.status(201).json({ user, token: signToken(user) });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password)))
    return res.status(401).json({ message: 'Email or password is incorrect. Check both and try again.' });
  res.json({ user, token: signToken(user) });
};

// GET /api/auth/me
exports.me = (req, res) => res.json({ user: req.user });
