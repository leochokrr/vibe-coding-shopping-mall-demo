import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { API_ENDPOINTS, ROUTES } from '../utils/constants';
import './ForgotPassword.css';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setEmail(e.target.value);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    try {
      // 이메일 필수 검증
      if (!email) {
        setError('이메일을 입력해주세요.');
        setLoading(false);
        return;
      }

      // 이메일 형식 검증
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        setError('올바른 이메일 형식을 입력해주세요.');
        setLoading(false);
        return;
      }

      // 서버에 비밀번호 찾기 요청
      const response = await api.post(API_ENDPOINTS.FORGOT_PASSWORD, {
        email: email.toLowerCase()
      });
      
      // 성공
      if (response.data) {
        setSuccess(true);
        console.log('비밀번호 찾기 요청 성공:', response.data);
      }
    } catch (err) {
      console.error('비밀번호 찾기 에러:', err);
      
      if (err.response) {
        const errorMessage = err.response.data?.message || '비밀번호 찾기 중 오류가 발생했습니다.';
        setError(errorMessage);
      } else if (err.request) {
        setError('서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.');
      } else {
        setError('비밀번호 찾기 요청 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="forgot-password-container">
      <div className="forgot-password-card">
        <h1>비밀번호 찾기</h1>
        {success ? (
          <div className="success-message">
            <p>비밀번호 재설정 링크가 이메일로 전송되었습니다.</p>
            <p className="success-sub">이메일을 확인하여 비밀번호를 재설정해주세요.</p>
            <Link to={ROUTES.LOGIN} className="back-to-login">
              로그인 페이지로 돌아가기
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="forgot-password-form">
            <p className="description">
              가입하신 이메일 주소를 입력하시면<br />
              비밀번호 재설정 링크를 보내드립니다.
            </p>
            
            <div className="form-group">
              <label htmlFor="email">이메일 *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                required
                placeholder="example@email.com"
                autoComplete="email"
              />
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? '처리 중...' : '비밀번호 재설정 링크 보내기'}
            </button>

            <div className="forgot-password-footer">
              <Link to={ROUTES.LOGIN} className="back-link">
                ← 로그인 페이지로 돌아가기
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;

