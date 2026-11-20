const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Post = require('../models/Post');
const Session = require('../models/Session');

/*
 * Session design
 *  - Access token: JWT, 15 minutes, kept in the browser's memory only (never localStorage).
 *  - Refresh token: random string in an httpOnly cookie (JavaScript cannot read it), rotated on every use.
 *    The database stores only its hash, so sessions can be listed and revoked (logout, "sign out everywhere").
 */
const COOKIE = 'ink_rt';
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_DAYS) || 7;
const GRACE_MS = 10 * 1000; // an old refresh token still works this long after rotation (two tabs refreshing together)

const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const newToken = () => crypto.randomBytes(48).toString('base64url');
const signAccess = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.ACCESS_TOKEN_EXPIRES || '15m' });

const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === 'true' : process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAMESITE || 'lax',
  path: '/api/auth', // the browser sends this cookie only to the auth endpoints
});
const setCookie = (res, raw) => res.cookie(COOKIE, raw, { ...cookieOptions(), maxAge: REFRESH_DAYS * 864e5 });
const clearCookie = (res) => res.clearCookie(COOKIE, cookieOptions());

async function startSession(req, res, user) {
  const raw = newToken();
  await Session.create({
    user: user._id, tokenHash: sha(raw), userAgent: (req.headers['user-agent'] || '').slice(0, 200),
    expiresAt: new Date(Date.now() + REFRESH_DAYS * 864e5),
  });
  setCookie(res, raw);
}

const describe = (ua = '') => {
  const browser = /Edg\//.test(ua) ? 'Edge' : /Firefox\//.test(ua) ? 'Firefox' : /Chrome\//.test(ua) ? 'Chrome' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'unknown device';
  return `${browser} on ${os}`;
};

// POST /api/auth/register
exports.register = async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email }))
    return res.status(409).json({
      message: 'An account with this email already exists.',
      errors: { email: 'An account with this email already exists. Log in instead.' },
    });
  const user = await User.create({ name, email, password });
  await startSession(req, res, user);
  res.status(201).json({ user, token: signAccess(user) });
};

// POST /api/auth/login
exports.login = async (req, res) => {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.matchPassword(req.body.password)))
    return res.status(401).json({ message: 'Email or password is incorrect. Check both and try again.' });
  await startSession(req, res, user);
  res.json({ user, token: signAccess(user) });
};

// POST /api/auth/refresh   (uses the httpOnly cookie; rotates the refresh token)
exports.refresh = async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (!raw) return res.status(401).json({ message: 'No active session.' });
  const hash = sha(raw);

  let session = await Session.findOne({ tokenHash: hash });
  if (session) {
    const next = newToken();
    Object.assign(session, { prevTokenHash: hash, rotatedAt: new Date(), tokenHash: sha(next), expiresAt: new Date(Date.now() + REFRESH_DAYS * 864e5) });
    await session.save();
    setCookie(res, next);
  } else {
    session = await Session.findOne({ prevTokenHash: hash });
    const withinGrace = session && Date.now() - session.rotatedAt.getTime() < GRACE_MS;
    if (session && !withinGrace) await Session.deleteOne({ _id: session._id }); // an old token came back later: treat it as stolen and end the session
    if (!withinGrace) { clearCookie(res); return res.status(401).json({ message: 'Your session has expired. Log in again.' }); }
    // within the grace period: the other tab already received the new cookie, so just hand out an access token
  }

  const user = await User.findById(session.user);
  if (!user) { clearCookie(res); return res.status(401).json({ message: 'Your session has expired. Log in again.' }); }
  res.json({ user, token: signAccess(user) });
};

// POST /api/auth/logout   (ends this device's session)
exports.logout = async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  if (raw) await Session.deleteOne({ $or: [{ tokenHash: sha(raw) }, { prevTokenHash: sha(raw) }] });
  clearCookie(res);
  res.json({ message: 'Logged out.' });
};

// POST /api/auth/logout-all   (ends every device's session)
exports.logoutAll = async (req, res) => {
  await Session.deleteMany({ user: req.user._id });
  clearCookie(res);
  res.json({ message: 'Signed out everywhere.' });
};

// GET /api/auth/me
exports.me = (req, res) => res.json({ user: req.user });

// GET /api/auth/profile   (user + their own post stats)
exports.profile = async (req, res) => {
  const rows = await Post.aggregate([
    { $match: { author: req.user._id } },
    { $group: { _id: '$status', count: { $sum: 1 }, views: { $sum: '$views' } } },
  ]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r]));
  res.json({
    user: req.user,
    stats: {
      posts: (by.published?.count || 0) + (by.draft?.count || 0),
      published: by.published?.count || 0,
      drafts: by.draft?.count || 0,
      views: (by.published?.views || 0) + (by.draft?.views || 0),
    },
  });
};

// PATCH /api/auth/profile
exports.updateProfile = async (req, res) => {
  req.user.name = req.body.name;
  req.user.bio = req.body.bio || '';
  await req.user.save();
  res.json({ user: req.user });
};

// PATCH /api/auth/password   (ends all other sessions and starts a fresh one for this device)
exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.matchPassword(currentPassword)))
    return res.status(400).json({ message: 'Current password is incorrect.', errors: { currentPassword: 'Current password is incorrect.' } });
  if (currentPassword === newPassword)
    return res.status(422).json({ message: 'Choose a different password.', errors: { newPassword: 'Choose a password you haven’t used before.' } });
  user.password = newPassword;
  user.passwordChangedAt = new Date(Date.now() - 1000);
  await user.save();
  await Session.deleteMany({ user: user._id });
  await startSession(req, res, user);
  res.json({ message: 'Password updated. Other devices were signed out.', token: signAccess(user) });
};

// GET /api/auth/sessions
exports.sessions = async (req, res) => {
  const raw = req.cookies?.[COOKIE];
  const current = raw ? sha(raw) : null;
  const list = await Session.find({ user: req.user._id }).sort('-updatedAt');
  res.json({
    sessions: list.map((s) => ({
      id: s._id, device: describe(s.userAgent), createdAt: s.createdAt, lastActive: s.updatedAt,
      current: !!current && (s.tokenHash === current || s.prevTokenHash === current),
    })),
  });
};

// DELETE /api/auth/sessions/:id
exports.revokeSession = async (req, res) => {
  const { deletedCount } = await Session.deleteOne({ _id: req.params.id, user: req.user._id });
  if (!deletedCount) return res.status(404).json({ message: 'Session not found.' });
  res.json({ message: 'Session ended.' });
};
