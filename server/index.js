const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const session = require('express-session');
require('dotenv').config();

// 필수 환경변수 확인 (경고만 표시, 서버는 계속 실행)
const requiredEnvVars = ['JWT_SECRET', 'SESSION_SECRET', 'MONGODB_ATLAS_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('='.repeat(50));
  console.error('⚠️  필수 환경변수가 설정되지 않았습니다!');
  console.error('누락된 환경변수:', missingEnvVars.join(', '));
  console.error('='.repeat(50));
  console.error('Heroku 대시보드 → Settings → Config Vars에서 설정해주세요.');
  console.error('='.repeat(50));
  console.error('⚠️  경고: 일부 기능이 정상적으로 작동하지 않을 수 있습니다.');
  console.error('⚠️  서버는 계속 실행되지만 환경변수를 설정하는 것을 강력히 권장합니다.');
  console.error('='.repeat(50));
  // 서버 종료하지 않음 - 환경변수가 없어도 서버는 시작되도록 함
}

// Passport 설정
const passport = require('./config/passport');

const app = express();

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // 개발 환경에서는 모든 origin 허용
    if (process.env.NODE_ENV === 'development' || !origin) {
      return callback(null, true);
    }
    
    // 프로덕션에서는 지정된 origin만 허용
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      // 개발용 localhost (프로덕션에서도 테스트용으로 유지 가능)
      'http://localhost:3000',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173'
    ].filter(Boolean); // undefined 제거
    
    // Vercel 도메인 패턴 체크 (모든 *.vercel.app 도메인 허용)
    if (origin) {
      try {
        const originUrl = new URL(origin);
        // 모든 Vercel 도메인 허용 (*.vercel.app)
        if (originUrl.hostname.endsWith('.vercel.app')) {
          console.log(`✓ CORS allowed: ${origin} (Vercel domain)`);
          return callback(null, true);
        }
        
        // FRONTEND_URL이 설정되어 있으면 해당 도메인도 체크
        if (process.env.FRONTEND_URL) {
          const frontendUrl = new URL(process.env.FRONTEND_URL);
          // 같은 도메인 또는 서브도메인 허용
          if (originUrl.hostname === frontendUrl.hostname || 
              originUrl.hostname.endsWith('.' + frontendUrl.hostname)) {
            console.log(`✓ CORS allowed: ${origin} (FRONTEND_URL match)`);
            return callback(null, true);
          }
        }
      } catch (err) {
        console.warn(`Invalid origin URL: ${origin}`, err);
      }
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      console.log(`✓ CORS allowed: ${origin} (allowedOrigins)`);
      callback(null, true);
    } else {
      console.warn(`✗ CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Authorization'],
  maxAge: 86400 // 24시간
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session 설정 (소셜 로그인용)
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24시간
  }
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

// MongoDB Connection
const connectDB = async () => {
  try {
    // MONGODB_ATLAS_URL을 우선 사용, 없을 경우 로컬 주소 사용
    let mongoUri = process.env.MONGODB_ATLAS_URL || 'mongodb://localhost:27017/shopping-mall';
    const isAtlas = !!process.env.MONGODB_ATLAS_URL;
    
    // MongoDB Atlas URL에 데이터베이스 이름과 파라미터가 없으면 추가
    if (isAtlas && mongoUri.includes('mongodb+srv://')) {
      // 데이터베이스 이름이 없으면 추가
      if (!mongoUri.match(/\/[^?@]+(\?|$|@)/) && !mongoUri.includes('/shopping-mall')) {
        // @ 다음에 / 가 없으면 데이터베이스 이름 추가
        if (mongoUri.includes('@')) {
          const parts = mongoUri.split('@');
          if (parts.length > 1 && !parts[1].includes('/')) {
            mongoUri = parts[0] + '@' + parts[1].split('?')[0] + '/shopping-mall';
            if (parts[1].includes('?')) {
              mongoUri += '?' + parts[1].split('?')[1];
            }
          }
        } else if (!mongoUri.includes('/')) {
          mongoUri = mongoUri + '/shopping-mall';
        }
      }
      
      // 쿼리 파라미터 추가
      if (!mongoUri.includes('retryWrites=true')) {
        if (mongoUri.includes('?')) {
          mongoUri = mongoUri + '&retryWrites=true&w=majority';
        } else {
          mongoUri = mongoUri + '?retryWrites=true&w=majority';
        }
      }
    }
    
    console.log('='.repeat(50));
    console.log('MongoDB Connection Info:');
    console.log(`Using: ${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    if (isAtlas) {
      // 보안을 위해 연결 문자열의 일부만 표시
      const uriParts = mongoUri.split('@');
      if (uriParts.length > 1) {
        console.log(`Atlas URI: mongodb+srv://***@${uriParts[1]}`);
      } else {
        console.log(`Atlas URI: ${mongoUri.substring(0, 30)}...`);
      }
    } else {
      console.log(`Local URI: ${mongoUri}`);
    }
    console.log('='.repeat(50));
    
    console.log(`Connecting to MongoDB ${isAtlas ? 'Atlas' : 'Local'}...`);
    
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 30000, // 30초 타임아웃 (Atlas 연결에 더 많은 시간 필요)
      socketTimeoutMS: 45000,
      connectTimeoutMS: 30000, // 연결 타임아웃
      maxPoolSize: 10, // 연결 풀 크기
      retryWrites: true,
      w: 'majority'
    });
    
    console.log('✓ MongoDB Connected Successfully!');
    console.log(`  Host: ${conn.connection.host}`);
    console.log(`  Database: ${conn.connection.name}`);
    console.log(`  Connection Type: ${isAtlas ? 'MongoDB Atlas' : 'Local MongoDB'}`);
    console.log('='.repeat(50));
  } catch (error) {
    console.error('='.repeat(50));
    console.error('✗ MongoDB Connection Failed!');
    console.error('='.repeat(50));
    console.error('Error Details:');
    console.error(`  Message: ${error.message}`);
    
    if (error.name === 'MongoServerSelectionError') {
      console.error('\n⚠️  클러스터 연결 문제가 발생했습니다!');
      console.error('\n가능한 원인:');
      console.error('  1. ⚠️  MongoDB Atlas 클러스터가 일시 중지(Paused) 상태일 수 있습니다');
      console.error('     → Atlas 대시보드에서 클러스터 상태 확인 및 Resume 필요');
      console.error('  2. ⚠️  클러스터가 아직 배포 중일 수 있습니다');
      console.error('     → "We are deploying your changes" 메시지가 보이면 배포 완료 대기');
      console.error('  3. MongoDB Atlas IP Whitelist에 현재 IP가 추가되어 있는지 확인');
      console.error('  4. 연결 문자열의 사용자명/비밀번호가 올바른지 확인');
      console.error('  5. 네트워크 연결 상태 확인');
      console.error('\n해결 방법:');
      console.error('  → MongoDB Atlas 대시보드에서 클러스터 상태 확인');
      console.error('  → 클러스터가 일시 중지되어 있다면 "Resume" 클릭');
      console.error('  → 클러스터가 배포 중이라면 완료될 때까지 대기');
    } else if (error.name === 'MongoAuthenticationError') {
      console.error('\n⚠️  인증 오류가 발생했습니다!');
      console.error('\n가능한 원인:');
      console.error('  1. 사용자명 또는 비밀번호가 잘못되었습니다');
      console.error('  2. 데이터베이스 사용자 권한을 확인하세요');
    } else {
      console.error('\nError Type:', error.name);
      console.error('\nError Stack:');
      console.error(error.stack);
    }
    
    console.error('='.repeat(50));
    console.error('\n⚠️  경고: MongoDB 연결에 실패했지만 서버는 계속 실행됩니다.');
    console.error('⚠️  데이터베이스 작업은 실패할 수 있습니다.\n');
    // process.exit(1); // 주석 처리하여 서버가 계속 실행되도록 함 (디버깅용)
  }
};

// MongoDB 연결 재시도 함수
const connectDBWithRetry = async (retries = 3, delay = 5000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await connectDB();
      return; // 연결 성공
    } catch (error) {
      console.error(`MongoDB 연결 시도 ${i + 1}/${retries} 실패`);
      if (i < retries - 1) {
        console.log(`${delay / 1000}초 후 재시도...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('MongoDB 연결 재시도 모두 실패');
      }
    }
  }
};

// Connect to MongoDB (비동기로 실행, 서버 시작을 막지 않음)
connectDBWithRetry().catch(err => {
  console.error('MongoDB 연결 중 예상치 못한 오류:', err);
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Shopping Mall API Server is running!' });
});

app.get('/api/health', (req, res) => {
  const isAtlas = !!process.env.MONGODB_ATLAS_URL;
  const connectionState = mongoose.connection.readyState;
  const states = {
    0: 'Disconnected',
    1: 'Connected',
    2: 'Connecting',
    3: 'Disconnecting'
  };
  
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    database: {
      state: states[connectionState] || 'Unknown',
      readyState: connectionState,
      host: mongoose.connection.host || 'N/A',
      name: mongoose.connection.name || 'N/A',
      type: isAtlas ? 'MongoDB Atlas' : 'Local MongoDB',
      usingAtlas: isAtlas
    }
  });
});

// API Routes
app.use('/api', require('./routes'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
