import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import { GoogleIcon, FacebookIcon, AppleIcon } from '../components/SocialIcons';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // 이미 로그인되어 있는지 확인
  useEffect(() => {
    const checkAuth = async () => {
      // 토큰 확인 (localStorage 또는 sessionStorage)
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      
      if (!token) {
        setCheckingAuth(false);
        return;
      }

      try {
        // 토큰으로 유저 정보 가져오기
        const response = await api.get(API_ENDPOINTS.AUTH_ME);
        if (response.data && response.data.user) {
          // 이미 로그인되어 있으면 메인 페이지로 리다이렉트
          navigate('/', { replace: true });
        }
      } catch (error) {
        // 토큰이 유효하지 않으면 저장소에서 제거
        console.error('인증 확인 실패:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, [navigate]);

  const handleAppleSignIn = async () => {
    try {
      // Apple Sign In은 Apple JS SDK를 사용해야 합니다
      if (typeof window.AppleID === 'undefined') {
        setError('Apple Sign In SDK가 로드되지 않았습니다. Apple Developer 설정이 필요합니다.');
        return;
      }

      const response = await window.AppleID.auth.signIn({
        requestedScopes: ['name', 'email']
      });

      if (response && response.id_token) {
        // 서버로 identity token 전송
        const serverResponse = await api.post(API_ENDPOINTS.APPLE_LOGIN, {
          identityToken: response.id_token,
          user: response.user
        });

        if (serverResponse.data && serverResponse.data.token) {
          // 로그인 상태 유지 체크박스에 따라 저장 방식 선택
          if (rememberMe) {
            localStorage.setItem('token', serverResponse.data.token);
            if (serverResponse.data.user) {
              localStorage.setItem('user', JSON.stringify(serverResponse.data.user));
            }
          } else {
            sessionStorage.setItem('token', serverResponse.data.token);
            if (serverResponse.data.user) {
              sessionStorage.setItem('user', JSON.stringify(serverResponse.data.user));
            }
          }
          
          // 사용자 정보 업데이트 이벤트 발생
          if (serverResponse.data.user) {
            window.dispatchEvent(new CustomEvent('userUpdated', {
              detail: { user: serverResponse.data.user }
            }));
          }
          
          alert('Apple 로그인에 성공했습니다!');
          navigate('/');
        }
      }
    } catch (err) {
      console.error('Apple 로그인 에러:', err);
      if (err.response) {
        setError(err.response.data?.message || 'Apple 로그인 중 오류가 발생했습니다.');
      } else {
        setError('Apple 로그인을 사용할 수 없습니다. Apple Developer 설정이 필요합니다.');
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 필수 필드 검증
      if (!formData.email || !formData.password) {
        setError('이메일과 비밀번호를 입력해주세요.');
        setLoading(false);
        return;
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        setError('올바른 이메일 형식을 입력해주세요.');
        setLoading(false);
        return;
      }

      // 서버에 로그인 요청
      // POST /api/auth/login 엔드포인트로 요청
      const response = await api.post(API_ENDPOINTS.LOGIN, {
        email: formData.email,
        password: formData.password
      });
      
      // 로그인 성공
      if (response.data && response.data.token) {
        // 로그인 상태 유지 체크박스에 따라 저장 방식 선택
        if (rememberMe) {
          // 체크 시: localStorage에 저장 (브라우저 종료 후에도 유지)
          localStorage.setItem('token', response.data.token);
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } else {
          // 미체크 시: sessionStorage에 저장 (브라우저 탭 종료 시 삭제)
          sessionStorage.setItem('token', response.data.token);
          if (response.data.user) {
            sessionStorage.setItem('user', JSON.stringify(response.data.user));
          }
        }
        
        // 사용자 정보 업데이트 이벤트 발생 (Layout 컴포넌트에서 즉시 반영)
        window.dispatchEvent(new CustomEvent('userUpdated', {
          detail: { user: response.data.user }
        }));
        
        console.log('로그인 성공:', response.data.user);
        alert('로그인에 성공했습니다!');
        navigate('/');
      }
    } catch (err) {
      // 서버 에러 처리
      console.error('로그인 에러:', err);
      console.error('에러 상세:', {
        response: err.response,
        request: err.request,
        message: err.message
      });
      
      if (err.response) {
        // 서버에서 반환한 에러 메시지
        const errorMessage = err.response.data?.message || err.response.data?.error || '로그인 중 오류가 발생했습니다.';
        console.log('서버 에러 메시지:', errorMessage);
        setError(errorMessage);
      } else if (err.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        setError(`서버에 연결할 수 없습니다. (${apiUrl})\n서버가 실행 중인지 확인해주세요.`);
      } else {
        // 요청 설정 중 에러 발생
        setError('로그인 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 인증 확인 중이면 로딩 표시
  if (checkingAuth) {
    return (
      <div className="login-container">
        <div className="login-card">
          <p>인증 확인 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>로그인</h1>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">이메일 *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="example@email.com"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호 *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="비밀번호를 입력하세요"
              autoComplete="current-password"
            />
          </div>

          <div className="form-group remember-me">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>로그인 상태 유지</span>
            </label>
            <Link to={ROUTES.FORGOT_PASSWORD} className="forgot-password-link">
              비밀번호 찾기
            </Link>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>

          <div className="social-login-section">
            <div className="divider">
              <span>또는</span>
            </div>
            <div className="social-buttons">
              <a 
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/social/google`}
                className="social-button google"
              >
                <GoogleIcon /> Google로 로그인
              </a>
              <a 
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/social/facebook`}
                className="social-button facebook"
              >
                <FacebookIcon /> Facebook으로 로그인
              </a>
              <button
                type="button"
                onClick={handleAppleSignIn}
                className="social-button apple"
              >
                <AppleIcon /> Apple로 로그인
              </button>
            </div>
          </div>

          <div className="login-footer">
            <p>
              계정이 없으신가요?{' '}
              <Link to={ROUTES.SIGNUP} className="signup-link">
                회원가입
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Login;

