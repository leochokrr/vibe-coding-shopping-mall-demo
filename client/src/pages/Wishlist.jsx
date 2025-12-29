import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './Wishlist.css';

const Wishlist = () => {
  const navigate = useNavigate();
  const [likedProductIds, setLikedProductIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userId, setUserId] = useState(null);

  // 사용자 정보 가져오기
  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUserId(userData._id);
        } catch (err) {
          console.error('사용자 정보 파싱 에러:', err);
          setUserId(null);
        }
      } else {
        setUserId(null);
      }
    };

    loadUser();

    // 사용자 정보 변경 감지
    const handleUserUpdate = () => {
      loadUser();
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    window.addEventListener('storage', handleUserUpdate);

    return () => {
      window.removeEventListener('userUpdated', handleUserUpdate);
      window.removeEventListener('storage', handleUserUpdate);
    };
  }, []);

  // localStorage에서 찜한 상품 ID 목록 불러오기 (사용자별)
  useEffect(() => {
    if (userId) {
      const storageKey = `likedProducts_${userId}`;
      const savedLikes = localStorage.getItem(storageKey);
      if (savedLikes) {
        try {
          const likedArray = JSON.parse(savedLikes);
          setLikedProductIds(likedArray);
        } catch (err) {
          console.error('찜한 상품 목록 파싱 에러:', err);
          setLikedProductIds([]);
        }
      } else {
        setLikedProductIds([]);
      }
    } else {
      setLikedProductIds([]);
    }
    setLoading(false);
  }, [userId]);

  // 찜한 상품 ID로 상품 정보 가져오기
  useEffect(() => {
    if (likedProductIds.length > 0) {
      fetchLikedProducts();
    } else {
      setLoading(false);
    }
  }, [likedProductIds]);

  const fetchLikedProducts = async () => {
    try {
      setLoading(true);
      setError('');
      
      // 각 상품 ID로 상품 정보 가져오기
      const productPromises = likedProductIds.map(productId => 
        api.get(`${API_ENDPOINTS.PRODUCTS}/${productId}`).catch(err => {
          console.error(`상품 ${productId} 조회 실패:`, err);
          return null;
        })
      );

      const responses = await Promise.all(productPromises);
      const fetchedProducts = responses
        .filter(response => response && response.data)
        .map(response => response.data);

      setProducts(fetchedProducts);
    } catch (err) {
      console.error('찜한 상품 조회 실패:', err);
      setError('찜한 상품을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 찜하기 토글 함수
  const toggleLike = (productId) => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate(ROUTES.LOGIN);
      return;
    }

    const newLikedIds = likedProductIds.filter(id => id !== productId);
    setLikedProductIds(newLikedIds);
    
    // localStorage 업데이트 (사용자별)
    const storageKey = `likedProducts_${userId}`;
    localStorage.setItem(storageKey, JSON.stringify(newLikedIds));
    
    // Navbar에 업데이트 알림
    window.dispatchEvent(new CustomEvent('likesUpdated', { 
      detail: { count: newLikedIds.length } 
    }));

    // 제품 목록에서 제거
    setProducts(products.filter(p => p._id !== productId));
  };

  // 전체 찜하기 해제
  const clearAllLikes = () => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate(ROUTES.LOGIN);
      return;
    }

    if (window.confirm('모든 찜한 상품을 해제하시겠습니까?')) {
      setLikedProductIds([]);
      setProducts([]);
      const storageKey = `likedProducts_${userId}`;
      localStorage.removeItem(storageKey);
      
      // Navbar에 업데이트 알림
      window.dispatchEvent(new CustomEvent('likesUpdated', { 
        detail: { count: 0 } 
      }));
    }
  };

  if (loading) {
    return (
      <div className="wishlist-container">
        <div className="wishlist-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="wishlist-container">
      <div className="wishlist-header">
        <h1>찜한 상품</h1>
        {products.length > 0 && (
          <button className="clear-all-button" onClick={clearAllLikes}>
            전체 해제
          </button>
        )}
      </div>

      {error && (
        <div className="wishlist-error">{error}</div>
      )}

      {products.length === 0 ? (
        <div className="wishlist-empty">
          <div className="empty-icon">♡</div>
          <h2>찜한 상품이 없습니다</h2>
          <p>마음에 드는 상품을 찜해보세요!</p>
          <button className="shop-button" onClick={() => navigate(ROUTES.HOME)}>
            쇼핑하러 가기
          </button>
        </div>
      ) : (
        <>
          <div className="wishlist-count">
            총 {products.length}개의 상품을 찜하셨습니다.
          </div>
          <div className="wishlist-grid">
            {products.map((product) => (
              <div key={product._id} className="wishlist-item">
                <div 
                  className="wishlist-item-image"
                  onClick={() => navigate(ROUTES.PRODUCT_DETAIL_BY_ID(product._id))}
                >
                  {product.images && product.images.length > 0 ? (
                    <img 
                      src={product.images[0]} 
                      alt={product.name}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="no-image-placeholder">이미지 없음</div>
                  )}
                  <button 
                    className={`like-btn ${likedProductIds.includes(product._id) ? 'liked' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLike(product._id);
                    }}
                  >
                    {likedProductIds.includes(product._id) ? '♥' : '♡'}
                  </button>
                </div>
                <div className="wishlist-item-info">
                  <h3 
                    className="wishlist-item-name"
                    onClick={() => navigate(ROUTES.PRODUCT_DETAIL_BY_ID(product._id))}
                  >
                    {product.name}
                  </h3>
                  <p className="wishlist-item-sku">SKU: {product.sku || '-'}</p>
                  <p className="wishlist-item-price">
                    ₩{product.price?.toLocaleString() || '0'}
                  </p>
                  <button 
                    className="add-to-cart-button"
                    onClick={() => navigate(ROUTES.PRODUCT_DETAIL_BY_ID(product._id))}
                  >
                    장바구니에 추가
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default Wishlist;

