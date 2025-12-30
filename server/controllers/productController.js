const Product = require('../models/Product');
const mongoose = require('mongoose');

// MongoDB 연결 상태 확인 헬퍼 함수
const checkDatabaseConnection = () => {
  const connectionState = mongoose.connection.readyState;
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (connectionState !== 1) {
    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting'
    };
    throw new Error(`Database is not connected. Current state: ${states[connectionState] || 'Unknown'}`);
  }
};

// Get all products
exports.getAll = async (req, res) => {
  try {
    // MongoDB 연결 상태 확인
    try {
      checkDatabaseConnection();
    } catch (dbError) {
      console.error('⚠️  데이터베이스 연결 확인 실패:', dbError.message);
      return res.status(503).json({
        message: 'Database connection error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

    // 쿼리 파라미터로 필터링 및 페이지네이션 지원
    const { category, search, page = 1, limit = 2 } = req.query;
    let query = {};

    // 카테고리 필터
    if (category && ['상의', '하의', '악세서리'].includes(category)) {
      query.category = category;
    }

    // 검색 필터 (상품명 또는 SKU로 검색)
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search.toUpperCase(), $options: 'i' } }
      ];
    }

    // 페이지네이션 설정
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 2;
    const skip = (pageNum - 1) * limitNum;

    // 전체 개수 조회 (필터링된 결과의 총 개수)
    const total = await Product.countDocuments(query);

    // 페이지네이션 적용하여 상품 조회
    const products = await Product.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    // 전체 페이지 수 계산
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      products,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: total,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1
      }
    });
  } catch (error) {
    console.error('='.repeat(50));
    console.error('상품 목록 조회 에러:');
    console.error('에러 타입:', error.name);
    console.error('에러 메시지:', error.message);
    console.error('='.repeat(50));
    
    // MongoDB 연결 타임아웃 에러
    if (error.message && error.message.includes('buffering timed out')) {
      return res.status(503).json({
        message: 'Database connection timeout. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    // MongoDB 연결 에러
    if (error.name === 'MongoServerSelectionError' || error.name === 'MongooseError') {
      return res.status(503).json({
        message: 'Database connection error. Please try again later.',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    
    res.status(500).json({
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single product by ID
exports.getById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('상품 조회 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get product by SKU
exports.getBySku = async (req, res) => {
  try {
    const product = await Product.findOne({ sku: req.params.sku.toUpperCase() });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (error) {
    console.error('상품 조회 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create new product
exports.create = async (req, res) => {
  try {
    const { sku, name, price, category, images, description } = req.body;

    console.log('상품 등록 요청 받음:', { sku, name, price, category });

    // 필수 필드 검증
    if (!sku || !name || !price || !category) {
      return res.status(400).json({
        message: 'SKU, name, price, and category are required'
      });
    }

    // SKU 중복 체크
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    // 카테고리 검증
    if (!['상의', '하의', '악세서리'].includes(category)) {
      return res.status(400).json({
        message: 'Category must be one of: 상의, 하의, 악세서리'
      });
    }

    // 가격 검증
    if (typeof price !== 'number' || price < 0) {
      return res.status(400).json({
        message: 'Price must be a positive number'
      });
    }

    // 이미지 배열 검증
    let imageArray = [];
    if (images) {
      if (Array.isArray(images)) {
        imageArray = images;
      } else if (typeof images === 'string') {
        // 단일 이미지 URL인 경우 배열로 변환
        imageArray = [images];
      }
    }

    // 새 상품 생성
    const productData = {
      sku: sku.toUpperCase(),
      name,
      price,
      category,
      images: imageArray,
      description: description || undefined
    };

    const product = new Product(productData);
    const savedProduct = await product.save();
    console.log('상품 저장 성공:', savedProduct._id, savedProduct.sku);

    res.status(201).json({
      message: 'Product created successfully',
      product: savedProduct
    });
  } catch (error) {
    console.error('상품 등록 에러:', error);

    if (error.code === 11000) {
      // 중복 SKU 에러
      return res.status(400).json({ message: 'SKU already exists' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(400).json({ message: error.message });
  }
};

// Update product
exports.update = async (req, res) => {
  try {
    const { sku, name, price, category, images, description } = req.body;
    const updateData = {};

    // SKU 업데이트 시 중복 체크
    if (sku) {
      const normalizedSku = sku.toUpperCase();
      const existingProduct = await Product.findOne({ 
        sku: normalizedSku,
        _id: { $ne: req.params.id } // 현재 상품 제외
      });
      
      if (existingProduct) {
        return res.status(400).json({ message: 'SKU already exists' });
      }
      updateData.sku = normalizedSku;
    }

    if (name !== undefined) updateData.name = name;
    
    if (price !== undefined) {
      if (typeof price !== 'number' || price < 0) {
        return res.status(400).json({
          message: 'Price must be a positive number'
        });
      }
      updateData.price = price;
    }

    if (category !== undefined) {
      if (!['상의', '하의', '악세서리'].includes(category)) {
        return res.status(400).json({
          message: 'Category must be one of: 상의, 하의, 악세서리'
        });
      }
      updateData.category = category;
    }

    if (images !== undefined) {
      if (Array.isArray(images)) {
        updateData.images = images;
      } else if (typeof images === 'string') {
        updateData.images = [images];
      } else {
        updateData.images = [];
      }
    }

    if (description !== undefined) updateData.description = description;

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    console.log('상품 업데이트 성공:', product._id, product.sku);
    res.json({
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('상품 업데이트 에러:', error);

    if (error.code === 11000) {
      return res.status(400).json({ message: 'SKU already exists' });
    }

    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    res.status(400).json({ message: error.message });
  }
};

// Delete product
exports.delete = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    console.log('상품 삭제 성공:', product._id, product.sku);
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('상품 삭제 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

