const express = require('express');
const router = express.Router();

// Example route
router.get('/test', (req, res) => {
  res.json({ message: 'API routes are working!' });
});

// Import other route files here
router.use('/products', require('./products'));
router.use('/users', require('./users'));
router.use('/orders', require('./orders'));
router.use('/cart', require('./cart'));
router.use('/auth', require('./auth'));

module.exports = router;

