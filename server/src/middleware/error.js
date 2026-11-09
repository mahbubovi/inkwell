module.exports = (err, _req, res, _next) => {
  if (err.code === 11000)
    return res.status(409).json({
      message: 'An account with this email already exists.',
      errors: { email: 'An account with this email already exists. Log in instead.' },
    });
  if (err.name === 'CastError') return res.status(404).json({ message: 'Not found.' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ message: 'Request body is not valid JSON.' });
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on our side. Try again.' });
};
