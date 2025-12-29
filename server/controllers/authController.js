const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// 로그인
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('로그인 요청 받음:', { email });

    // 필수 필드 검증
    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required'
      });
    }

    // 이메일로 사용자 찾기
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      console.log('사용자를 찾을 수 없음:', email);
      return res.status(401).json({
        message: '존재하지 않는 계정입니다.'
      });
    }

    // 소셜 로그인 사용자는 비밀번호가 없을 수 있음
    if (!user.password) {
      console.log('소셜 로그인 사용자:', email);
      return res.status(401).json({
        message: 'This account was created with social login. Please use social login to sign in.'
      });
    }

    // 비밀번호 검증
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      console.log('비밀번호 불일치:', email);
      return res.status(401).json({
        message: 'Invalid email or password'
      });
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

    console.log('로그인 성공:', user._id, user.email);

    // 사용자 정보 (password 제외)
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(200).json({
      message: 'Login successful',
      token,
      user: userResponse
    });
  } catch (error) {
    console.error('로그인 에러:', error);
    console.error('에러 스택:', error.stack);
    
    // JWT_SECRET이 없을 때의 에러 처리
    if (error.message && error.message.includes('secret')) {
      console.error('JWT_SECRET이 설정되지 않았습니다. .env 파일을 확인하세요.');
      return res.status(500).json({
        message: 'Server configuration error. Please contact administrator.',
        error: process.env.NODE_ENV === 'development' ? 'JWT_SECRET is not configured' : undefined
      });
    }
    
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 현재 로그인한 사용자 정보 조회 (토큰으로 유저 정보 가져오기)
exports.getCurrentUser = async (req, res) => {
  try {
    // auth 미들웨어에서 req.user에 전체 사용자 객체가 설정됨
    // 비밀번호 제외하고 사용자 정보 반환
    const user = req.user.toObject();
    delete user.password;
    
    if (!user) {
      return res.status(404).json({ 
        message: 'User not found',
        success: false
      });
    }

    console.log('사용자 정보 조회 성공:', user._id, user.email);

    res.status(200).json({
      success: true,
      message: 'User information retrieved successfully',
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        user_type: user.user_type,
        provider: user.provider,
        address: user.address,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('사용자 정보 조회 에러:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 비밀번호 찾기 (이메일로 재설정 토큰 생성)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    console.log('비밀번호 찾기 요청 받음:', { email });

    // 필수 필드 검증
    if (!email) {
      return res.status(400).json({
        message: 'Email is required'
      });
    }

    // 이메일로 사용자 찾기
    const user = await User.findOne({ email: email.toLowerCase() });
    
    // 보안을 위해 사용자가 존재하지 않아도 성공 메시지 반환
    // (이메일 존재 여부를 노출하지 않기 위함)
    if (!user) {
      console.log('사용자를 찾을 수 없음:', email);
      // 실제로는 이메일을 보내지 않지만, 동일한 성공 메시지 반환
      return res.status(200).json({
        message: 'If the email exists, a password reset link has been sent.'
      });
    }

    // 비밀번호 재설정 토큰 생성 (JWT 사용)
    const resetToken = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        type: 'password-reset'
      },
      process.env.JWT_SECRET || 'your-secret-key-change-in-production',
      {
        expiresIn: '1h' // 1시간 후 만료
      }
    );

    console.log('비밀번호 재설정 토큰 생성:', user._id, user.email);
    
    // 실제 프로덕션에서는 여기서 이메일을 전송해야 함
    // 예: nodemailer를 사용하여 재설정 링크 전송
    // const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    // await sendPasswordResetEmail(user.email, resetLink);

    // 개발 환경에서는 토큰을 로그로 출력 (실제로는 이메일로 전송)
    if (process.env.NODE_ENV === 'development') {
      console.log('비밀번호 재설정 토큰 (개발용):', resetToken);
      console.log('재설정 링크 (개발용):', `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`);
    }

    res.status(200).json({
      message: 'If the email exists, a password reset link has been sent.',
      // 개발 환경에서만 토큰 반환 (실제 프로덕션에서는 제거)
      ...(process.env.NODE_ENV === 'development' && {
        resetToken: resetToken,
        resetLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`
      })
    });
  } catch (error) {
    console.error('비밀번호 찾기 에러:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

