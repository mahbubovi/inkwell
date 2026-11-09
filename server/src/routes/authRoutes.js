const router = require('express').Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');
const { register, login, me } = require('../controllers/authController');

const email = body('email').trim().toLowerCase().isEmail().withMessage('Enter a valid email address.');

router.post(
  '/register',
  body('name').trim().isLength({ min: 2, max: 60 }).withMessage('Enter your full name.'),
  email,
  body('password')
    .isLength({ min: 8 }).withMessage('Use at least 8 characters, including a number.')
    .matches(/\d/).withMessage('Use at least 8 characters, including a number.'),
  validate,
  register
);
router.post('/login', email, body('password').notEmpty().withMessage('Enter your password.'), validate, login);
router.get('/me', protect, me);

module.exports = router;
