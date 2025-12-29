const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middleware/auth');

// GET /api/products - Get all products (카테고리, 검색 필터 지원)
// 쿼리 파라미터: ?category=상의&search=검색어
router.get('/', productController.getAll);

// GET /api/products/:id - Get product by ID
router.get('/:id', productController.getById);

// GET /api/products/sku/:sku - Get product by SKU
router.get('/sku/:sku', productController.getBySku);

// POST /api/products - Create new product (인증 필요)
router.post('/', authenticate, productController.create);

// PUT /api/products/:id - Update product (인증 필요)
router.put('/:id', authenticate, productController.update);

// DELETE /api/products/:id - Delete product (인증 필요)
router.delete('/:id', authenticate, productController.delete);

module.exports = router;

