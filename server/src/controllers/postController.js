const Post = require('../models/Post');
const { CATEGORIES } = Post;

const withAuthor = { path: 'author', select: 'name' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/posts?q=&category=   (public, published only)
exports.list = async (req, res) => {
  const { q = '', category = '' } = req.query;
  const filter = { status: 'published' };
  if (CATEGORIES.includes(category)) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ title: rx }, { excerpt: rx }];
  }
  const posts = await Post.find(filter).sort('-createdAt').limit(50).select('-body').populate(withAuthor);
  res.json({ posts });
};

// GET /api/posts/mine   (the logged-in user's posts, drafts included)
exports.mine = async (req, res) => {
  const posts = await Post.find({ author: req.user._id }).sort('-updatedAt').limit(100).populate(withAuthor);
  res.json({ posts });
};

// GET /api/posts/:id   (public, published only; counts a view)
exports.get = async (req, res) => {
  const post = await Post.findOneAndUpdate(
    { _id: req.params.id, status: 'published' },
    { $inc: { views: 1 } },
    { returnDocument: 'after' }
  ).populate(withAuthor);
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  res.json({ post });
};

// POST /api/posts   (create blog)
exports.create = async (req, res) => {
  const { title, body, excerpt, category, status } = req.body;
  const post = await Post.create({ title, body, excerpt, category, status, author: req.user._id });
  res.status(201).json({ post: await post.populate(withAuthor) });
};

// PUT /api/posts/:id   (owner only)
exports.update = async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  const { title, body, excerpt, category, status } = req.body;
  Object.assign(post, { title, body, excerpt: excerpt || '', category, status });
  await post.save();
  res.json({ post: await post.populate(withAuthor) });
};

// DELETE /api/posts/:id   (owner only)
exports.remove = async (req, res) => {
  const { deletedCount } = await Post.deleteOne({ _id: req.params.id, author: req.user._id });
  if (!deletedCount) return res.status(404).json({ message: 'Post not found.' });
  res.json({ message: 'Post deleted.' });
};
