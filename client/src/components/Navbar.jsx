import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './Navbar.css';

const Navbar = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const dropdownRef = useRef(null);

  // 장바구니 개수 계산 함수 (서버 API 사용)
  const calculateCartCount = async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await api.get(API_ENDPOINTS.CART);
      if (response.data && response.data.cart) {
        setCartCount(response.data.cart.totalItems || 0);
      }
    } catch (err) {
      // 인증 오류가 아닌 경우에만 에러 로그
      if (err.response?.status !== 401) {
        console.error('장바구니 개수 조회 실패:', err);
      }
      setCartCount(0);
    }
  };

  // 찜한 상품 개수 계산 함수 (사용자별)
  const calculateLikeCount = () => {
    if (!user || !user._id) {
      setLikeCount(0);
      return;
    }

    const storageKey = `likedProducts_${user._id}`;
    const savedLikes = localStorage.getItem(storageKey);
    if (savedLikes) {
      try {
        const likedArray = JSON.parse(savedLikes);
        setLikeCount(likedArray.length);
      } catch (err) {
        console.error('찜한 상품 목록 파싱 에러:', err);
        setLikeCount(0);
      }
    } else {
      setLikeCount(0);
    }
  };

  // 초기 로드 시 저장된 사용자 정보 및 장바구니 읽기
  useEffect(() => {
    const loadStoredUser = () => {
      const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser);
          setUser(userData);
          // 사용자 정보가 로드된 후 찜한 상품 개수 계산
          setTimeout(() => {
            const storageKey = `likedProducts_${userData._id}`;
            const savedLikes = localStorage.getItem(storageKey);
            if (savedLikes) {
              try {
                const likedArray = JSON.parse(savedLikes);
                setLikeCount(likedArray.length);
              } catch (err) {
                console.error('찜한 상품 목록 파싱 에러:', err);
                setLikeCount(0);
              }
            } else {
              setLikeCount(0);
            }
          }, 0);
        } catch (error) {
          console.error('사용자 정보 파싱 에러:', error);
        }
      } else {
        setLikeCount(0);
      }
    };

    loadStoredUser();
    calculateCartCount();
  }, []);

  // 사용자 정보가 업데이트될 때 장바구니 개수와 찜한 상품 개수도 업데이트
  useEffect(() => {
    if (user) {
      calculateCartCount();
      calculateLikeCount();
    } else {
      setCartCount(0);
      setLikeCount(0);
    }
  }, [user]);

  // 사용자 정보 가져오기 및 업데이트
  useEffect(() => {
    const fetchUserInfo = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (!token) {
        setUser(null);
        return;
      }

      try {
        const response = await api.get(API_ENDPOINTS.AUTH_ME);
        if (response.data && response.data.user) {
          setUser(response.data.user);
          // 최신 사용자 정보를 저장소에 업데이트
          const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
          storage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (error) {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setUser(null);
        }
      }
    };

    fetchUserInfo();
  }, []);

  // storage 이벤트 리스너 (다른 탭에서 로그인/로그아웃 시 동기화)
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'token') {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
        
        if (token && storedUser) {
          try {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } catch (error) {
            console.error('사용자 정보 파싱 에러:', error);
          }
        } else {
          setUser(null);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // 커스텀 이벤트 리스너 (같은 탭에서 로그인 시 즉시 업데이트)
  useEffect(() => {
    const handleUserUpdate = (e) => {
      if (e.detail && e.detail.user) {
        setUser(e.detail.user);
      }
    };

    window.addEventListener('userUpdated', handleUserUpdate);
    return () => window.removeEventListener('userUpdated', handleUserUpdate);
  }, []);

  // 장바구니 업데이트 이벤트 리스너
  useEffect(() => {
    const handleCartUpdate = () => {
      // 서버에서 최신 장바구니 정보 가져오기
      calculateCartCount();
    };

    // 커스텀 이벤트 리스너 (같은 탭)
    window.addEventListener('cartUpdated', handleCartUpdate);
    
    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  // 찜하기 업데이트 이벤트 리스너
  useEffect(() => {
    const handleLikesUpdate = (e) => {
      // 현재 사용자의 찜한 상품만 업데이트
      if (user && user._id) {
        if (e.detail && typeof e.detail.count === 'number') {
          // 이벤트에서 전달된 count가 현재 사용자의 것인지 확인
          // (다른 사용자의 이벤트일 수 있으므로 다시 계산)
          calculateLikeCount();
        } else {
          calculateLikeCount();
        }
      } else {
        setLikeCount(0);
      }
    };

    // 커스텀 이벤트 리스너
    window.addEventListener('likesUpdated', handleLikesUpdate);
    
    // storage 이벤트 리스너 (다른 탭에서 업데이트 시)
    const handleStorageChange = (e) => {
      // 사용자별 찜한 상품 키 패턴 확인
      if (user && user._id && e.key && e.key === `likedProducts_${user._id}`) {
        calculateLikeCount();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('likesUpdated', handleLikesUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  const handleOrdersClick = () => {
    setDropdownOpen(false);
    navigate(ROUTES.ORDERS);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    setUser(null);
    setDropdownOpen(false);
    navigate(ROUTES.LOGIN);
  };

  return (
    <header className="header">
      <nav className="nav">
        <Link to="/" className="logo">
          The Leo shop
        </Link>
        <div className="nav-links">
          <Link to="/">카테고리</Link>
          <Link to="/">브랜드</Link>
          <Link to="/">아울렛</Link>
          <Link to="/">매거진</Link>
          <Link to="/">TOP 100</Link>
        </div>
        <div className="nav-icons">
          {user && user.user_type === 'admin' && (
            <Link to={ROUTES.ADMIN} className="admin-button">
              Admin
            </Link>
          )}
          <button className="icon-button" aria-label="검색">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
          </button>
          {user ? (
            <div className="user-menu-container" ref={dropdownRef}>
              <button 
                className="icon-button user-button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                aria-label="사용자 메뉴"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              </button>
              {dropdownOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-user-info">
                    <p className="user-name">{user.name}님</p>
                    <p className="user-email">{user.email}</p>
                  </div>
                  <button className="dropdown-item" onClick={handleOrdersClick}>
                    내 주문목록
                  </button>
                  <button className="dropdown-item logout-button" onClick={handleLogout}>
                    로그아웃
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to={ROUTES.LOGIN} className="icon-button" aria-label="로그인">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </Link>
          )}
          <button 
            className="icon-button cart-button" 
            aria-label="장바구니"
            onClick={() => navigate(ROUTES.CART)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="9" cy="21" r="1"></circle>
              <circle cx="20" cy="21" r="1"></circle>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
            </svg>
            {cartCount > 0 && (
              <span className="cart-badge">{cartCount}</span>
            )}
          </button>
          <button 
            className="icon-button like-button" 
            aria-label="좋아요"
            onClick={() => navigate(ROUTES.WISHLIST)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
            </svg>
            {likeCount > 0 && (
              <span className="like-badge">{likeCount}</span>
            )}
          </button>
        </div>
      </nav>
    </header>
  );
};

export default Navbar;

