const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { authenticate } = require('../middleware/auth');

// GET /api/cart - Get user's cart (인증 필요)
router.get('/', authenticate, cartController.getCart);

// POST /api/cart/items - Add item to cart (인증 필요)
router.post('/items', authenticate, cartController.addItem);

// PUT /api/cart/items/:itemId - Update item quantity in cart (인증 필요)
router.put('/items/:itemId', authenticate, cartController.updateItem);

// DELETE /api/cart/items/:itemId - Remove item from cart (인증 필요)
router.delete('/items/:itemId', authenticate, cartController.removeItem);

// DELETE /api/cart - Clear cart (remove all items) (인증 필요)
router.delete('/', authenticate, cartController.clearCart);

module.exports = router;

