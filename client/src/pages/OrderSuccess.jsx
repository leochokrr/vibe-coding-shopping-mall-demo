import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import './OrderSuccess.css';

const OrderSuccess = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [orderInfo, setOrderInfo] = useState(null);

  useEffect(() => {
    // location.state에서 주문 정보 가져오기
    if (location.state?.order) {
      setOrderInfo(location.state.order);
    } else {
      // 주문 정보가 없으면 홈으로 리다이렉트
      setTimeout(() => {
        navigate(ROUTES.HOME);
      }, 3000);
    }
  }, [location, navigate]);

  if (!orderInfo) {
    return (
      <div className="order-result-container">
        <div className="order-result-loading">주문 정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="order-result-container">
      <div className="order-success-content">
        <div className="success-icon">✓</div>
        <h1 className="success-title">주문이 완료되었습니다!</h1>
        <p className="success-message">
          주문해주셔서 감사합니다. 주문 내역은 아래와 같습니다.
        </p>

        <div className="order-info-card">
          <div className="order-info-header">
            <h2>주문 정보</h2>
          </div>
          <div className="order-info-body">
            <div className="info-row">
              <span className="info-label">주문 번호</span>
              <span className="info-value">{orderInfo.orderNumber || orderInfo._id}</span>
            </div>
            <div className="info-row">
              <span className="info-label">주문 일시</span>
              <span className="info-value">
                {orderInfo.createdAt 
                  ? new Date(orderInfo.createdAt).toLocaleString('ko-KR')
                  : new Date().toLocaleString('ko-KR')}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">결제 금액</span>
              <span className="info-value amount">
                ₩{orderInfo.totalAmount?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">결제 방법</span>
              <span className="info-value">
                {orderInfo.paymentMethod === 'card' ? '신용카드' :
                 orderInfo.paymentMethod === 'bank' ? '계좌이체' :
                 orderInfo.paymentMethod === 'cash' ? '무통장입금' :
                 orderInfo.paymentMethod === 'other' ? '기타' :
                 orderInfo.paymentMethod || '-'}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">결제 상태</span>
              <span className={`info-value status ${orderInfo.paymentStatus || 'pending'}`}>
                {orderInfo.paymentStatus === 'completed' ? '결제 완료' :
                 orderInfo.paymentStatus === 'pending' ? '결제 대기' :
                 orderInfo.paymentStatus === 'failed' ? '결제 실패' :
                 orderInfo.paymentStatus === 'refunded' ? '환불 완료' :
                 '결제 대기'}
              </span>
            </div>
          </div>
        </div>

        <div className="order-actions">
          <Link to={ROUTES.HOME} className="action-button primary">
            쇼핑 계속하기
          </Link>
          <button 
            className="action-button secondary"
            onClick={() => navigate(ROUTES.ORDERS)}
          >
            주문 목록 보기
          </button>
        </div>

        <div className="order-note">
          <p>주문 확인 및 배송 정보는 마이페이지에서 확인하실 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;

