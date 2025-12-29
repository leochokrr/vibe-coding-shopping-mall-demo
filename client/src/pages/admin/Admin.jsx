import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { API_ENDPOINTS, ROUTES } from '../../utils/constants';
import './Admin.css';

const Admin = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'products', or 'orders'
  
  // Users state
  const [users, setUsers] = useState([]);
  const [userLoading, setUserLoading] = useState(true);
  const [userError, setUserError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // all, customer, admin
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    user_type: '',
    address: ''
  });


  // Orders state
  const [orders, setOrders] = useState([]);
  const [orderLoading, setOrderLoading] = useState(true);
  const [orderError, setOrderError] = useState('');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all'); // all, pending, processing, shipped, delivered, cancelled
  const [orderStatistics, setOrderStatistics] = useState(null);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'orders') {
      fetchOrders();
      fetchOrderStatistics();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      setUserLoading(true);
      setUserError('');
      const response = await api.get(API_ENDPOINTS.USERS);
      setUsers(response.data || []);
    } catch (err) {
      console.error('사용자 목록 가져오기 실패:', err);
      setUserError('사용자 목록을 불러오는데 실패했습니다.');
      if (err.response?.status === 401) {
        setUserError('인증이 필요합니다. 다시 로그인해주세요.');
      }
    } finally {
      setUserLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('정말 이 사용자를 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`${API_ENDPOINTS.USERS}/${userId}`);
      setUsers(users.filter(user => user._id !== userId));
      alert('사용자가 삭제되었습니다.');
    } catch (err) {
      console.error('사용자 삭제 실패:', err);
      alert('사용자 삭제에 실패했습니다.');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user._id);
    setEditForm({
      name: user.name,
      email: user.email,
      user_type: user.user_type,
      address: user.address || ''
    });
  };

  const handleUpdate = async (userId) => {
    try {
      const response = await api.put(`${API_ENDPOINTS.USERS}/${userId}`, editForm);
      setUsers(users.map(user => user._id === userId ? response.data : user));
      setEditingUser(null);
      alert('사용자 정보가 업데이트되었습니다.');
    } catch (err) {
      console.error('사용자 업데이트 실패:', err);
      alert('사용자 정보 업데이트에 실패했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm({ name: '', email: '', user_type: '', address: '' });
  };


  // Orders handlers
  const fetchOrders = async () => {
    try {
      setOrderLoading(true);
      setOrderError('');
      const params = {};
      if (orderStatusFilter !== 'all') {
        params.status = orderStatusFilter;
      }
      if (orderSearchTerm) {
        params.search = orderSearchTerm;
      }
      const response = await api.get(API_ENDPOINTS.ORDERS, { params });
      setOrders(response.data || []);
    } catch (err) {
      console.error('주문 목록 가져오기 실패:', err);
      setOrderError('주문 목록을 불러오는데 실패했습니다.');
      if (err.response?.status === 401) {
        setOrderError('인증이 필요합니다. 다시 로그인해주세요.');
      }
    } finally {
      setOrderLoading(false);
    }
  };

  const fetchOrderStatistics = async () => {
    try {
      const response = await api.get(API_ENDPOINTS.ORDER_STATISTICS);
      setOrderStatistics(response.data);
    } catch (err) {
      console.error('주문 통계 가져오기 실패:', err);
    }
  };

  const handleUpdateOrderStatus = async (orderId, newStatus) => {
    try {
      const response = await api.put(`${API_ENDPOINTS.ORDERS}/${orderId}/status`, { status: newStatus });
      setOrders(orders.map(order => order._id === orderId ? response.data.order : order));
      await fetchOrderStatistics(); // 통계 업데이트
      alert('주문 상태가 업데이트되었습니다.');
    } catch (err) {
      console.error('주문 상태 업데이트 실패:', err);
      alert('주문 상태 업데이트에 실패했습니다.');
    }
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm('정말 이 주문을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`${API_ENDPOINTS.ORDERS}/${orderId}`);
      setOrders(orders.filter(order => order._id !== orderId));
      await fetchOrderStatistics(); // 통계 업데이트
      alert('주문이 삭제되었습니다.');
    } catch (err) {
      console.error('주문 삭제 실패:', err);
      alert('주문 삭제에 실패했습니다.');
    }
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: '대기중',
      processing: '처리중',
      shipped: '배송중',
      delivered: '배송완료',
      cancelled: '취소됨'
    };
    return labels[status] || status;
  };

  const getStatusClass = (status) => {
    const classes = {
      pending: 'status-pending',
      processing: 'status-processing',
      shipped: 'status-shipped',
      delivered: 'status-delivered',
      cancelled: 'status-cancelled'
    };
    return classes[status] || '';
  };

  // 필터링 및 검색
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      filterType === 'all' || user.user_type === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.orderNumber.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      (order.user && order.user.name && order.user.name.toLowerCase().includes(orderSearchTerm.toLowerCase())) ||
      (order.shippingAddress && order.shippingAddress.name && order.shippingAddress.name.toLowerCase().includes(orderSearchTerm.toLowerCase()));
    
    const matchesFilter = 
      orderStatusFilter === 'all' || order.status === orderStatusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const isLoading = activeTab === 'users' ? userLoading : orderLoading;
  const error = activeTab === 'users' ? userError : orderError;

  if (isLoading) {
    return (
      <div className="admin-container">
        <div className="admin-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div className="admin-header-top">
          <div>
            <h1>관리자 페이지</h1>
            <p className="admin-subtitle">
              {activeTab === 'users' ? '사용자 관리' : '주문 관리'}
            </p>
          </div>
        </div>
        <div className="admin-tabs">
          <button
            className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            사용자 관리
          </button>
          <button
            className={`admin-tab ${activeTab === 'products' ? 'active' : ''}`}
            onClick={() => navigate(ROUTES.PRODUCT_MANAGE)}
          >
            상품 관리
          </button>
          <button
            className={`admin-tab ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            주문 관리
          </button>
        </div>
      </div>

      {error && (
        <div className="admin-error">
          {error}
        </div>
      )}

      {activeTab === 'users' ? (
        <>

      <div className="admin-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="이름 또는 이메일로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            전체
          </button>
          <button
            className={`filter-btn ${filterType === 'customer' ? 'active' : ''}`}
            onClick={() => setFilterType('customer')}
          >
            고객
          </button>
          <button
            className={`filter-btn ${filterType === 'admin' ? 'active' : ''}`}
            onClick={() => setFilterType('admin')}
          >
            관리자
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchUsers}>
          새로고침
        </button>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <div className="stat-value">{users.length}</div>
          <div className="stat-label">전체 사용자</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.user_type === 'customer').length}</div>
          <div className="stat-label">고객</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{users.filter(u => u.user_type === 'admin').length}</div>
          <div className="stat-label">관리자</div>
        </div>
      </div>

      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>타입</th>
              <th>주소</th>
              <th>가입일</th>
              <th>로그인 방식</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  {searchTerm || filterType !== 'all' 
                    ? '검색 결과가 없습니다.' 
                    : '사용자가 없습니다.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user._id}>
                  {editingUser === user._id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.user_type}
                          onChange={(e) => setEditForm({ ...editForm, user_type: e.target.value })}
                          className="edit-select"
                        >
                          <option value="customer">고객</option>
                          <option value="admin">관리자</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="edit-input"
                          placeholder="주소"
                        />
                      </td>
                      <td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td>{user.provider || 'local'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="save-btn"
                            onClick={() => handleUpdate(user._id)}
                          >
                            저장
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={handleCancelEdit}
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`user-type-badge ${user.user_type}`}>
                          {user.user_type === 'admin' ? '관리자' : '고객'}
                        </span>
                      </td>
                      <td>{user.address || '-'}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <span className="provider-badge">{user.provider || 'local'}</span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(user)}
                          >
                            수정
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(user._id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
        </>
      ) : (
        <>
          <div className="admin-controls">
            <div className="search-box">
              <input
                type="text"
                placeholder="주문번호, 고객명으로 검색..."
                value={orderSearchTerm}
                onChange={(e) => setOrderSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-buttons">
              <button
                className={`filter-btn ${orderStatusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('all')}
              >
                전체
              </button>
              <button
                className={`filter-btn ${orderStatusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('pending')}
              >
                대기중
              </button>
              <button
                className={`filter-btn ${orderStatusFilter === 'processing' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('processing')}
              >
                처리중
              </button>
              <button
                className={`filter-btn ${orderStatusFilter === 'shipped' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('shipped')}
              >
                배송중
              </button>
              <button
                className={`filter-btn ${orderStatusFilter === 'delivered' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('delivered')}
              >
                배송완료
              </button>
              <button
                className={`filter-btn ${orderStatusFilter === 'cancelled' ? 'active' : ''}`}
                onClick={() => setOrderStatusFilter('cancelled')}
              >
                취소됨
              </button>
            </div>
            <button className="refresh-btn" onClick={fetchOrders}>
              새로고침
            </button>
          </div>

          {orderStatistics && (
            <div className="admin-stats">
              <div className="stat-card">
                <div className="stat-value">{orderStatistics.totalOrders}</div>
                <div className="stat-label">전체 주문</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{orderStatistics.pendingOrders}</div>
                <div className="stat-label">대기중</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{orderStatistics.processingOrders}</div>
                <div className="stat-label">처리중</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{orderStatistics.shippedOrders}</div>
                <div className="stat-label">배송중</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{orderStatistics.deliveredOrders}</div>
                <div className="stat-label">배송완료</div>
              </div>
              <div className="stat-card revenue-card">
                <div className="stat-value">{orderStatistics.totalRevenue.toLocaleString()}</div>
                <div className="stat-label">총 매출 (원)</div>
              </div>
            </div>
          )}

          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>주문번호</th>
                  <th>고객명</th>
                  <th>상품</th>
                  <th>총 금액</th>
                  <th>주문 상태</th>
                  <th>결제 상태</th>
                  <th>주문일</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {orderSearchTerm || orderStatusFilter !== 'all' 
                        ? '검색 결과가 없습니다.' 
                        : '주문이 없습니다.'}
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map(order => (
                    <tr key={order._id}>
                      <td>{order.orderNumber}</td>
                      <td>
                        {order.user ? order.user.name : order.shippingAddress?.name || '-'}
                      </td>
                      <td>
                        <div className="order-items">
                          {order.items && order.items.length > 0 ? (
                            <>
                              {order.items.slice(0, 2).map((item, idx) => (
                                <div key={idx} className="order-item">
                                  {item.product ? (
                                    <>
                                      {item.product.images && item.product.images.length > 0 && (
                                        <img 
                                          src={item.product.images[0]} 
                                          alt={item.product.name}
                                          className="order-item-thumbnail"
                                        />
                                      )}
                                      <span>{item.product.name} x{item.quantity}</span>
                                    </>
                                  ) : (
                                    <span>상품 정보 없음 x{item.quantity}</span>
                                  )}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="order-item-more">+{order.items.length - 2}개 더</div>
                              )}
                            </>
                          ) : (
                            <span>-</span>
                          )}
                        </div>
                      </td>
                      <td>{order.totalAmount.toLocaleString()}원</td>
                      <td>
                        <select
                          value={order.status}
                          onChange={(e) => handleUpdateOrderStatus(order._id, e.target.value)}
                          className={`status-select ${getStatusClass(order.status)}`}
                        >
                          <option value="pending">대기중</option>
                          <option value="processing">처리중</option>
                          <option value="shipped">배송중</option>
                          <option value="delivered">배송완료</option>
                          <option value="cancelled">취소됨</option>
                        </select>
                      </td>
                      <td>
                        <span className={`payment-status-badge ${order.paymentStatus}`}>
                          {order.paymentStatus === 'pending' ? '대기중' :
                           order.paymentStatus === 'completed' ? '완료' :
                           order.paymentStatus === 'failed' ? '실패' :
                           order.paymentStatus === 'refunded' ? '환불' : order.paymentStatus}
                        </span>
                      </td>
                      <td>{new Date(order.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="delete-btn"
                            onClick={() => handleDeleteOrder(order._id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Admin;

