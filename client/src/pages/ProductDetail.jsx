import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './ProductDetail.css';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get(`${API_ENDPOINTS.PRODUCTS}/${id}`);
      setProduct(response.data);
    } catch (err) {
      console.error('상품 정보 가져오기 실패:', err);
      if (err.response?.status === 404) {
        setError('상품을 찾을 수 없습니다.');
      } else {
        setError('상품 정보를 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    // 로그인 확인
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      alert('로그인이 필요합니다.');
      navigate(ROUTES.LOGIN);
      return;
    }

    try {
      // 서버 API를 통해 장바구니에 상품 추가
      const response = await api.post(`${API_ENDPOINTS.CART}/items`, {
        productId: product._id,
        quantity: 1
      });

      if (response.data) {
        // 장바구니 업데이트 이벤트 발생 (Navbar의 장바구니 개수 업데이트)
        window.dispatchEvent(new CustomEvent('cartUpdated'));
        alert('장바구니에 담겼습니다!');
      }
    } catch (err) {
      console.error('장바구니 추가 실패:', err);
      
      if (err.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate(ROUTES.LOGIN);
      } else if (err.response?.status === 404) {
        alert('상품을 찾을 수 없습니다.');
      } else {
        alert('장바구니에 담는데 실패했습니다. 다시 시도해주세요.');
      }
    }
  };

  const handleLike = () => {
    // 찜하기 기능 구현 (나중에 추가 가능)
    console.log('찜하기:', product?._id);
  };

  if (loading) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-loading">로딩 중...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-container">
        <div className="product-detail-error">
          {error || '상품을 찾을 수 없습니다.'}
          <button 
            className="back-button"
            onClick={() => navigate(ROUTES.HOME)}
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="product-detail-container">
      <button 
        className="back-button"
        onClick={() => navigate(-1)}
      >
        ← 뒤로가기
      </button>

      <div className="product-detail-content">
        {/* 이미지 섹션 */}
        <div className="product-images-section">
          {product.images && product.images.length > 0 ? (
            <>
              <div className="main-image">
                <img 
                  src={product.images[selectedImageIndex]} 
                  alt={product.name}
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="600" height="800"%3E%3Crect fill="%23ddd" width="600" height="800"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="20" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E이미지 없음%3C/text%3E%3C/svg%3E';
                  }}
                />
              </div>
              {product.images.length > 1 && (
                <div className="thumbnail-images">
                  {product.images.map((image, index) => (
                    <div
                      key={index}
                      className={`thumbnail ${selectedImageIndex === index ? 'active' : ''}`}
                      onClick={() => setSelectedImageIndex(index)}
                    >
                      <img 
                        src={image} 
                        alt={`${product.name} ${index + 1}`}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-image">
              <div className="no-image-placeholder">이미지 없음</div>
            </div>
          )}
        </div>

        {/* 상품 정보 섹션 */}
        <div className="product-info-section">
          <div className="product-header">
            <span className="product-category">{product.category}</span>
            <span className="product-sku">SKU: {product.sku}</span>
          </div>
          
          <h1 className="product-name">{product.name}</h1>
          
          <div className="product-price-section">
            <span className="product-price">₩{product.price.toLocaleString()}</span>
          </div>

          {product.description && (
            <div className="product-description">
              <h3>상품 설명</h3>
              <p>{product.description}</p>
            </div>
          )}

          <div className="product-actions">
            <button 
              className="add-to-cart-btn"
              onClick={handleAddToCart}
            >
              장바구니에 담기
            </button>
            <button 
              className="like-btn"
              onClick={handleLike}
            >
              ♡
            </button>
          </div>

          <div className="product-details">
            <div className="detail-item">
              <span className="detail-label">카테고리</span>
              <span className="detail-value">{product.category}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">SKU</span>
              <span className="detail-value">{product.sku}</span>
            </div>
            {product.createdAt && (
              <div className="detail-item">
                <span className="detail-label">등록일</span>
                <span className="detail-value">
                  {new Date(product.createdAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;

