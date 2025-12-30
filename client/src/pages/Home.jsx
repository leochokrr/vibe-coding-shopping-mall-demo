import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import HeroBanner from '../components/HeroBanner';
import './Home.css';

const Home = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likedProducts, setLikedProducts] = useState(new Set());
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

  // localStorage에서 찜한 상품 목록 불러오기 (사용자별)
  useEffect(() => {
    if (userId) {
      const storageKey = `likedProducts_${userId}`;
      const savedLikes = localStorage.getItem(storageKey);
      if (savedLikes) {
        try {
          const likedArray = JSON.parse(savedLikes);
          setLikedProducts(new Set(likedArray));
        } catch (err) {
          console.error('찜한 상품 목록 파싱 에러:', err);
        }
      } else {
        setLikedProducts(new Set());
      }
    } else {
      setLikedProducts(new Set());
    }
  }, [userId]);

  // 찜하기 토글 함수
  const toggleLike = (productId, e) => {
    e.stopPropagation();
    
    if (!userId) {
      alert('로그인이 필요합니다.');
      navigate(ROUTES.LOGIN);
      return;
    }

    const newLikedProducts = new Set(likedProducts);
    
    if (newLikedProducts.has(productId)) {
      newLikedProducts.delete(productId);
    } else {
      newLikedProducts.add(productId);
    }
    
    setLikedProducts(newLikedProducts);
    
    // localStorage에 사용자별로 저장
    const storageKey = `likedProducts_${userId}`;
    const likedArray = Array.from(newLikedProducts);
    localStorage.setItem(storageKey, JSON.stringify(likedArray));
    
    // Navbar에 업데이트 알림
    window.dispatchEvent(new CustomEvent('likesUpdated', { 
      detail: { count: newLikedProducts.size } 
    }));
  };

  // 상품 데이터 가져오기
  useEffect(() => {
    fetchAllProducts();
  }, []);

  const fetchAllProducts = async () => {
      try {
      setLoading(true);
      setError('');
      
      // 전체 상품을 가져오기 위해 limit를 매우 크게 설정
      // 서버에서 페이지네이션을 지원하므로 limit를 크게 설정하여 전체 데이터 가져오기
      let allProducts = [];
      let currentPage = 1;
      let hasMore = true;
      const limit = 1000; // 한 번에 1000개씩 가져오기 (대부분의 경우 한 번에 모든 데이터 가져옴)

      // 모든 페이지를 순회하며 데이터 가져오기
      while (hasMore) {
        const response = await api.get(API_ENDPOINTS.PRODUCTS, {
          params: {
            page: currentPage,
            limit: limit
          }
        });

        if (response.data && response.data.products) {
          // 페이지네이션 형식의 응답
          allProducts = [...allProducts, ...response.data.products];
          hasMore = response.data.pagination.hasNextPage;
          currentPage++;
        } else if (Array.isArray(response.data)) {
          // 배열 형식의 응답 (이전 API 형식)
          allProducts = response.data;
          hasMore = false;
        } else {
          hasMore = false;
        }
      }

      setProducts(allProducts);
      console.log(`총 ${allProducts.length}개의 상품을 불러왔습니다.`);
    } catch (err) {
      console.error('상품 데이터 가져오기 실패:', err);
      let errorMessage = '상품 데이터를 불러오는데 실패했습니다.';
      
      if (err.response) {
        // 서버가 응답했지만 에러 상태 코드
        errorMessage += ` (${err.response.status}: ${err.response.statusText})`;
        if (err.response.data?.message) {
          errorMessage += ` - ${err.response.data.message}`;
        }
      } else if (err.request) {
        // 요청은 보냈지만 응답을 받지 못함
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        errorMessage += `\n서버에 연결할 수 없습니다. (${apiUrl})`;
        errorMessage += '\n서버가 실행 중인지 확인해주세요.';
      } else {
        // 요청 설정 중 에러
        errorMessage += `\n${err.message}`;
      }
      
      setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

  return (
    <div className="home">
      {/* Hero Banner */}
      <HeroBanner />

      {/* New Arrivals Section */}
      <section className="section new-arrivals">
        <div className="section-header">
          <h2 className="section-title">새로 들어온 신상품</h2>
          <div className="category-filters">
            <button className="filter-btn active">여성</button>
            <button className="filter-btn">남성</button>
            <button className="filter-btn">라이프스타일</button>
          </div>
        </div>
        <div className="product-carousel">
          <button className="carousel-arrow left-arrow"><span>‹</span></button>
          <div className="product-grid">
        {loading ? (
              <div className="loading-message">로딩 중...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : products.length > 0 ? (
              products.slice(0, 5).map((product) => (
                <div 
                  key={product._id} 
                  className="product-card"
                  onClick={() => navigate(`/products/${product._id}`)}
                >
                  <div className="product-image">
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
                      className={`like-btn ${likedProducts.has(product._id) ? 'liked' : ''}`}
                      onClick={(e) => toggleLike(product._id, e)}
                    >
                      {likedProducts.has(product._id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <div className="product-info">
                    <p className="product-name">{product.name}</p>
                    <p className="product-price">₩{product.price.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-products-message">상품이 없습니다.</div>
            )}
          </div>
          <button className="carousel-arrow right-arrow"><span>›</span></button>
        </div>
      </section>

      {/* Promotional Banner */}
      <section className="promo-banner">
        <div className="promo-content">
          <h3>아낌없이 드리는 신규회원 혜택</h3>
          <p>즉시 20% 쿠폰 + 첫 구매 1만원 할인</p>
        </div>
        <div className="promo-cards">
          <div className="promo-card red">SALE</div>
          <div className="promo-card white">COUPON</div>
          <div className="promo-card blue">NEW</div>
        </div>
      </section>

      {/* Popular Products Section */}
      <section className="section popular-products">
        <div className="section-header">
          <h2 className="section-title">구매가 많은 인기상품</h2>
          <div className="category-filters">
            <button className="filter-btn active">전체</button>
            <button className="filter-btn">여성</button>
            <button className="filter-btn">남성</button>
            <button className="filter-btn">잡화</button>
            <button className="filter-btn">슈즈</button>
            <button className="filter-btn">라이프스타일</button>
          </div>
        </div>
        <div className="product-carousel">
          <button className="carousel-arrow left-arrow"><span>‹</span></button>
          <div className="product-grid">
            {loading ? (
              <div className="loading-message">로딩 중...</div>
            ) : error ? (
              <div className="error-message">{error}</div>
            ) : products.length > 0 ? (
              products.slice(0, 6).map((product) => (
                <div 
                  key={product._id} 
                  className="product-card"
                  onClick={() => navigate(`/products/${product._id}`)}
                >
                  <div className="product-image">
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
                      className={`like-btn ${likedProducts.has(product._id) ? 'liked' : ''}`}
                      onClick={(e) => toggleLike(product._id, e)}
                    >
                      {likedProducts.has(product._id) ? '♥' : '♡'}
                    </button>
                  </div>
                  <div className="product-info">
                    <p className="product-name">{product.name}</p>
                    <p className="product-price">₩{product.price.toLocaleString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-products-message">상품이 없습니다.</div>
        )}
      </div>
          <button className="carousel-arrow right-arrow"><span>›</span></button>
        </div>
      </section>

      {/* Magazine Section */}
      <section className="section magazine">
        <div className="section-header">
          <h2 className="section-title">THE 매거진</h2>
          <div className="category-filters">
            <button className="filter-btn active">전체</button>
            <button className="filter-btn">커버스토리</button>
            <button className="filter-btn">스타일 가이드</button>
            <button className="filter-btn">셀렉션</button>
            <button className="filter-btn">에디터</button>
            <button className="filter-btn">#SOME</button>
            <button className="filter-btn">#SOME's Closet</button>
            <button className="filter-btn">뉴스</button>
          </div>
        </div>
        <div className="magazine-grid">
          <div className="magazine-item">
            <div className="magazine-image"></div>
            <p className="magazine-title">니트에 관한 떠서</p>
          </div>
          <div className="magazine-item">
            <div className="magazine-image"></div>
            <p className="magazine-title">HOLIDAY 하우스 오브 흘리네이</p>
          </div>
          <div className="magazine-item">
            <div className="magazine-image"></div>
            <p className="magazine-title">HOLIDAY 시세기 인티 기프트</p>
          </div>
          <div className="magazine-item">
            <div className="magazine-image"></div>
            <p className="magazine-title">더욱 특정한 연발을 위한 10% & 1만원 추가 혜이</p>
          </div>
        </div>
      </section>

      {/* Exhibition Section */}
      <section className="section exhibition">
        <div className="section-header">
          <h2 className="section-title">놓쳐서는 안될 신규 기획전</h2>
        </div>
        <div className="exhibition-grid">
          <div className="exhibition-item">
            <div className="exhibition-image"></div>
            <p className="exhibition-title">LANVIN BLANC : GIFT SELECTION</p>
          </div>
          <div className="exhibition-item">
            <div className="exhibition-image">
              <div className="exhibition-badge">SALE up to -50%</div>
            </div>
            <p className="exhibition-title">SELECTED SALE</p>
          </div>
          <div className="exhibition-item">
            <div className="exhibition-image"></div>
            <p className="exhibition-title">ADIDAS X WILLY CHAVARRIA 26SS</p>
          </div>
        </div>
      </section>

      {/* Hot Keywords Section */}
      <section className="section hot-keywords">
        <div className="section-header">
          <h2 className="section-title">지금 핫한 키워드</h2>
        </div>
        <div className="keywords-container">
          <div className="keywords-grid">
            {['니트', '코트', '패딩', '원피스', '가디건', '자켓', '블라우스', '팬츠', '스커트', '데님', '캐시미어', '무스탕', '트위드', '베스트', '머플러', '부츠', '스니커즈', '가방', '지갑', '주얼리', '모자', '장갑', '양말', '벨트', '선글라스', '향수', '캔들', '디퓨저', '홈웨어', '침구', '가구', '조명', '식기', '인테리어', '반려동물'].map((keyword) => (
              <button key={keyword} className="keyword-tag">
                {keyword}
              </button>
            ))}
          </div>
          <div className="keywords-carousel">
            <button className="carousel-arrow left-arrow"><span>‹</span></button>
            <div className="keywords-products">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="product-card">
                  <div className="product-image"></div>
                </div>
              ))}
            </div>
            <button className="carousel-arrow right-arrow"><span>›</span></button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
