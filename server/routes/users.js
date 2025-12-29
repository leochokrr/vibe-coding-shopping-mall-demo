const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, isAdmin } = require('../middleware/auth');

// GET /api/users - Get all users (관리자만)
router.get('/', authenticate, isAdmin, userController.getAll);

// GET /api/users/:id - Get user by ID (관리자만)
router.get('/:id', authenticate, isAdmin, userController.getById);

// POST /api/users - Create new user (회원가입은 인증 불필요)
router.post('/', userController.create);

// PUT /api/users/:id - Update user (관리자만)
router.put('/:id', authenticate, isAdmin, userController.update);

// DELETE /api/users/:id - Delete user (관리자만)
router.delete('/:id', authenticate, isAdmin, userController.delete);

module.exports = router;

