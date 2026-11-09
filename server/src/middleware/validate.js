const { validationResult } = require('express-validator');

// Turns express-validator results into { message, errors: { field: message } }
module.exports = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = {};
  result.array().forEach((e) => { errors[e.path] ??= e.msg; });
  res.status(422).json({ message: 'Please fix the highlighted fields.', errors });
};
