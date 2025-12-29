import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './Cart.css';

const Cart = () => {
  const navigate = useNavigate();
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(API_ENDPOINTS.CART);
      setCart(response.data.cart);
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

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      return;
    }

    try {
      const response = await api.put(`${API_ENDPOINTS.CART}/items/${itemId}`, {
        quantity: newQuantity
      });
      setCart(response.data.cart);
      
      // 장바구니 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('cartUpdated'));
    } catch (err) {
      console.error('수량 업데이트 실패:', err);
      alert('수량 업데이트에 실패했습니다.');
    }
  };

  const handleRemoveItem = async (itemId) => {
    if (!window.confirm('정말 이 상품을 장바구니에서 제거하시겠습니까?')) {
      return;
    }

    try {
      const response = await api.delete(`${API_ENDPOINTS.CART}/items/${itemId}`);
      setCart(response.data.cart);
      
      // 장바구니 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      alert('장바구니에서 제거되었습니다.');
    } catch (err) {
      console.error('아이템 제거 실패:', err);
      alert('아이템 제거에 실패했습니다.');
    }
  };

  const handleClearCart = async () => {
    if (!window.confirm('정말 장바구니를 비우시겠습니까?')) {
      return;
    }

    try {
      const response = await api.delete(API_ENDPOINTS.CART);
      setCart(response.data.cart);
      
      // 장바구니 업데이트 이벤트 발생
      window.dispatchEvent(new CustomEvent('cartUpdated'));
      alert('장바구니가 비워졌습니다.');
    } catch (err) {
      console.error('장바구니 비우기 실패:', err);
      alert('장바구니 비우기에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="cart-container">
        <div className="cart-loading">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="cart-container">
        <div className="cart-error">{error}</div>
      </div>
    );
  }

  const items = cart?.items || [];
  const totalAmount = cart?.totalAmount || 0;
  const totalItems = cart?.totalItems || 0;

  return (
    <div className="cart-container">
      <div className="cart-header">
        <h1>장바구니</h1>
        <button className="back-button" onClick={() => navigate(-1)}>
          ← 뒤로가기
        </button>
      </div>

      {items.length === 0 ? (
        <div className="cart-empty">
          <div className="empty-icon">🛒</div>
          <h2>장바구니가 비어있습니다</h2>
          <p>상품을 추가해보세요!</p>
          <Link to={ROUTES.HOME} className="shop-button">
            쇼핑하러 가기
          </Link>
        </div>
      ) : (
        <>
          <div className="cart-content">
            <div className="cart-items">
              <div className="cart-items-header">
                <h2>상품 ({totalItems}개)</h2>
                <button className="clear-cart-button" onClick={handleClearCart}>
                  전체 삭제
                </button>
              </div>
              
              <div className="cart-items-list">
                {items.map((item) => (
                  <div key={item._id} className="cart-item">
                    <div className="cart-item-image">
                      {item.product?.images && item.product.images.length > 0 ? (
                        <img 
                          src={item.product.images[0]} 
                          alt={item.product.name}
                          onClick={() => navigate(ROUTES.PRODUCT_DETAIL_BY_ID(item.product._id))}
                        />
                      ) : (
                        <div className="no-image">이미지 없음</div>
                      )}
                    </div>
                    
                    <div className="cart-item-info">
                      <h3 
                        className="cart-item-name"
                        onClick={() => navigate(ROUTES.PRODUCT_DETAIL_BY_ID(item.product._id))}
                      >
                        {item.product?.name || '상품 정보 없음'}
                      </h3>
                      <p className="cart-item-sku">SKU: {item.product?.sku || '-'}</p>
                      <p className="cart-item-price">
                        ₩{item.product?.price ? (item.product.price * item.quantity).toLocaleString() : 0}
                      </p>
                    </div>

                    <div className="cart-item-actions">
                      <div className="quantity-controls">
                        <button
                          className="quantity-btn"
                          onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                          disabled={item.quantity <= 1}
                        >
                          −
                        </button>
                        <span className="quantity-value">{item.quantity}</span>
                        <button
                          className="quantity-btn"
                          onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                        >
                          +
                        </button>
                      </div>
                      <button
                        className="remove-item-button"
                        onClick={() => handleRemoveItem(item._id)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="cart-summary">
              <h2>주문 요약</h2>
              <div className="summary-row">
                <span>상품 개수</span>
                <span>{totalItems}개</span>
              </div>
              <div className="summary-row">
                <span>상품 금액</span>
                <span>₩{totalAmount.toLocaleString()}</span>
              </div>
              <div className="summary-row total">
                <span>총 결제금액</span>
                <span>₩{totalAmount.toLocaleString()}</span>
              </div>
              <button 
                className="checkout-button"
                onClick={() => navigate(ROUTES.CHECKOUT)}
              >
                주문하기
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Cart;

