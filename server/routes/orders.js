const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authenticate, isAdmin } = require('../middleware/auth');

// GET /api/orders/statistics - Get order statistics (관리자만)
router.get('/statistics', authenticate, isAdmin, orderController.getStatistics);

// GET /api/orders - Get all orders (인증 필요)
// 일반 사용자: 자신의 주문만 조회
// 관리자: 모든 주문 조회
// 쿼리 파라미터: ?status=pending&search=검색어&startDate=2024-01-01&endDate=2024-12-31
router.get('/', authenticate, orderController.getAll);

// GET /api/orders/:id - Get order by ID (인증 필요)
// 일반 사용자: 자신의 주문만 조회 가능
// 관리자: 모든 주문 조회 가능
router.get('/:id', authenticate, orderController.getById);

// POST /api/orders - Create new order (인증 필요)
// 사용자 정보는 인증 토큰에서 자동 추출
router.post('/', authenticate, orderController.create);

// POST /api/orders/from-cart - Create order from cart (인증 필요)
// 장바구니의 모든 상품을 주문으로 변환
router.post('/from-cart', authenticate, orderController.createFromCart);

// PUT /api/orders/:id/status - Update order status (관리자만)
router.put('/:id/status', authenticate, isAdmin, orderController.updateStatus);

// PUT /api/orders/:id/payment - Update payment status (인증 필요)
// 일반 사용자: 자신의 주문만 수정 가능
// 관리자: 모든 주문 수정 가능
router.put('/:id/payment', authenticate, orderController.updatePayment);

// PUT /api/orders/:id - Update order (인증 필요)
// 일반 사용자: 자신의 주문만 수정 가능 (제한적)
// 관리자: 모든 주문 수정 가능
router.put('/:id', authenticate, orderController.update);

// DELETE /api/orders/:id - Delete order (관리자만)
router.delete('/:id', authenticate, isAdmin, orderController.delete);

module.exports = router;

