# Shopping Mall Server

Node.js, Express, MongoDB 기반 서버 프로젝트입니다.

## 설치 방법

1. 의존성 패키지 설치:
```bash
npm install
```

2. 환경 변수 설정:
```bash
cp env.example .env
```

3. `.env` 파일을 열어서 MongoDB 연결 정보를 설정하세요:
```
MONGODB_URI=mongodb://localhost:27017/shopping-mall
```

## 실행 방법

### 개발 모드 (nodemon 사용)
```bash
npm run dev
```

### 프로덕션 모드
```bash
npm start
```

서버는 기본적으로 `http://localhost:5000`에서 실행됩니다.

## 프로젝트 구조

```
server/
├── config/          # 설정 파일들
│   └── database.js  # MongoDB 연결 설정
├── controllers/     # 컨트롤러 (비즈니스 로직)
│   └── exampleController.js
├── middleware/      # 미들웨어
│   └── errorHandler.js
├── models/          # Mongoose 모델
│   └── Example.js
├── routes/          # 라우트 정의
│   └── index.js
├── env.example      # 환경 변수 예제
├── .gitignore       # Git 제외 파일
├── package.json     # 프로젝트 설정 및 의존성
├── index.js         # 메인 서버 파일
└── README.md        # 프로젝트 문서
```

## API 엔드포인트

- `GET /` - 서버 상태 확인
- `GET /api/health` - 헬스 체크 (데이터베이스 연결 상태 포함)
- `GET /api/test` - API 테스트

## MongoDB 설정

### 로컬 MongoDB 사용
로컬에 MongoDB가 설치되어 있다면:
```
MONGODB_URI=mongodb://localhost:27017/shopping-mall
```

### MongoDB Atlas 사용
MongoDB Atlas를 사용하는 경우:
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/shopping-mall?retryWrites=true&w=majority
```

## 주요 패키지

- **express**: 웹 프레임워크
- **mongoose**: MongoDB ODM
- **dotenv**: 환경 변수 관리
- **cors**: Cross-Origin Resource Sharing
- **morgan**: HTTP 요청 로거
- **nodemon**: 개발 시 자동 재시작 (devDependencies)

