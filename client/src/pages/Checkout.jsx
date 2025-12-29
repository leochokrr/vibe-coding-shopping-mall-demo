import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './Checkout.css';

const Checkout = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  
  // 주문 정보 상태
  const [orderData, setOrderData] = useState({
    shippingAddress: {
      name: '',
      phone: '',
      address: '',
      detailAddress: '',
      postalCode: ''
    },
    paymentMethod: 'card',
    shippingFee: 3000,
    discountAmount: 0,
    couponCode: '',
    deliveryRequest: '',
    notes: ''
  });

  // 결제 정보 상태
  const [paymentData, setPaymentData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardHolderName: ''
  });

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(API_ENDPOINTS.CART);
      setCart(response.data.cart);
      
      // 사용자 정보가 있으면 배송지 기본값 설정
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setOrderData(prev => ({
            ...prev,
            shippingAddress: {
              ...prev.shippingAddress,
              name: userData.name || '',
              phone: userData.phone || '',
              address: userData.address || ''
            }
          }));
        } catch (err) {
          console.error('사용자 정보 파싱 에러:', err);
        }
      }
    } catch (err) {
      console.error('장바구니 조회 실패:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
        navigate(ROUTES.LOGIN);
      } else {
        setError('장바구니를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name.startsWith('shippingAddress.')) {
      const field = name.split('.')[1];
      setOrderData(prev => ({
        ...prev,
        shippingAddress: {
          ...prev.shippingAddress,
          [field]: value
        }
      }));
    } else {
      setOrderData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handlePaymentInputChange = (e) => {
    const { name, value } = e.target;
    
    // 카드 번호 포맷팅 (4자리마다 공백)
    if (name === 'cardNumber') {
      const formatted = value.replace(/\s/g, '').replace(/(.{4})/g, '$1 ').trim();
      if (formatted.replace(/\s/g, '').length <= 16) {
        setPaymentData(prev => ({ ...prev, [name]: formatted }));
      }
    }
    // 유효기간 포맷팅 (MM/YY)
    else if (name === 'expiryDate') {
      const formatted = value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 5);
      setPaymentData(prev => ({ ...prev, [name]: formatted }));
    }
    // CVV (3자리만)
    else if (name === 'cvv') {
      if (value.length <= 3 && /^\d*$/.test(value)) {
        setPaymentData(prev => ({ ...prev, [name]: value }));
      }
    }
    else {
      setPaymentData(prev => ({ ...prev, [name]: value }));
    }
  };

  const simulatePayment = async (orderId) => {
    // 테스트용 카드 번호로 결제 시뮬레이션
    const cardNumber = paymentData.cardNumber.replace(/\s/g, '');
    
    // 테스트 카드 번호
    // 4111 1111 1111 1111 - 성공
    // 4000 0000 0000 0002 - 실패
    // 4000 0025 0000 3155 - 3D Secure 필요
    
    let paymentResult = { success: true, message: '결제가 완료되었습니다.' };
    
    if (cardNumber === '4000000000000002') {
      paymentResult = { success: false, message: '카드 승인이 거부되었습니다. 카드 정보를 확인해주세요.' };
    } else if (cardNumber === '4000002500003155') {
      paymentResult = { success: false, message: '3D Secure 인증이 필요합니다.' };
    } else if (cardNumber === '4111111111111111') {
      paymentResult = { success: true, message: '결제가 완료되었습니다.' };
    } else if (!cardNumber || cardNumber.length !== 16) {
      paymentResult = { success: false, message: '올바른 카드 번호를 입력해주세요.' };
    }

    // 실제 결제 API 호출 시뮬레이션 (1-2초 딜레이)
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (paymentResult.success) {
      // 결제 성공 시 주문 상태 업데이트
      try {
        await api.put(`${API_ENDPOINTS.ORDERS}/${orderId}/payment`, {
          paymentStatus: 'completed'
        });
      } catch (err) {
        console.error('결제 상태 업데이트 실패:', err);
      }
    }

    return paymentResult;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 배송지 정보 검증
    if (!orderData.shippingAddress.name || !orderData.shippingAddress.phone || !orderData.shippingAddress.address) {
      alert('배송지 정보를 모두 입력해주세요. (이름, 전화번호, 주소)');
      return;
    }

    if (!cart || !cart.items || cart.items.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    // 신용카드 결제인 경우 결제 정보 확인
    if (orderData.paymentMethod === 'card') {
      if (!paymentData.cardNumber || !paymentData.expiryDate || !paymentData.cvv || !paymentData.cardHolderName) {
        setShowPaymentModal(true);
        return;
      }
    }

    setSubmitting(true);
    setError('');

    try {
      // 장바구니에서 주문 생성
      const response = await api.post(`${API_ENDPOINTS.ORDERS}/from-cart`, {
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        shippingFee: parseFloat(orderData.shippingFee) || 0,
        discountAmount: parseFloat(orderData.discountAmount) || 0,
        couponCode: orderData.couponCode || undefined,
        deliveryRequest: orderData.deliveryRequest || undefined,
        notes: orderData.notes || undefined
      });

      if (response.data && response.data.order) {
        const orderId = response.data.order._id;

        // 신용카드 결제인 경우 결제 처리
        if (orderData.paymentMethod === 'card') {
          setProcessingPayment(true);
          const paymentResult = await simulatePayment(orderId);
          setProcessingPayment(false);

          if (!paymentResult.success) {
            // 결제 실패 시 실패 페이지로 이동
            navigate(ROUTES.ORDER_FAILURE, {
              state: {
                error: {
                  message: paymentResult.message,
                  code: 'PAYMENT_FAILED',
                  orderId: orderId
                }
              }
            });
            return;
          }
        }

        // 장바구니 업데이트 이벤트 발생
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
        // 주문 완료 후 성공 페이지로 이동
        navigate(ROUTES.ORDER_SUCCESS, {
          state: { order: response.data.order }
        });
      }
    } catch (err) {
      console.error('주문 생성 실패:', err);
      
      // 주문 생성 실패 시 실패 페이지로 이동
      const errorMessage = err.response?.status === 401 
        ? '로그인이 필요합니다.'
        : err.response?.status === 400
        ? err.response.data.message || '주문 생성에 실패했습니다.'
        : err.response?.status === 409
        ? err.response.data.message || '중복 주문이 감지되었습니다.'
        : '주문 생성에 실패했습니다. 다시 시도해주세요.';

      navigate(ROUTES.ORDER_FAILURE, {
        state: {
          error: {
            message: errorMessage,
            code: err.response?.status || 'UNKNOWN_ERROR',
            status: err.response?.status
          }
        }
      });
    } finally {
      setSubmitting(false);
      setProcessingPayment(false);
    }
  };

  const handlePaymentModalSubmit = async () => {
    // 결제 정보 검증
    if (!paymentData.cardNumber || paymentData.cardNumber.replace(/\s/g, '').length !== 16) {
      alert('올바른 카드 번호를 입력해주세요.');
      return;
    }
    if (!paymentData.expiryDate || paymentData.expiryDate.length !== 5) {
      alert('올바른 유효기간을 입력해주세요. (MM/YY)');
      return;
    }
    if (!paymentData.cvv || paymentData.cvv.length !== 3) {
      alert('올바른 CVV를 입력해주세요.');
      return;
    }
    if (!paymentData.cardHolderName) {
      alert('카드 소유자 이름을 입력해주세요.');
      return;
    }

    setShowPaymentModal(false);
    
    // 주문 생성 및 결제 처리
    if (!cart || !cart.items || cart.items.length === 0) {
      alert('장바구니가 비어있습니다.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      // 장바구니에서 주문 생성
      const response = await api.post(`${API_ENDPOINTS.ORDERS}/from-cart`, {
        shippingAddress: orderData.shippingAddress,
        paymentMethod: orderData.paymentMethod,
        shippingFee: parseFloat(orderData.shippingFee) || 0,
        discountAmount: parseFloat(orderData.discountAmount) || 0,
        couponCode: orderData.couponCode || undefined,
        deliveryRequest: orderData.deliveryRequest || undefined,
        notes: orderData.notes || undefined
      });

      if (response.data && response.data.order) {
        const orderId = response.data.order._id;

        // 결제 처리
        setProcessingPayment(true);
        const paymentResult = await simulatePayment(orderId);
        setProcessingPayment(false);

        if (!paymentResult.success) {
          // 결제 실패 시 실패 페이지로 이동
          navigate(ROUTES.ORDER_FAILURE, {
            state: {
              error: {
                message: paymentResult.message,
                code: 'PAYMENT_FAILED',
                orderId: orderId
              }
            }
          });
          return;
        }

        // 장바구니 업데이트 이벤트 발생
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        
        // 주문 완료 후 성공 페이지로 이동
        navigate(ROUTES.ORDER_SUCCESS, {
          state: { order: response.data.order }
        });
      }
    } catch (err) {
      console.error('주문 생성 실패:', err);
      
      // 주문 생성 실패 시 실패 페이지로 이동
      const errorMessage = err.response?.status === 401 
        ? '로그인이 필요합니다.'
        : err.response?.status === 400
        ? err.response.data.message || '주문 생성에 실패했습니다.'
        : err.response?.status === 409
        ? err.response.data.message || '중복 주문이 감지되었습니다.'
        : '주문 생성에 실패했습니다. 다시 시도해주세요.';

      navigate(ROUTES.ORDER_FAILURE, {
        state: {
          error: {
            message: errorMessage,
            code: err.response?.status || 'UNKNOWN_ERROR',
            status: err.response?.status
          }
        }
      });
    } finally {
      setSubmitting(false);
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="checkout-container">
        <div className="checkout-loading">로딩 중...</div>
      </div>
    );
  }

  if (error && !cart) {
    return (
      <div className="checkout-container">
        <div className="checkout-error">{error}</div>
      </div>
    );
  }

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;
  const totalItems = cart?.totalItems || 0;
  const finalAmount = totalAmount + (parseFloat(orderData.shippingFee) || 0) - (parseFloat(orderData.discountAmount) || 0);

  return (
    <div className="checkout-container">
      <div className="checkout-header">
        <h1>주문하기</h1>
        <button className="back-button" onClick={() => navigate(ROUTES.CART)}>
          ← 장바구니로 돌아가기
        </button>
      </div>

      {items.length === 0 ? (
        <div className="checkout-empty">
          <div className="empty-icon">🛒</div>
          <h2>장바구니가 비어있습니다</h2>
          <p>주문할 상품이 없습니다.</p>
          <button className="shop-button" onClick={() => navigate(ROUTES.HOME)}>
            쇼핑하러 가기
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="checkout-form">
          {error && (
            <div className="checkout-error-message">{error}</div>
          )}

          <div className="checkout-content">
            {/* 주문 상품 목록 */}
            <div className="checkout-section">
              <h2>주문 상품</h2>
              <div className="checkout-items">
                {items.map((item) => (
                  <div key={item._id} className="checkout-item">
                    <div className="checkout-item-image">
                      {item.product?.images && item.product.images.length > 0 ? (
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name}
                        />
                      ) : (
                        <div className="no-image">이미지 없음</div>
                      )}
                    </div>
                    <div className="checkout-item-info">
                      <h3>{item.product?.name || '상품 정보 없음'}</h3>
                      <p>SKU: {item.product?.sku || '-'}</p>
                      <p>수량: {item.quantity}개</p>
                      <p className="checkout-item-price">
                        ₩{item.product?.price ? (item.product.price * item.quantity).toLocaleString() : 0}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 배송지 정보 */}
            <div className="checkout-section">
              <h2>배송지 정보</h2>
              <div className="form-group">
                <label htmlFor="shippingAddress.name">
                  수령인 이름 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="shippingAddress.name"
                  name="shippingAddress.name"
                  value={orderData.shippingAddress.name}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="shippingAddress.phone">
                  전화번호 <span className="required">*</span>
                </label>
                <input
                  type="tel"
                  id="shippingAddress.phone"
                  name="shippingAddress.phone"
                  value={orderData.shippingAddress.phone}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="010-1234-5678"
                />
              </div>

              <div className="form-group">
                <label htmlFor="shippingAddress.postalCode">
                  우편번호
                </label>
                <input
                  type="text"
                  id="shippingAddress.postalCode"
                  name="shippingAddress.postalCode"
                  value={orderData.shippingAddress.postalCode}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="06142"
                />
              </div>

              <div className="form-group">
                <label htmlFor="shippingAddress.address">
                  주소 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="shippingAddress.address"
                  name="shippingAddress.address"
                  value={orderData.shippingAddress.address}
                  onChange={handleInputChange}
                  required
                  className="form-input"
                  placeholder="서울시 강남구 테헤란로 123"
                />
              </div>

              <div className="form-group">
                <label htmlFor="shippingAddress.detailAddress">
                  상세주소
                </label>
                <input
                  type="text"
                  id="shippingAddress.detailAddress"
                  name="shippingAddress.detailAddress"
                  value={orderData.shippingAddress.detailAddress}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="101호"
                />
              </div>

              <div className="form-group">
                <label htmlFor="deliveryRequest">
                  배송 요청사항
                </label>
                <textarea
                  id="deliveryRequest"
                  name="deliveryRequest"
                  value={orderData.deliveryRequest}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows="3"
                  placeholder="예: 문 앞에 놓아주세요"
                />
              </div>
            </div>

            {/* 결제 정보 */}
            <div className="checkout-section">
              <h2>결제 정보</h2>
              <div className="form-group">
                <label htmlFor="paymentMethod">
                  결제 방법 <span className="required">*</span>
                </label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={orderData.paymentMethod}
                  onChange={handleInputChange}
                  required
                  className="form-select"
                >
                  <option value="card">신용카드</option>
                  <option value="bank">계좌이체</option>
                  <option value="cash">무통장입금</option>
                  <option value="other">기타</option>
                </select>
              </div>

              {orderData.paymentMethod === 'card' && (
                <>
                  <div className="payment-info-preview">
                    <p className="payment-info-note">
                      💳 테스트 카드 번호:
                    </p>
                    <ul className="test-card-list">
                      <li><strong>4111 1111 1111 1111</strong> - 결제 성공</li>
                      <li><strong>4000 0000 0000 0002</strong> - 결제 실패</li>
                      <li><strong>4000 0025 0000 3155</strong> - 3D Secure 필요</li>
                    </ul>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cardNumber">
                      카드 번호 <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="cardNumber"
                      name="cardNumber"
                      value={paymentData.cardNumber}
                      onChange={handlePaymentInputChange}
                      className="form-input"
                      placeholder="4111 1111 1111 1111"
                      maxLength="19"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="expiryDate">
                        유효기간 <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="expiryDate"
                        name="expiryDate"
                        value={paymentData.expiryDate}
                        onChange={handlePaymentInputChange}
                        className="form-input"
                        placeholder="MM/YY"
                        maxLength="5"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor="cvv">
                        CVV <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="cvv"
                        name="cvv"
                        value={paymentData.cvv}
                        onChange={handlePaymentInputChange}
                        className="form-input"
                        placeholder="123"
                        maxLength="3"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="cardHolderName">
                      카드 소유자 이름 <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="cardHolderName"
                      name="cardHolderName"
                      value={paymentData.cardHolderName}
                      onChange={handlePaymentInputChange}
                      className="form-input"
                      placeholder="홍길동"
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label htmlFor="couponCode">
                  쿠폰 코드
                </label>
                <input
                  type="text"
                  id="couponCode"
                  name="couponCode"
                  value={orderData.couponCode}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="쿠폰 코드를 입력하세요"
                />
              </div>

              <div className="form-group">
                <label htmlFor="notes">
                  주문 메모
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  value={orderData.notes}
                  onChange={handleInputChange}
                  className="form-textarea"
                  rows="3"
                  placeholder="주문 시 요청사항을 입력하세요"
                />
              </div>
            </div>

            {/* 주문 요약 */}
            <div className="checkout-summary">
              <h2>주문 요약</h2>
              <div className="summary-content">
                <div className="summary-row">
                  <span>상품 개수</span>
                  <span>{totalItems}개</span>
                </div>
                <div className="summary-row">
                  <span>상품 금액</span>
                  <span>₩{totalAmount.toLocaleString()}</span>
                </div>
                <div className="summary-row">
                  <span>배송비</span>
                  <span>
                    <input
                      type="number"
                      name="shippingFee"
                      value={orderData.shippingFee}
                      onChange={handleInputChange}
                      min="0"
                      className="summary-input"
                    />
                    원
                  </span>
                </div>
                <div className="summary-row">
                  <span>할인 금액</span>
                  <span>
                    <input
                      type="number"
                      name="discountAmount"
                      value={orderData.discountAmount}
                      onChange={handleInputChange}
                      min="0"
                      className="summary-input"
                    />
                    원
                  </span>
                </div>
                <div className="summary-row total">
                  <span>최종 결제금액</span>
                  <span>₩{finalAmount.toLocaleString()}</span>
                </div>
                <button 
                  type="submit" 
                  className="submit-order-button"
                  disabled={submitting || processingPayment}
                >
                  {processingPayment ? '결제 처리 중...' : submitting ? '주문 처리 중...' : '주문하기'}
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 결제 정보 입력 모달 */}
      {showPaymentModal && (
        <div className="payment-modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="payment-modal" onClick={(e) => e.stopPropagation()}>
            <div className="payment-modal-header">
              <h2>결제 정보 입력</h2>
              <button 
                className="payment-modal-close"
                onClick={() => setShowPaymentModal(false)}
              >
                ×
              </button>
            </div>
            <div className="payment-modal-content">
              <div className="payment-info-preview">
                <p className="payment-info-note">
                  💳 테스트 카드 번호:
                </p>
                <ul className="test-card-list">
                  <li><strong>4111 1111 1111 1111</strong> - 결제 성공</li>
                  <li><strong>4000 0000 0000 0002</strong> - 결제 실패</li>
                  <li><strong>4000 0025 0000 3155</strong> - 3D Secure 필요</li>
                </ul>
              </div>

              <div className="form-group">
                <label htmlFor="modal-cardNumber">
                  카드 번호 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="modal-cardNumber"
                  name="cardNumber"
                  value={paymentData.cardNumber}
                  onChange={handlePaymentInputChange}
                  className="form-input"
                  placeholder="4111 1111 1111 1111"
                  maxLength="19"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="modal-expiryDate">
                    유효기간 <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-expiryDate"
                    name="expiryDate"
                    value={paymentData.expiryDate}
                    onChange={handlePaymentInputChange}
                    className="form-input"
                    placeholder="MM/YY"
                    maxLength="5"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="modal-cvv">
                    CVV <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="modal-cvv"
                    name="cvv"
                    value={paymentData.cvv}
                    onChange={handlePaymentInputChange}
                    className="form-input"
                    placeholder="123"
                    maxLength="3"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="modal-cardHolderName">
                  카드 소유자 이름 <span className="required">*</span>
                </label>
                <input
                  type="text"
                  id="modal-cardHolderName"
                  name="cardHolderName"
                  value={paymentData.cardHolderName}
                  onChange={handlePaymentInputChange}
                  className="form-input"
                  placeholder="홍길동"
                />
              </div>
            </div>
            <div className="payment-modal-footer">
              <button 
                className="payment-modal-cancel"
                onClick={() => setShowPaymentModal(false)}
              >
                취소
              </button>
              <button 
                className="payment-modal-submit"
                onClick={handlePaymentModalSubmit}
              >
                결제 진행
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;

