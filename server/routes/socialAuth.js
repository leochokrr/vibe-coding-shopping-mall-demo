const express = require('express');
const router = express.Router();
const passport = require('../config/passport');
const socialAuthController = require('../controllers/socialAuthController');

// Google OAuth
router.get('/google', (req, res, next) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(503).json({ 
      message: 'Google OAuth is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables.' 
    });
  }
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

router.get('/google/callback',
  (req, res, next) => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_not_configured`);
    }
    passport.authenticate('google', { failureRedirect: '/api/auth/social/failure' })(req, res, next);
  },
  socialAuthController.socialAuthCallback
);

// Facebook OAuth
router.get('/facebook', (req, res, next) => {
  if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
    return res.status(503).json({ 
      message: 'Facebook OAuth is not configured. Please set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET in environment variables.' 
    });
  }
  passport.authenticate('facebook', {
    scope: ['email']
  })(req, res, next);
});

router.get('/facebook/callback',
  (req, res, next) => {
    if (!process.env.FACEBOOK_APP_ID || !process.env.FACEBOOK_APP_SECRET) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=oauth_not_configured`);
    }
    passport.authenticate('facebook', { failureRedirect: '/api/auth/social/failure' })(req, res, next);
  },
  socialAuthController.socialAuthCallback
);

// Apple Sign In (POST 방식 - 클라이언트에서 identity token 전송)
const appleAuthController = require('../controllers/appleAuthController');
router.post('/apple', appleAuthController.appleLogin);

// 소셜 로그인 실패 처리
router.get('/failure', socialAuthController.socialAuthFailure);

module.exports = router;

