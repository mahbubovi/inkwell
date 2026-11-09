const mongoose = require('mongoose');

const CATEGORIES = ['Engineering', 'Design', 'Product', 'Career'];

const postSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, minlength: 5, maxlength: 120 },
    body: { type: String, default: '' },
    excerpt: { type: String, trim: true, maxlength: 160, default: '' },
    category: { type: String, enum: CATEGORIES, required: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    views: { type: Number, default: 0 },
    readMinutes: { type: Number, default: 1 },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

postSchema.index({ status: 1, createdAt: -1 });

postSchema.pre('save', function () {
  const words = (this.body.match(/\S+/g) || []).length;
  this.readMinutes = Math.max(1, Math.round(words / 200));
  if (!this.excerpt) this.excerpt = this.body.slice(0, 140).trim() + (this.body.length > 140 ? '…' : '');
});

module.exports = mongoose.model('Post', postSchema);
module.exports.CATEGORIES = CATEGORIES;
