import { useState } from 'react';
import './HeroBanner.css';

const HeroBanner = () => {
  // 배너 데이터
  const banners = [
    {
      line1: '병노',
      line2: '화이팅',
      subtitle: '10% 쇼핑백 쿠폰 + 1만원 추가 쿠폰',
      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      decoration: 'wine-glass'
    },
    {
      line1: '아자아자',
      line2: '할수 있다',
      subtitle: '10% 쇼핑백 쿠폰 + 1만원 추가 쿠폰',
      background: 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
      decoration: 'circle'
    },
    {
      line1: '2026년은',
      line2: '나의 해',
      subtitle: '10% 쇼핑백 쿠폰 + 1만원 추가 쿠폰',
      background: 'linear-gradient(135deg, #28a745 0%, #1e7e34 100%)',
      decoration: 'star'
    }
  ];
  
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);
  
  // 배너 전환 함수
  const handlePrevBanner = () => {
    setCurrentBannerIndex((prev) => (prev === 0 ? banners.length - 1 : prev - 1));
  };
  
  const handleNextBanner = () => {
    setCurrentBannerIndex((prev) => (prev === banners.length - 1 ? 0 : prev + 1));
  };

  return (
    <section 
      className="hero-banner" 
      style={{ background: banners[currentBannerIndex].background }}
    >
      <div className="hero-content">
        <h1 className="hero-title">
          <span className="hero-title-line1">{banners[currentBannerIndex].line1}</span>
          <span className="hero-title-line2">{banners[currentBannerIndex].line2}</span>
        </h1>
        <p className="hero-subtitle">{banners[currentBannerIndex].subtitle}</p>
      </div>
      <div className={`hero-decorations ${banners[currentBannerIndex].decoration}`}>
        {banners[currentBannerIndex].decoration === 'wine-glass' && (
          <>
            <div className="wine-glass left"></div>
            <div className="wine-glass right"></div>
          </>
        )}
        {banners[currentBannerIndex].decoration === 'circle' && (
          <>
            <div className="circle-decoration circle-1"></div>
            <div className="circle-decoration circle-2"></div>
            <div className="circle-decoration circle-3"></div>
          </>
        )}
        {banners[currentBannerIndex].decoration === 'star' && (
          <>
            <div className="star-decoration star-1">★</div>
            <div className="star-decoration star-2">★</div>
            <div className="star-decoration star-3">★</div>
            <div className="star-decoration star-4">★</div>
          </>
        )}
      </div>
      <button className="carousel-arrow left-arrow" onClick={handlePrevBanner}><span>‹</span></button>
      <button className="carousel-arrow right-arrow" onClick={handleNextBanner}><span>›</span></button>
    </section>
  );
};

export default HeroBanner;

