const Order = require('../models/Order');
const Product = require('../models/Product');
const Cart = require('../models/Cart');

// 주문 번호 생성 함수
const generateOrderNumber = () => {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// 주문 중복 체크 함수
const checkDuplicateOrder = async (userId, items, timeWindowMinutes = 5) => {
  try {
    const timeWindow = new Date(Date.now() - timeWindowMinutes * 60 * 1000);
    
    // 최근 주문 조회 (지정된 시간 내)
    const recentOrders = await Order.find({
      user: userId,
      createdAt: { $gte: timeWindow },
      status: { $in: ['pending', 'processing'] } // 취소되지 않은 주문만 체크
    }).sort({ createdAt: -1 });

    if (recentOrders.length === 0) {
      return { isDuplicate: false };
    }

    // 현재 주문 항목 정렬 (비교를 위해)
    const currentItems = items
      .map(item => ({
        product: item.product?.toString() || item.product,
        quantity: item.quantity
      }))
      .sort((a, b) => {
        if (a.product < b.product) return -1;
        if (a.product > b.product) return 1;
        return a.quantity - b.quantity;
      });

    // 최근 주문들과 비교
    for (const order of recentOrders) {
      const orderItems = order.items
        .map(item => ({
          product: item.product?.toString() || item.product,
          quantity: item.quantity
        }))
        .sort((a, b) => {
          if (a.product < b.product) return -1;
          if (a.product > b.product) return 1;
          return a.quantity - b.quantity;
        });

      // 항목 개수가 같고 내용이 동일한지 확인
      if (orderItems.length === currentItems.length) {
        const isSame = orderItems.every((item, index) => {
          return (
            item.product === currentItems[index].product &&
            item.quantity === currentItems[index].quantity
          );
        });

        if (isSame) {
          return {
            isDuplicate: true,
            duplicateOrder: order,
            message: '동일한 주문이 최근에 생성되었습니다. 잠시 후 다시 시도해주세요.'
          };
        }
      }
    }

    return { isDuplicate: false };
  } catch (error) {
    console.error('주문 중복 체크 에러:', error);
    // 에러 발생 시 중복이 아닌 것으로 처리 (주문 생성은 계속 진행)
    return { isDuplicate: false };
  }
};

// 결제 검증 함수 (테스트용 - 항상 통과)
const validatePayment = (paymentMethod, paymentInfo, totalAmount) => {
  // 테스트용: 어떤 조건이든 결제가 완료되는 것처럼 처리
  console.log('결제 검증 (테스트 모드):', {
    paymentMethod,
    hasPaymentInfo: !!paymentInfo,
    totalAmount
  });
  
  // 항상 결제 성공으로 처리
  return { isValid: true };
};

// Get all orders
exports.getAll = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.user_type;
    const { status, search, startDate, endDate } = req.query;
    let query = {};

    // 일반 사용자는 자신의 주문만 조회, 관리자는 모든 주문 조회
    if (userType !== 'admin') {
      query.user = userId;
    }

    // 상태 필터
    if (status && ['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      query.status = status;
    }

    // 날짜 필터
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }

    // 검색 필터 (주문 번호 또는 배송지 이름)
    // 일반 사용자는 이미 query.user로 필터링되므로 자신의 주문 내에서만 검색됨
    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'shippingAddress.name': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('items.product', 'name sku images')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error('주문 목록 조회 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Get single order by ID
exports.getById = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.user_type;
    
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name sku images price');
    
    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    // 일반 사용자는 자신의 주문만 조회 가능
    if (userType !== 'admin') {
      // order.user가 populate된 객체인 경우와 ObjectId인 경우 모두 처리
      const orderUserId = order.user._id ? order.user._id.toString() : order.user.toString();
      if (orderUserId !== userId.toString()) {
        return res.status(403).json({ message: '이 주문에 접근할 권한이 없습니다.' });
      }
    }

    res.json(order);
  } catch (error) {
    console.error('주문 조회 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Create new order
exports.create = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      items, 
      shippingAddress, 
      paymentMethod, 
      shippingFee = 0,
      discountAmount = 0,
      couponCode,
      deliveryRequest,
      notes 
    } = req.body;

    console.log('주문 생성 요청 받음:', { userId, itemsCount: items?.length });

    // 필수 필드 검증
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: '주문할 상품이 필요합니다.'
      });
    }

    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({
        message: '배송지 정보가 필요합니다. (이름, 전화번호, 주소)'
      });
    }

    // 결제 정보 추출 (요청 본문에서)
    const paymentInfo = req.body.paymentInfo || null;

    // 상품 검증 및 총액 계산
    let totalAmount = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.product || !item.quantity || item.quantity < 1) {
        return res.status(400).json({
          message: '각 상품에는 product ID와 quantity(1 이상)가 필요합니다.'
        });
      }

      // 상품 존재 확인
      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(404).json({
          message: `상품을 찾을 수 없습니다: ${item.product}`
        });
      }

      // 주문 시점의 가격 사용 (요청에 price가 있으면 사용, 없으면 현재 상품 가격)
      const itemPrice = item.price || product.price;
      
      validatedItems.push({
        product: item.product,
        sku: product.sku,
        name: product.name,
        quantity: item.quantity,
        price: itemPrice,
        image: product.images && product.images.length > 0 ? product.images[0] : null
      });

      totalAmount += itemPrice * item.quantity;
    }

    // 최종 금액 계산 (상품 금액 + 배송비 - 할인)
    const finalAmount = totalAmount + (parseFloat(shippingFee) || 0) - (parseFloat(discountAmount) || 0);
    
    if (finalAmount < 0) {
      return res.status(400).json({
        message: '최종 결제 금액은 0 이상이어야 합니다.'
      });
    }

    // 주문 중복 체크
    const duplicateCheck = await checkDuplicateOrder(userId, validatedItems);
    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({
        message: duplicateCheck.message,
        duplicateOrderId: duplicateCheck.duplicateOrder._id,
        duplicateOrderNumber: duplicateCheck.duplicateOrder.orderNumber
      });
    }

    // 결제 검증
    const paymentValidation = validatePayment(paymentMethod, paymentInfo, finalAmount);
    if (!paymentValidation.isValid) {
      return res.status(400).json({
        message: paymentValidation.message
      });
    }

    // 주문 번호 생성
    let orderNumber = generateOrderNumber();
    let exists = await Order.findOne({ orderNumber });
    while (exists) {
      orderNumber = generateOrderNumber();
      exists = await Order.findOne({ orderNumber });
    }

    // 새 주문 생성
    const orderData = {
      orderNumber,
      user: userId,
      items: validatedItems,
      totalAmount: finalAmount,
      shippingFee: parseFloat(shippingFee) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      couponCode: couponCode || undefined,
      shippingAddress,
      paymentMethod: paymentMethod || 'card',
      paymentStatus: 'pending',
      status: 'pending',
      deliveryRequest: deliveryRequest || undefined,
      notes: notes || undefined
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'name email')
      .populate('items.product', 'name sku images');

    console.log('주문 생성 성공:', savedOrder._id, savedOrder.orderNumber);

    res.status(201).json({
      message: '주문이 생성되었습니다.',
      order: populatedOrder
    });
  } catch (error) {
    console.error('주문 생성 에러:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update order status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    if (!status || !['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
      return res.status(400).json({
        message: 'Valid status is required'
      });
    }

    const order = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('items.product', 'name sku');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    console.log('주문 상태 업데이트 성공:', order._id, order.orderNumber, order.status);
    res.json({
      message: 'Order status updated successfully',
      order
    });
  } catch (error) {
    console.error('주문 상태 업데이트 에러:', error);
    res.status(400).json({ message: error.message });
  }
};

// Update order
exports.update = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.user_type;
    const { 
      status, 
      paymentStatus, 
      shippingAddress, 
      trackingNumber,
      cancellationReason,
      refundAmount,
      refundDate,
      notes 
    } = req.body;
    const updateData = {};

    // 먼저 주문이 존재하는지 확인하고 권한 체크
    const existingOrder = await Order.findById(req.params.id);
    if (!existingOrder) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    // 일반 사용자는 자신의 주문만 수정 가능
    if (userType !== 'admin' && existingOrder.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: '이 주문을 수정할 권한이 없습니다.' });
    }

    // 일반 사용자는 상태 변경 제한 (취소만 가능)
    if (status !== undefined) {
      if (!['pending', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status)) {
        return res.status(400).json({
          message: '유효하지 않은 주문 상태입니다.'
        });
      }
      // 일반 사용자는 취소 상태로만 변경 가능
      if (userType !== 'admin' && status !== 'cancelled' && existingOrder.status !== 'cancelled') {
        return res.status(403).json({
          message: '일반 사용자는 주문을 취소 상태로만 변경할 수 있습니다.'
        });
      }
      updateData.status = status;
    }

    if (paymentStatus !== undefined) {
      if (!['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
        return res.status(400).json({
          message: '유효하지 않은 결제 상태입니다.'
        });
      }
      updateData.paymentStatus = paymentStatus;
    }

    if (shippingAddress !== undefined) {
      updateData.shippingAddress = shippingAddress;
    }

    if (trackingNumber !== undefined) {
      // 일반 사용자는 배송 추적 번호를 수정할 수 없음
      if (userType !== 'admin') {
        return res.status(403).json({
          message: '배송 추적 번호는 관리자만 수정할 수 있습니다.'
        });
      }
      updateData.trackingNumber = trackingNumber;
    }

    if (cancellationReason !== undefined) {
      updateData.cancellationReason = cancellationReason;
    }

    if (refundAmount !== undefined) {
      // 일반 사용자는 환불 금액을 수정할 수 없음
      if (userType !== 'admin') {
        return res.status(403).json({
          message: '환불 금액은 관리자만 수정할 수 있습니다.'
        });
      }
      if (refundAmount < 0) {
        return res.status(400).json({
          message: '환불 금액은 0 이상이어야 합니다.'
        });
      }
      updateData.refundAmount = refundAmount;
    }

    if (refundDate !== undefined) {
      // 일반 사용자는 환불 일자를 수정할 수 없음
      if (userType !== 'admin') {
        return res.status(403).json({
          message: '환불 일자는 관리자만 수정할 수 있습니다.'
        });
      }
      updateData.refundDate = new Date(refundDate);
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('items.product', 'name sku images');

    console.log('주문 업데이트 성공:', order._id, order.orderNumber);
    res.json({
      message: '주문이 업데이트되었습니다.',
      order
    });
  } catch (error) {
    console.error('주문 업데이트 에러:', error);
    res.status(400).json({ message: error.message });
  }
};

// Delete order
exports.delete = async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    console.log('주문 삭제 성공:', order._id, order.orderNumber);
    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('주문 삭제 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

// Update payment status
exports.updatePayment = async (req, res) => {
  try {
    const userId = req.user._id;
    const userType = req.user.user_type;
    const { paymentStatus } = req.body;
    const { id } = req.params;

    if (!paymentStatus || !['pending', 'completed', 'failed', 'refunded'].includes(paymentStatus)) {
      return res.status(400).json({
        message: '유효한 결제 상태가 필요합니다. (pending, completed, failed, refunded)'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: '주문을 찾을 수 없습니다.' });
    }

    // 일반 사용자는 자신의 주문만 수정 가능
    if (userType !== 'admin' && order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: '이 주문을 수정할 권한이 없습니다.' });
    }

    order.paymentStatus = paymentStatus;
    
    // 결제 완료 시 주문 상태도 업데이트
    if (paymentStatus === 'completed' && order.status === 'pending') {
      order.status = 'processing';
    }

    const savedOrder = await order.save();
    
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'name email')
      .populate('items.product', 'name sku images');

    console.log('결제 상태 업데이트 성공:', savedOrder._id, savedOrder.orderNumber, savedOrder.paymentStatus);
    res.json({
      message: '결제 상태가 업데이트되었습니다.',
      order: populatedOrder
    });
  } catch (error) {
    console.error('결제 상태 업데이트 에러:', error);
    res.status(400).json({ message: error.message });
  }
};

// Create order from cart
exports.createFromCart = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      shippingAddress, 
      paymentMethod, 
      shippingFee = 0,
      discountAmount = 0,
      couponCode,
      deliveryRequest,
      notes 
    } = req.body;

    // 장바구니 조회
    const cart = await Cart.findOne({ user: userId }).populate('items.product');
    
    if (!cart || !cart.items || cart.items.length === 0) {
      return res.status(400).json({
        message: '장바구니가 비어있습니다.'
      });
    }

    // 배송지 정보 검증
    if (!shippingAddress || !shippingAddress.name || !shippingAddress.phone || !shippingAddress.address) {
      return res.status(400).json({
        message: '배송지 정보가 필요합니다. (이름, 전화번호, 주소)'
      });
    }

    // 결제 정보 추출 (요청 본문에서)
    const paymentInfo = req.body.paymentInfo || null;

    // 장바구니 상품을 주문 아이템으로 변환
    let totalAmount = 0;
    const validatedItems = [];

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      if (!product) {
        return res.status(400).json({
          message: `상품을 찾을 수 없습니다: ${cartItem.product}`
        });
      }

      validatedItems.push({
        product: product._id,
        sku: product.sku,
        name: product.name,
        quantity: cartItem.quantity,
        price: product.price,
        image: product.images && product.images.length > 0 ? product.images[0] : null
      });

      totalAmount += product.price * cartItem.quantity;
    }

    // 최종 금액 계산 (상품 금액 + 배송비 - 할인)
    const finalAmount = totalAmount + (parseFloat(shippingFee) || 0) - (parseFloat(discountAmount) || 0);
    
    if (finalAmount < 0) {
      return res.status(400).json({
        message: '최종 결제 금액은 0 이상이어야 합니다.'
      });
    }

    // 주문 중복 체크
    const duplicateCheck = await checkDuplicateOrder(userId, validatedItems);
    if (duplicateCheck.isDuplicate) {
      return res.status(409).json({
        message: duplicateCheck.message,
        duplicateOrderId: duplicateCheck.duplicateOrder._id,
        duplicateOrderNumber: duplicateCheck.duplicateOrder.orderNumber
      });
    }

    // 결제 검증
    const paymentValidation = validatePayment(paymentMethod, paymentInfo, finalAmount);
    if (!paymentValidation.isValid) {
      return res.status(400).json({
        message: paymentValidation.message
      });
    }

    // 주문 번호 생성
    let orderNumber = generateOrderNumber();
    let exists = await Order.findOne({ orderNumber });
    while (exists) {
      orderNumber = generateOrderNumber();
      exists = await Order.findOne({ orderNumber });
    }

    // 새 주문 생성
    const orderData = {
      orderNumber,
      user: userId,
      items: validatedItems,
      totalAmount: finalAmount,
      shippingFee: parseFloat(shippingFee) || 0,
      discountAmount: parseFloat(discountAmount) || 0,
      couponCode: couponCode || undefined,
      shippingAddress,
      paymentMethod: paymentMethod || 'card',
      paymentStatus: 'pending',
      status: 'pending',
      deliveryRequest: deliveryRequest || undefined,
      notes: notes || undefined
    };

    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    // 장바구니 비우기
    cart.items = [];
    await cart.save();
    
    const populatedOrder = await Order.findById(savedOrder._id)
      .populate('user', 'name email')
      .populate('items.product', 'name sku images');

    console.log('장바구니에서 주문 생성 성공:', savedOrder._id, savedOrder.orderNumber);

    res.status(201).json({
      message: '주문이 생성되었습니다.',
      order: populatedOrder
    });
  } catch (error) {
    console.error('장바구니에서 주문 생성 에러:', error);
    res.status(400).json({ message: error.message });
  }
};

// Get order statistics
exports.getStatistics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: 'pending' });
    const processingOrders = await Order.countDocuments({ status: 'processing' });
    const shippedOrders = await Order.countDocuments({ status: 'shipped' });
    const deliveredOrders = await Order.countDocuments({ status: 'delivered' });
    const cancelledOrders = await Order.countDocuments({ status: 'cancelled' });

    const totalRevenue = await Order.aggregate([
      { $match: { status: { $ne: 'cancelled' }, paymentStatus: 'completed' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    res.json({
      totalOrders,
      pendingOrders,
      processingOrders,
      shippedOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    console.error('주문 통계 조회 에러:', error);
    res.status(500).json({ message: error.message });
  }
};

