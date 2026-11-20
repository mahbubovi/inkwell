const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    bio: { type: String, trim: true, maxlength: 160, default: '' },
    password: { type: String, required: true, minlength: 8, select: false },
    passwordChangedAt: { type: Date, select: false },
  },
  {
    timestamps: true,
    toJSON: { transform: (_doc, r) => ({ id: r._id, name: r.name, email: r.email, bio: r.bio, createdAt: r.createdAt }) },
  }
);

userSchema.pre('save', async function () {
  if (this.isModified('password')) this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.matchPassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
