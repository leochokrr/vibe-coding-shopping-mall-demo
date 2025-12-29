const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true, // 사용자당 하나의 장바구니만 존재
    index: true
  },
  items: {
    type: [cartItemSchema],
    default: []
  }
}, {
  timestamps: true // createdAt과 updatedAt을 자동으로 관리
});

// 사용자별 장바구니 조회 성능 향상을 위한 인덱스
cartSchema.index({ user: 1 }, { unique: true });

// 가상 필드: 장바구니 총 금액 계산
cartSchema.virtual('totalAmount').get(function() {
  if (!this.items || this.items.length === 0) {
    return 0;
  }
  // populate 후에만 작동하므로 실제 사용 시 populate 필요
  return this.items.reduce((total, item) => {
    return total + (item.product?.price || 0) * item.quantity;
  }, 0);
});

// 가상 필드: 장바구니 총 상품 개수
cartSchema.virtual('totalItems').get(function() {
  if (!this.items || this.items.length === 0) {
    return 0;
  }
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// JSON 변환 시 가상 필드 포함
cartSchema.set('toJSON', { virtuals: true });
cartSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Cart', cartSchema);

