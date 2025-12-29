import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './OrderList.css';

const OrderList = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, searchTerm]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }

      const response = await api.get(API_ENDPOINTS.ORDERS, { params });
      setOrders(response.data || []);
    } catch (err) {
      console.error('주문 목록 가져오기 실패:', err);
      if (err.response?.status === 401) {
        setError('로그인이 필요합니다.');
        navigate(ROUTES.LOGIN);
      } else {
        setError('주문 목록을 불러오는데 실패했습니다.');
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

  if (loading) {
    return (
      <div className="order-list-container">
        <div className="order-list-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="order-list-container">
      <div className="order-list-header">
        <h1>내 주문 목록</h1>
        <button className="back-button" onClick={() => navigate(ROUTES.HOME)}>
          ← 홈으로
        </button>
      </div>

      {/* 필터 및 검색 */}
      <div className="order-list-filters">
        <div className="filter-group">
          <label htmlFor="statusFilter">주문 상태:</label>
          <select
            id="statusFilter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">전체</option>
            <option value="pending">주문 대기</option>
            <option value="processing">처리 중</option>
            <option value="shipped">배송 중</option>
            <option value="delivered">배송 완료</option>
            <option value="cancelled">취소됨</option>
          </select>
        </div>
        <div className="filter-group">
          <label htmlFor="searchTerm">검색:</label>
          <input
            type="text"
            id="searchTerm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="주문 번호로 검색"
            className="filter-input"
          />
        </div>
      </div>

      {error && (
        <div className="order-list-error">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="order-list-empty">
          <div className="empty-icon">📦</div>
          <h2>주문 내역이 없습니다</h2>
          <p>아직 주문한 상품이 없습니다.</p>
          <button className="shop-button" onClick={() => navigate(ROUTES.HOME)}>
            쇼핑하러 가기
          </button>
        </div>
      ) : (
        <div className="order-list-content">
          <div className="order-count">
            총 {orders.length}개의 주문이 있습니다.
          </div>
          <div className="orders-grid">
            {orders.map((order) => (
              <div key={order._id} className="order-card">
                <div className="order-card-header">
                  <div className="order-number-section">
                    <h3 className="order-number">{order.orderNumber || order._id}</h3>
                    <span className="order-date">
                      {order.createdAt 
                        ? new Date(order.createdAt).toLocaleDateString('ko-KR')
                        : '-'}
                    </span>
                  </div>
                  <div className="order-status-badges">
                    <span className={`status-badge ${order.status}`}>
                      {getStatusLabel(order.status)}
                    </span>
                    <span className={`payment-status-badge ${order.paymentStatus || 'pending'}`}>
                      {getPaymentStatusLabel(order.paymentStatus)}
                    </span>
                  </div>
                </div>

                <div className="order-items">
                  {order.items && order.items.length > 0 ? (
                    <>
                      {order.items.slice(0, 3).map((item, index) => (
                        <div key={index} className="order-item-preview">
                          {item.image && (
                            <img 
                              src={item.image} 
                              alt={item.name}
                              className="order-item-image"
                            />
                          )}
                          <div className="order-item-info">
                            <p className="order-item-name">{item.name || '상품명 없음'}</p>
                            <p className="order-item-details">
                              {item.quantity}개 × ₩{item.price?.toLocaleString() || '0'}
                            </p>
                          </div>
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <p className="order-more-items">
                          외 {order.items.length - 3}개 상품
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="no-items">상품 정보 없음</p>
                  )}
                </div>

                <div className="order-card-footer">
                  <div className="order-total">
                    <span className="total-label">총 결제금액</span>
                    <span className="total-amount">
                      ₩{order.totalAmount?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <button
                    className="view-detail-button"
                    onClick={() => navigate(ROUTES.ORDER_DETAIL(order._id))}
                  >
                    상세보기
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderList;

