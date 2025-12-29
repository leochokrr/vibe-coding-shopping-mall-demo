const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  sku: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true, // SKU는 대문자로 저장
    index: true // 검색 성능 향상을 위한 인덱스
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true,
    min: 0 // 가격은 0 이상이어야 함
  },
  category: {
    type: String,
    required: true,
    enum: ['상의', '하의', '악세서리'],
    index: true // 카테고리별 검색 성능 향상
  },
  images: {
    type: [String], // 여러 이미지를 배열로 저장 (URL 배열)
    default: []
  },
  description: {
    type: String,
    trim: true
  }
}, {
  timestamps: true // createdAt과 updatedAt을 자동으로 관리
});

// SKU에 대한 유니크 인덱스 (스키마 레벨에서도 명시)
productSchema.index({ sku: 1 }, { unique: true });

module.exports = mongoose.model('Product', productSchema);

