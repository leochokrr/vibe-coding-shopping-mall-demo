import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS } from '../utils/constants';
import { GoogleIcon, FacebookIcon, AppleIcon } from '../components/SocialIcons';
import './Signup.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    passwordConfirm: '',
    user_type: 'customer',
    address: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAppleSignIn = async () => {
    try {
      // Apple Sign In은 Apple JS SDK를 사용해야 합니다
      // 먼저 HTML에 스크립트가 로드되어 있어야 함
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
          localStorage.setItem('token', serverResponse.data.token);
          if (serverResponse.data.user) {
            localStorage.setItem('user', JSON.stringify(serverResponse.data.user));
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
      if (!formData.email || !formData.name || !formData.password || !formData.user_type) {
        setError('이메일, 이름, 비밀번호, 사용자 유형은 필수 입력 항목입니다.');
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

      // 비밀번호 최소 길이 검증
      if (formData.password.length < 6) {
        setError('비밀번호는 최소 6자 이상이어야 합니다.');
        setLoading(false);
        return;
      }

      // 비밀번호 확인 검증
      if (formData.password !== formData.passwordConfirm) {
        setError('비밀번호가 일치하지 않습니다.');
        setLoading(false);
        return;
      }

      // user_type 검증 (서버와 동일한 검증)
      if (!['customer', 'admin'].includes(formData.user_type)) {
        setError('사용자 유형은 고객 또는 관리자만 선택 가능합니다.');
        setLoading(false);
        return;
      }

      // 서버에 회원가입 데이터 전송
      // POST /api/users 엔드포인트로 요청
      const response = await api.post(API_ENDPOINTS.USERS, {
        email: formData.email,
        name: formData.name,
        password: formData.password,
        user_type: formData.user_type,
        address: formData.address || undefined // 빈 문자열이면 undefined로 전송
      });
      
      // 회원가입 성공 - 서버에서 저장된 사용자 데이터 반환
      if (response.data) {
        console.log('회원가입 성공:', response.data);
        alert('회원가입이 완료되었습니다!');
        navigate('/');
      }
    } catch (err) {
      // 서버 에러 처리
      console.error('회원가입 에러:', err);
      
      if (err.response) {
        // 서버에서 반환한 에러 메시지
        const errorMessage = err.response.data?.message || '회원가입 중 오류가 발생했습니다.';
        setError(errorMessage);
      } else if (err.request) {
        // 요청은 보냈지만 응답을 받지 못한 경우
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        // 요청 설정 중 에러 발생
        setError('회원가입 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-container">
      <div className="signup-card">
        <h1>회원가입</h1>
        <form onSubmit={handleSubmit} className="signup-form">
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
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">이름 *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="이름을 입력하세요"
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
              placeholder="최소 6자 이상"
              minLength={6}
            />
          </div>

          <div className="form-group">
            <label htmlFor="passwordConfirm">비밀번호 확인 *</label>
            <input
              type="password"
              id="passwordConfirm"
              name="passwordConfirm"
              value={formData.passwordConfirm}
              onChange={handleChange}
              required
              placeholder="비밀번호를 다시 입력하세요"
            />
            {formData.passwordConfirm && formData.password !== formData.passwordConfirm && (
              <span className="password-mismatch">비밀번호가 일치하지 않습니다.</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="user_type">사용자 유형 *</label>
            <select
              id="user_type"
              name="user_type"
              value={formData.user_type}
              onChange={handleChange}
              required
            >
              <option value="customer">고객</option>
              <option value="admin">관리자</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="address">주소</label>
            <input
              type="text"
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              placeholder="주소를 입력하세요 (선택사항)"
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="submit-button" disabled={loading}>
            {loading ? '처리 중...' : '회원가입'}
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
                <GoogleIcon /> Google로 가입
              </a>
              <a 
                href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/auth/social/facebook`}
                className="social-button facebook"
              >
                <FacebookIcon /> Facebook으로 가입
              </a>
              <button
                type="button"
                onClick={() => handleAppleSignIn()}
                className="social-button apple"
              >
                <AppleIcon /> Apple로 가입
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Signup;

