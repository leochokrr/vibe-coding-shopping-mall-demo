import axios from 'axios';

let API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// baseURL 끝의 슬래시 제거 (이중 슬래시 방지)
API_URL = API_URL.replace(/\/+$/, '');

// 개발 환경에서 API URL 로그 출력
if (import.meta.env.DEV) {
  console.log('API Base URL:', API_URL);
}

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available (localStorage 또는 sessionStorage에서 확인)
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // URL 정규화 (이중 슬래시 방지)
    if (config.url) {
      // baseURL 끝의 슬래시 제거
      if (config.baseURL) {
        config.baseURL = config.baseURL.replace(/\/+$/, '');
      }
      // url이 /로 시작하지 않으면 추가
      if (!config.url.startsWith('/')) {
        config.url = '/' + config.url;
      }
    }
    
    // 개발 환경에서 요청 URL 로그 출력
    if (import.meta.env.DEV) {
      const fullUrl = config.baseURL ? `${config.baseURL}${config.url}` : config.url;
      console.log(`API Request: ${config.method?.toUpperCase()} ${fullUrl}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 에러 로그 출력
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      console.error(`API Error: ${error.response.status} ${error.response.statusText}`, {
        url: `${error.config?.baseURL}${error.config?.url}`,
        data: error.response.data
      });
    } else if (error.request) {
      // 요청은 보냈지만 응답을 받지 못함
      console.error('API Error: No response received', {
        url: `${error.config?.baseURL}${error.config?.url}`,
        message: error.message
      });
    } else {
      // 요청 설정 중 에러
      console.error('API Error: Request setup failed', error.message);
    }
    
    if (error.response?.status === 401) {
      // 로그인 페이지에서는 리다이렉트하지 않음 (에러 메시지를 표시하기 위해)
      const isLoginPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
      
      if (!isLoginPage) {
        // Handle unauthorized access (로그인/회원가입 페이지가 아닐 때만)
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;




