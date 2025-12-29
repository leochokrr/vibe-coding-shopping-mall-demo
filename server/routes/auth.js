const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/login - 로그인
router.post('/login', authController.login);

// GET /api/auth/me - 현재 로그인한 사용자 정보 조회 (인증 필요)
router.get('/me', authenticate, authController.getCurrentUser);

// POST /api/auth/forgot-password - 비밀번호 찾기
router.post('/forgot-password', authController.forgotPassword);

// 소셜 로그인 라우트
router.use('/social', require('./socialAuth'));

module.exports = router;

