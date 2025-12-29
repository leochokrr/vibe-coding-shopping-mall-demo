import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');
    const userParam = searchParams.get('user');
    const error = searchParams.get('error');

    if (error) {
      console.error('소셜 로그인 에러:', error);
      alert('소셜 로그인에 실패했습니다.');
      navigate('/login');
      return;
    }

    if (token) {
      // 토큰 저장 (localStorage에 저장 - 로그인 상태 유지)
      localStorage.setItem('token', token);
      
      if (userParam) {
        try {
          const user = JSON.parse(decodeURIComponent(userParam));
          localStorage.setItem('user', JSON.stringify(user));
          
          // 사용자 정보 업데이트 이벤트 발생
          window.dispatchEvent(new CustomEvent('userUpdated', {
            detail: { user: user }
          }));
        } catch (e) {
          console.error('사용자 정보 파싱 에러:', e);
        }
      }

      console.log('소셜 로그인 성공');
      alert('로그인에 성공했습니다!');
      navigate('/');
    } else {
      console.error('토큰이 없습니다.');
      navigate('/login');
    }
  }, [searchParams, navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '100vh' 
    }}>
      <p>로그인 처리 중...</p>
    </div>
  );
};

export default AuthCallback;

