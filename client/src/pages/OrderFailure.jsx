import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { ROUTES } from '../utils/constants';
import './OrderFailure.css';

const OrderFailure = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [errorInfo, setErrorInfo] = useState(null);

  useEffect(() => {
    // location.state에서 에러 정보 가져오기
    if (location.state?.error) {
      setErrorInfo(location.state.error);
    } else {
      // 에러 정보가 없으면 홈으로 리다이렉트
      setTimeout(() => {
        navigate(ROUTES.HOME);
      }, 3000);
    }
  }, [location, navigate]);

  if (!errorInfo) {
    return (
      <div className="order-result-container">
        <div className="order-result-loading">정보를 불러오는 중...</div>
      </div>
    );
  }

  return (
    <div className="order-result-container">
      <div className="order-failure-content">
        <div className="failure-icon">✕</div>
        <h1 className="failure-title">주문에 실패했습니다</h1>
        <p className="failure-message">
          죄송합니다. 주문 처리 중 문제가 발생했습니다.
        </p>

        <div className="error-info-card">
          <div className="error-info-header">
            <h2>에러 정보</h2>
          </div>
          <div className="error-info-body">
            <div className="error-message-box">
              <p className="error-text">{errorInfo.message || '알 수 없는 오류가 발생했습니다.'}</p>
            </div>
            {errorInfo.code && (
              <div className="info-row">
                <span className="info-label">에러 코드</span>
                <span className="info-value">{errorInfo.code}</span>
              </div>
            )}
            {errorInfo.orderId && (
              <div className="info-row">
                <span className="info-label">주문 ID</span>
                <span className="info-value">{errorInfo.orderId}</span>
              </div>
            )}
          </div>
        </div>

        <div className="failure-actions">
          <Link to={ROUTES.CART} className="action-button primary">
            장바구니로 돌아가기
          </Link>
          <button 
            className="action-button secondary"
            onClick={() => navigate(ROUTES.HOME)}
          >
            홈으로 가기
          </button>
        </div>

        <div className="failure-note">
          <p>
            문제가 계속되면 고객센터로 문의해주세요.<br />
            고객센터: 1588-0000
          </p>
        </div>
      </div>
    </div>
  );
};

export default OrderFailure;

