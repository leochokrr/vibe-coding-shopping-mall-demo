const User = require('../models/User');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Apple 공개키 클라이언트 생성
const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys'
});

// Apple JWT 토큰 검증
function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Apple 로그인 처리
exports.appleLogin = async (req, res) => {
  try {
    const { identityToken, user } = req.body;

    console.log('Apple 로그인 요청 받음');

    if (!identityToken) {
      return res.status(400).json({
        message: 'Identity token is required'
      });
    }

    // Apple identity token 검증
    jwt.verify(identityToken, getKey, {
      algorithms: ['RS256'],
      issuer: 'https://appleid.apple.com',
      audience: process.env.APPLE_CLIENT_ID
    }, async (err, decoded) => {
      if (err) {
        console.error('Apple token 검증 에러:', err);
        return res.status(401).json({
          message: 'Invalid Apple identity token'
        });
      }

      try {
        // Apple에서 제공하는 사용자 정보
        const appleUserId = decoded.sub;
        const email = decoded.email || user?.email;
        const name = user?.name || email?.split('@')[0] || 'Apple User';

        // 기존 사용자 찾기
        let dbUser = await User.findOne({
          $or: [
            { providerId: appleUserId, provider: 'apple' },
            { email: email, provider: 'apple' }
          ]
        });

        if (dbUser) {
          // 기존 사용자 업데이트
          if (email && !dbUser.email) {
            dbUser.email = email;
          }
          if (name && dbUser.name === 'Apple User') {
            dbUser.name = name;
          }
          await dbUser.save();
        } else {
          // 새 사용자 생성
          dbUser = new User({
            email: email || undefined,
            name: name,
            provider: 'apple',
            providerId: appleUserId,
            user_type: 'customer'
          });
          await dbUser.save();
        }

        // JWT 토큰 생성
        const token = jwt.sign(
          {
            userId: dbUser._id,
            email: dbUser.email,
            user_type: dbUser.user_type
          },
          process.env.JWT_SECRET || 'your-secret-key-change-in-production',
          {
            expiresIn: process.env.JWT_EXPIRE || '7d'
          }
        );

        console.log('Apple 로그인 성공:', dbUser._id, dbUser.email);

        // 사용자 정보 (password 제외)
        const userResponse = dbUser.toObject();
        delete userResponse.password;

        res.status(200).json({
          message: 'Apple login successful',
          token,
          user: userResponse
        });
      } catch (error) {
        console.error('Apple 로그인 처리 에러:', error);
        res.status(500).json({
          message: 'Internal server error',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  } catch (error) {
    console.error('Apple 로그인 에러:', error);
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

