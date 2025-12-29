const Cart = require('../models/Cart');
const Product = require('../models/Product');

// Get user's cart
exports.getCart = async (req, res) => {
  try {
    const userId = req.user._id;

    let cart = await Cart.findOne({ user: userId }).populate('items.product');

    // 장바구니가 없으면 새로 생성
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    res.json({
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('장바구니 조회 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Add item to cart
exports.addItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { productId, quantity = 1 } = req.body;

    // 상품 존재 확인
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: '상품을 찾을 수 없습니다.' });
    }

    // 수량 검증
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ message: '수량은 1 이상이어야 합니다.' });
    }

    // 장바구니 찾기 또는 생성
    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    // 이미 장바구니에 있는 상품인지 확인
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (existingItemIndex >= 0) {
      // 이미 있으면 수량 증가
      cart.items[existingItemIndex].quantity += qty;
    } else {
      // 없으면 새로 추가
      cart.items.push({
        product: productId,
        quantity: qty
      });
    }

    await cart.save();
    await cart.populate('items.product');

    res.json({
      message: '장바구니에 추가되었습니다.',
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('장바구니 추가 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update item quantity in cart
exports.updateItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;
    const { quantity } = req.body;

    // 수량 검증
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1) {
      return res.status(400).json({ message: '수량은 1 이상이어야 합니다.' });
    }

    // 장바구니 찾기
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: '장바구니를 찾을 수 없습니다.' });
    }

    // 아이템 찾기
    const itemIndex = cart.items.findIndex(
      item => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({ message: '장바구니 아이템을 찾을 수 없습니다.' });
    }

    // 수량 업데이트
    cart.items[itemIndex].quantity = qty;
    await cart.save();
    await cart.populate('items.product');

    res.json({
      message: '수량이 업데이트되었습니다.',
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('장바구니 수량 업데이트 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Remove item from cart
exports.removeItem = async (req, res) => {
  try {
    const userId = req.user._id;
    const { itemId } = req.params;

    // 장바구니 찾기
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: '장바구니를 찾을 수 없습니다.' });
    }

    // 아이템 제거
    cart.items = cart.items.filter(
      item => item._id.toString() !== itemId
    );

    await cart.save();
    await cart.populate('items.product');

    res.json({
      message: '장바구니에서 제거되었습니다.',
      cart: {
        _id: cart._id,
        user: cart.user,
        items: cart.items,
        totalItems: cart.totalItems,
        totalAmount: cart.totalAmount,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('장바구니 아이템 제거 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Clear cart (remove all items)
exports.clearCart = async (req, res) => {
  try {
    const userId = req.user._id;

    // 장바구니 찾기
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return res.status(404).json({ message: '장바구니를 찾을 수 없습니다.' });
    }

    // 모든 아이템 제거
    cart.items = [];
    await cart.save();

    res.json({
      message: '장바구니가 비워졌습니다.',
      cart: {
        _id: cart._id,
        user: cart.user,
        items: [],
        totalItems: 0,
        totalAmount: 0,
        updatedAt: cart.updatedAt
      }
    });
  } catch (error) {
    console.error('장바구니 비우기 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

