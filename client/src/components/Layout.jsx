import { Outlet, Link } from 'react-router-dom';
import Navbar from './Navbar';
import './Layout.css';

const Layout = () => {
  return (
    <div className="layout">
      <Navbar />
      <main className="main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <h3>The Leo shop</h3>
            <p>고객센터: 1800-5700</p>
          </div>
          <div className="footer-section">
            <h4>고객지원</h4>
            <Link to="/">공지사항</Link>
            <Link to="/">자주 묻는 질문</Link>
            <Link to="/">1:1 문의</Link>
          </div>
          <div className="footer-section">
            <h4>이용안내</h4>
            <Link to="/">이용약관</Link>
            <Link to="/">개인정보처리방침</Link>
            <Link to="/">이용안내</Link>
          </div>
          <div className="footer-section">
            <h4>소셜미디어</h4>
            <div className="social-icons">
              <a href="#" aria-label="Instagram">📷</a>
              <a href="#" aria-label="Facebook">📘</a>
              <a href="#" aria-label="YouTube">📺</a>
              <a href="#" aria-label="KakaoTalk">💬</a>
            </div>
          </div>
        </div>
        <p className="footer-copyright">&copy; 2024 Shopping Mall Demo. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Layout;

