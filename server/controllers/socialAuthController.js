const User = require('../models/User');
const jwt = require('jsonwebtoken');

// 소셜 로그인 성공 후 JWT 토큰 생성 및 리다이렉트
exports.socialAuthCallback = async (req, res) => {
  try {
    const user = req.user;

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=authentication_failed`);
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        user_type: user.user_type
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      {
        expiresIn: process.env.JWT_EXPIRE || '7d'
      }
    );

    // 사용자 정보 (password 제외)
    const userResponse = user.toObject();
    delete userResponse.password;

    // 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
    // 실제 프로덕션에서는 더 안전한 방법 사용 권장
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const redirectUrl = `${frontendUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(userResponse))}`;
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error('소셜 로그인 콜백 에러:', error);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=server_error`);
  }
};

// 소셜 로그인 실패 처리
exports.socialAuthFailure = (req, res) => {
  res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?error=authentication_failed`);
};

