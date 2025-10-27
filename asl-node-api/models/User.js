const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, index: true },
  password_hash: { type: String, required: true },
  role: { type: String, default: 'user' },
  active: { type: Boolean, default: true },
  blocked: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  last_activity_at: { type: Date, default: null }
});

UserSchema.pre('save', function (next) {
  this.updated_at = Date.now();
  next();
});

module.exports = mongoose.model('User', UserSchema);
