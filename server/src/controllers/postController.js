const Post = require('../models/Post');
const { CATEGORIES } = Post;

const withAuthor = { path: 'author', select: 'name' };
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/posts?q=&category=&sort=&page=&limit=   (public, published only, paginated)
const SORTS = { newest: { createdAt: -1, _id: -1 }, oldest: { createdAt: 1, _id: 1 }, popular: { views: -1, _id: -1 } };

exports.list = async (req, res) => {
  const { q = '', category = '', sort = 'newest' } = req.query;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const limit = Math.min(24, Math.max(1, parseInt(req.query.limit, 10) || 9));
  const filter = { status: 'published' };
  if (CATEGORIES.includes(category)) filter.category = category;
  if (q) {
    const rx = new RegExp(escapeRegex(String(q).slice(0, 80)), 'i');
    filter.$or = [{ title: rx }, { excerpt: rx }, { body: rx }];
  }
  const [posts, total] = await Promise.all([
    Post.find(filter).sort(SORTS[sort] || SORTS.newest).skip((page - 1) * limit).limit(limit).select('-body').populate(withAuthor),
    Post.countDocuments(filter),
  ]);
  res.json({ posts, total, page, pages: Math.max(1, Math.ceil(total / limit)) });
};

// GET /api/posts/mine   (the logged-in user's posts, drafts included)
exports.mine = async (req, res) => {
  const posts = await Post.find({ author: req.user._id }).sort('-updatedAt').limit(100).populate(withAuthor);
  res.json({ posts });
};

// GET /api/posts/:id   (published posts are public; a draft is visible only to its author)
exports.get = async (req, res) => {
  const post = await Post.findById(req.params.id).populate(withAuthor);
  const isOwner = !!(post && req.user && post.author && post.author._id.equals(req.user._id));
  if (!post || (post.status !== 'published' && !isOwner)) return res.status(404).json({ message: 'Post not found.' });

  if (post.status === 'published' && !isOwner) {
    await Post.updateOne({ _id: post._id }, { $inc: { views: 1 } });
    post.views += 1;
  }
  const related = post.status !== 'published' ? [] :
    await Post.find({ status: 'published', category: post.category, _id: { $ne: post._id } })
      .sort({ createdAt: -1 }).limit(3).select('-body').populate(withAuthor);
  res.json({ post, related });
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

// PATCH /api/posts/:id/status   (owner only: publish or unpublish without editing)
exports.setStatus = async (req, res) => {
  const post = await Post.findOne({ _id: req.params.id, author: req.user._id });
  if (!post) return res.status(404).json({ message: 'Post not found.' });
  const { status } = req.body;
  if (status === 'published' && (post.body.match(/\S+/g) || []).length < 50)
    return res.status(422).json({ message: 'Write at least 50 words before publishing.', errors: { status: 'Write at least 50 words before publishing.' } });
  post.status = status;
  await post.save();
  res.json({ post: await post.populate(withAuthor) });
};

// DELETE /api/posts/:id   (owner only)
exports.remove = async (req, res) => {
  const { deletedCount } = await Post.deleteOne({ _id: req.params.id, author: req.user._id });
  if (!deletedCount) return res.status(404).json({ message: 'Post not found.' });
  res.json({ message: 'Post deleted.' });
};
