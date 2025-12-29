const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // 소셜 로그인 사용자는 이메일이 없을 수 있음
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    // 소셜 로그인 사용자는 비밀번호가 없을 수 있음
  },
  provider: {
    type: String,
    enum: ['local', 'google', 'facebook', 'apple'],
    default: 'local'
  },
  providerId: {
    type: String,
    // 소셜 로그인 제공자의 사용자 ID
  },
  user_type: {
    type: String,
    required: true,
    enum: ['customer', 'admin'],
    default: 'customer'
  },
  address: {
    type: String,
    trim: true
  },
  avatar: {
    type: String,
    // 소셜 로그인 프로필 이미지 URL
  }
}, {
  timestamps: true // createdAt과 updatedAt을 자동으로 관리
});

// 이메일과 provider 조합으로 고유성 보장
userSchema.index({ email: 1, provider: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('User', userSchema);

