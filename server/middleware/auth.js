const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT 토큰 검증 미들웨어
exports.authenticate = async (req, res, next) => {
  try {
    // Authorization 헤더에서 토큰 추출
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        message: 'No token provided or invalid format'
      });
    }

    // Bearer 제거하고 토큰만 추출
    const token = authHeader.substring(7);

    if (!token) {
      return res.status(401).json({
        message: 'No token provided'
      });
    }

    // 토큰 검증
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-secret-key-change-in-production'
    );

    // 사용자가 여전히 존재하는지 확인
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        message: 'User not found'
      });
    }

    // req.user에 전체 사용자 객체 저장 (다른 컨트롤러에서 req.user._id 등 사용 가능)
    req.user = user;

    next();
  } catch (error) {
    console.error('토큰 검증 에러:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        message: 'Invalid token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: 'Token expired'
      });
    }

    return res.status(401).json({
      message: 'Authentication failed'
    });
  }
};

// 어드민 권한 체크 미들웨어
exports.isAdmin = (req, res, next) => {
  if (req.user && req.user.user_type === 'admin') {
    next();
  } else {
    return res.status(403).json({
      message: 'Access denied. Admin privileges required.'
    });
  }
};

