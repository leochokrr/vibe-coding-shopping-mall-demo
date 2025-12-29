import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './OrderDetail.css';

const OrderDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchOrderDetail();
    }
  }, [id]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`${API_ENDPOINTS.ORDERS}/${id}`);
      setOrder(response.data);
    } catch (err) {
      console.error('주문 상세 조회 실패:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
        navigate(ROUTES.LOGIN);
      } else if (err.response?.status === 403) {
        setError('이 주문에 접근할 권한이 없습니다.');
      } else if (err.response?.status === 404) {
        setError('주문을 찾을 수 없습니다.');
      } else {
        setError('주문 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status) => {
    const statusMap = {
      pending: '주문 대기',
      processing: '처리 중',
      shipped: '배송 중',
      delivered: '배송 완료',
      cancelled: '취소됨'
    };
    return statusMap[status] || status;
  };

  const getPaymentStatusLabel = (paymentStatus) => {
    const statusMap = {
      pending: '결제 대기',
      completed: '결제 완료',
      failed: '결제 실패',
      refunded: '환불 완료'
    };
    return statusMap[paymentStatus] || paymentStatus;
  };

  const getPaymentMethodLabel = (paymentMethod) => {
    const methodMap = {
      card: '신용카드',
      bank: '계좌이체',
      cash: '무통장입금',
      other: '기타'
    };
    return methodMap[paymentMethod] || paymentMethod;
  };

  if (loading) {
    return (
      <div className="order-detail-container">
        <div className="order-detail-loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="order-detail-container">
        <div className="order-detail-error">{error}</div>
        <button className="back-button" onClick={() => navigate(ROUTES.ORDERS)}>
          주문 목록으로 돌아가기
        </button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="order-detail-container">
        <div className="order-detail-error">주문 정보를 찾을 수 없습니다.</div>
        <button className="back-button" onClick={() => navigate(ROUTES.ORDERS)}>
          주문 목록으로 돌아가기
        </button>
      </div>
    );
  }

  const items = order.items || [];
  const totalItems = items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity || 0), 0);
  const shippingFee = order.shippingFee || 0;
  const discountAmount = order.discountAmount || 0;
  const totalAmount = order.totalAmount || 0;

  return (
    <div className="order-detail-container">
      <div className="order-detail-header">
        <h1>주문 상세</h1>
        <button className="back-button" onClick={() => navigate(ROUTES.ORDERS)}>
          ← 주문 목록으로
        </button>
      </div>

      <div className="order-detail-content">
        {/* 주문 기본 정보 */}
        <div className="order-detail-section">
          <h2>주문 정보</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">주문 번호</span>
              <span className="info-value">{order.orderNumber || order._id}</span>
            </div>
            <div className="info-item">
              <span className="info-label">주문 일시</span>
              <span className="info-value">
                {order.createdAt 
                  ? new Date(order.createdAt).toLocaleString('ko-KR')
                  : '-'}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">주문 상태</span>
              <span className={`info-value status-badge ${order.status}`}>
                {getStatusLabel(order.status)}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">결제 상태</span>
              <span className={`info-value payment-status-badge ${order.paymentStatus || 'pending'}`}>
                {getPaymentStatusLabel(order.paymentStatus)}
              </span>
            </div>
          </div>
        </div>

        {/* 주문 상품 목록 */}
        <div className="order-detail-section">
          <h2>주문 상품 ({totalItems}개)</h2>
          <div className="order-items-list">
            {items.map((item, index) => (
              <div key={index} className="order-item-detail">
                <div 
                  className="order-item-image"
                  onClick={() => item.product && navigate(ROUTES.PRODUCT_DETAIL_BY_ID(item.product._id || item.product))}
                >
                  {item.image ? (
                    <img src={item.image} alt={item.name} />
                  ) : item.product?.images && item.product.images.length > 0 ? (
                    <img src={item.product.images[0]} alt={item.name} />
                  ) : (
                    <div className="no-image">이미지 없음</div>
                  )}
                </div>
                <div className="order-item-details">
                  <h3 
                    className="order-item-name"
                    onClick={() => item.product && navigate(ROUTES.PRODUCT_DETAIL_BY_ID(item.product._id || item.product))}
                  >
                    {item.name || '상품명 없음'}
                  </h3>
                  <p className="order-item-sku">SKU: {item.sku || '-'}</p>
                  <div className="order-item-quantity-price">
                    <span className="quantity">수량: {item.quantity}개</span>
                    <span className="price">₩{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                  <p className="order-item-unit-price">단가: ₩{item.price?.toLocaleString() || '0'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 배송지 정보 */}
        <div className="order-detail-section">
          <h2>배송지 정보</h2>
          <div className="shipping-address-info">
            <div className="address-row">
              <span className="address-label">수령인</span>
              <span className="address-value">{order.shippingAddress?.name || '-'}</span>
            </div>
            <div className="address-row">
              <span className="address-label">전화번호</span>
              <span className="address-value">{order.shippingAddress?.phone || '-'}</span>
            </div>
            {order.shippingAddress?.postalCode && (
              <div className="address-row">
                <span className="address-label">우편번호</span>
                <span className="address-value">{order.shippingAddress.postalCode}</span>
              </div>
            )}
            <div className="address-row">
              <span className="address-label">주소</span>
              <span className="address-value">
                {order.shippingAddress?.address || '-'}
                {order.shippingAddress?.detailAddress && ` ${order.shippingAddress.detailAddress}`}
              </span>
            </div>
            {order.deliveryRequest && (
              <div className="address-row">
                <span className="address-label">배송 요청사항</span>
                <span className="address-value">{order.deliveryRequest}</span>
              </div>
            )}
            {order.trackingNumber && (
              <div className="address-row">
                <span className="address-label">배송 추적 번호</span>
                <span className="address-value tracking-number">{order.trackingNumber}</span>
              </div>
            )}
          </div>
        </div>

        {/* 결제 정보 */}
        <div className="order-detail-section">
          <h2>결제 정보</h2>
          <div className="payment-info-grid">
            <div className="info-item">
              <span className="info-label">결제 방법</span>
              <span className="info-value">{getPaymentMethodLabel(order.paymentMethod)}</span>
            </div>
            <div className="info-item">
              <span className="info-label">결제 상태</span>
              <span className={`info-value payment-status-badge ${order.paymentStatus || 'pending'}`}>
                {getPaymentStatusLabel(order.paymentStatus)}
              </span>
            </div>
            {order.couponCode && (
              <div className="info-item">
                <span className="info-label">사용한 쿠폰</span>
                <span className="info-value">{order.couponCode}</span>
              </div>
            )}
          </div>
        </div>

        {/* 주문 금액 정보 */}
        <div className="order-detail-section">
          <h2>주문 금액</h2>
          <div className="order-summary">
            <div className="summary-row">
              <span>상품 금액</span>
              <span>₩{subtotal.toLocaleString()}</span>
            </div>
            <div className="summary-row">
              <span>배송비</span>
              <span>₩{shippingFee.toLocaleString()}</span>
            </div>
            {discountAmount > 0 && (
              <div className="summary-row discount">
                <span>할인 금액</span>
                <span>-₩{discountAmount.toLocaleString()}</span>
              </div>
            )}
            <div className="summary-row total">
              <span>최종 결제금액</span>
              <span>₩{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* 취소/환불 정보 */}
        {(order.status === 'cancelled' || order.paymentStatus === 'refunded') && (
          <div className="order-detail-section">
            <h2>취소/환불 정보</h2>
            {order.cancellationReason && (
              <div className="info-item">
                <span className="info-label">취소 사유</span>
                <span className="info-value">{order.cancellationReason}</span>
              </div>
            )}
            {order.refundAmount && (
              <div className="info-item">
                <span className="info-label">환불 금액</span>
                <span className="info-value amount">₩{order.refundAmount.toLocaleString()}</span>
              </div>
            )}
            {order.refundDate && (
              <div className="info-item">
                <span className="info-label">환불 일시</span>
                <span className="info-value">
                  {new Date(order.refundDate).toLocaleString('ko-KR')}
                </span>
              </div>
            )}
          </div>
        )}

        {/* 기타 정보 */}
        {order.notes && (
          <div className="order-detail-section">
            <h2>주문 메모</h2>
            <div className="order-notes">
              <p>{order.notes}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderDetail;

