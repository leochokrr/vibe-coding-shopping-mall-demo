const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Google OAuth Strategy (환경 변수가 있을 때만 등록)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/social/google/callback'
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // 기존 사용자 찾기
    let user = await User.findOne({ 
      $or: [
        { providerId: profile.id, provider: 'google' },
        { email: profile.emails[0].value, provider: 'google' }
      ]
    });

    if (user) {
      // 기존 사용자 업데이트
      user.name = profile.displayName || user.name;
      user.avatar = profile.photos[0]?.value || user.avatar;
      await user.save();
      return done(null, user);
    }

    // 새 사용자 생성
    user = new User({
      email: profile.emails[0].value,
      name: profile.displayName,
      provider: 'google',
      providerId: profile.id,
      avatar: profile.photos[0]?.value,
      user_type: 'customer'
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    console.error('Google OAuth 에러:', error);
    return done(error, null);
  }
  }));
} else {
  console.log('Google OAuth 설정이 없습니다. 환경 변수를 확인하세요.');
}

// Facebook OAuth Strategy (환경 변수가 있을 때만 등록)
if (process.env.FACEBOOK_APP_ID && process.env.FACEBOOK_APP_SECRET) {
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: process.env.FACEBOOK_CALLBACK_URL || '/api/auth/social/facebook/callback',
    profileFields: ['id', 'displayName', 'email', 'picture.type(large)']
  }, async (accessToken, refreshToken, profile, done) => {
  try {
    // 기존 사용자 찾기
    let user = await User.findOne({ 
      $or: [
        { providerId: profile.id, provider: 'facebook' },
        { email: profile.emails[0]?.value, provider: 'facebook' }
      ]
    });

    if (user) {
      // 기존 사용자 업데이트
      user.name = profile.displayName || user.name;
      user.avatar = profile.photos[0]?.value || user.avatar;
      await user.save();
      return done(null, user);
    }

    // 새 사용자 생성
    user = new User({
      email: profile.emails[0]?.value,
      name: profile.displayName,
      provider: 'facebook',
      providerId: profile.id,
      avatar: profile.photos[0]?.value,
      user_type: 'customer'
    });

    await user.save();
    return done(null, user);
  } catch (error) {
    console.error('Facebook OAuth 에러:', error);
    return done(error, null);
  }
  }));
} else {
  console.log('Facebook OAuth 설정이 없습니다. 환경 변수를 확인하세요.');
}

// Serialize user for session
passport.serializeUser((user, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id).select('-password');
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;

