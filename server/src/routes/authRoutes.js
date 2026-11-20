const router = require('express').Router();
const { body, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');
const c = require('../controllers/authController');

const email = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.');
const strongPassword = (field) =>
  body(field).isLength({ min: 8 }).withMessage('Use at least 8 characters, including a number.')
    .matches(/\d/).withMessage('Use at least 8 characters, including a number.');
const name = body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your full name.');

// Slows down password guessing: 20 failed attempts per 15 minutes per IP (successful requests are not counted).
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true,
  message: { message: 'Too many attempts. Try again in a few minutes.' },
});

router.post('/register', credentialLimiter, name, email, strongPassword('password'), validate, c.register);
router.post('/login', credentialLimiter, email, body('password').notEmpty().withMessage('Enter your password.'), validate, c.login);
router.post('/refresh', c.refresh);
router.post('/logout', c.logout);

router.get('/me', protect, c.me);
router.get('/profile', protect, c.profile);
router.patch('/profile', protect, name, body('bio').optional({ values: 'falsy' }).trim().isLength({ max: 160 }).withMessage('Keep your bio under 160 characters.'), validate, c.updateProfile);
router.patch('/password', protect, body('currentPassword').notEmpty().withMessage('Enter your current password.'), strongPassword('newPassword'), validate, c.changePassword);
router.get('/sessions', protect, c.sessions);
router.delete('/sessions/:id', protect, param('id').isMongoId().withMessage('Invalid session id.'), validate, c.revokeSession);
router.post('/logout-all', protect, c.logoutAll);

module.exports = router;
