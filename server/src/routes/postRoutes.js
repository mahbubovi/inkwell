const router = require('express').Router();
const { body, param } = require('express-validator');
const validate = require('../middleware/validate');
const protect = require('../middleware/auth');
const { CATEGORIES } = require('../models/Post');
const c = require('../controllers/postController');

const id = param('id').isMongoId().withMessage('Invalid post id.');
const postRules = [
  body('title').trim().isLength({ min: 5, max: 120 }).withMessage('Add a title of 5 to 120 characters.'),
  body('category').isIn(CATEGORIES).withMessage('Choose a category.'),
  body('status').isIn(['draft', 'published']).withMessage('Status must be draft or published.'),
  body('excerpt').optional({ values: 'falsy' }).trim().isLength({ max: 160 }).withMessage('Keep the summary under 160 characters.'),
  body('body')
    .trim()
    .custom((v, { req }) => req.body.status !== 'published' || (v.match(/\S+/g) || []).length >= 50)
    .withMessage('Write at least 50 words to publish.'),
];

router.get('/', c.list);
router.get('/mine', protect, c.mine); // must stay above '/:id'
router.get('/:id', id, validate, c.get);
router.post('/', protect, postRules, validate, c.create);
router.put('/:id', protect, id, postRules, validate, c.update);
router.delete('/:id', protect, id, validate, c.remove);

module.exports = router;
