import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { API_ENDPOINTS, ROUTES } from '../../utils/constants';
import './ProductRegister.css';

const ProductRegister = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    price: '',
    category: '',
    images: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState([]);

  // Cloudinary 환경 변수 확인
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Cloudinary 위젯이 로드되었는지 확인
  useEffect(() => {
    if (typeof window !== 'undefined' && window.cloudinary) {
      console.log('Cloudinary 위젯이 로드되었습니다.');
    } else {
      console.warn('Cloudinary 위젯이 아직 로드되지 않았습니다.');
    }

    // 환경 변수 확인
    if (!cloudName || !uploadPreset) {
      console.warn('Cloudinary 환경 변수가 설정되지 않았습니다.');
      console.warn('필요한 환경 변수: VITE_CLOUDINARY_CLOUD_NAME, VITE_CLOUDINARY_UPLOAD_PRESET');
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageInput = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      images: value
    }));
    
    // 이미지 URL들을 배열로 변환 (쉼표 또는 줄바꿈으로 구분)
    const urls = value
      .split(/[,\n]/)
      .map(url => url.trim())
      .filter(url => url.length > 0);
    setImageUrls(urls);
  };

  const addImageUrl = () => {
    const url = prompt('이미지 URL을 입력하세요:');
    if (url && url.trim()) {
      const newUrls = [...imageUrls, url.trim()];
      setImageUrls(newUrls);
      setFormData(prev => ({
        ...prev,
        images: newUrls.join(', ')
      }));
    }
  };

  const openCloudinaryWidget = () => {
    // Cloudinary 위젯 스크립트 확인
    if (typeof window === 'undefined' || !window.cloudinary) {
      setError('Cloudinary 위젯이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
      return;
    }

    // 환경 변수 확인
    if (!cloudName || !uploadPreset) {
      setError(
        'Cloudinary 환경 변수가 설정되지 않았습니다.\n\n' +
        '필요한 환경 변수:\n' +
        '- VITE_CLOUDINARY_CLOUD_NAME: Cloudinary 계정의 cloud name\n' +
        '- VITE_CLOUDINARY_UPLOAD_PRESET: 업로드 preset 이름\n\n' +
        '클라이언트 루트에 .env 파일을 생성하고 위 변수들을 설정해주세요.'
      );
      return;
    }

    const widget = window.cloudinary.createUploadWidget(
      {
        cloudName: cloudName,
        uploadPreset: uploadPreset,
        multiple: true, // 여러 이미지 업로드 허용
        maxFiles: 10, // 최대 10개까지 업로드 가능
        sources: ['local', 'camera', 'url'], // 업로드 소스: 로컬 파일, 카메라, URL
        showAdvancedOptions: false,
        cropping: false,
        folder: 'products', // Cloudinary 폴더 경로
        resourceType: 'image',
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'gif', 'webp']
      },
      (error, result) => {
        if (!error && result) {
          if (result.event === 'success') {
            // 이미지 업로드 성공
            const secureUrl = result.info.secure_url;
            const newUrls = [...imageUrls, secureUrl];
            setImageUrls(newUrls);
            setFormData(prev => ({
              ...prev,
              images: newUrls.join(', ')
            }));
            setError(''); // 성공 시 에러 메시지 제거
          } else if (result.event === 'close') {
            // 위젯이 닫혔을 때는 에러 메시지 제거
            setError('');
          }
        } else if (error) {
          console.error('Cloudinary 업로드 에러:', error);
          setError('이미지 업로드에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
        }
      }
    );

    widget.open();
  };

  const removeImageUrl = (index) => {
    const newUrls = imageUrls.filter((_, i) => i !== index);
    setImageUrls(newUrls);
    setFormData(prev => ({
      ...prev,
      images: newUrls.join(', ')
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 필수 필드 검증
      if (!formData.sku || !formData.name || !formData.price || !formData.category) {
        setError('SKU, 상품명, 가격, 카테고리는 필수 입력 항목입니다.');
        setLoading(false);
        return;
      }

      // 가격 검증
      const price = parseFloat(formData.price);
      if (isNaN(price) || price < 0) {
        setError('가격은 0 이상의 숫자여야 합니다.');
        setLoading(false);
        return;
      }

      // 카테고리 검증
      if (!['상의', '하의', '악세서리'].includes(formData.category)) {
        setError('카테고리는 상의, 하의, 악세서리 중 하나를 선택해야 합니다.');
        setLoading(false);
        return;
      }

      // 이미지 배열 준비
      const images = imageUrls.length > 0 ? imageUrls : (formData.images ? formData.images.split(/[,\n]/).map(url => url.trim()).filter(url => url) : []);

      // API 요청 데이터 준비
      const productData = {
        sku: formData.sku,
        name: formData.name,
        price: price,
        category: formData.category,
        images: images,
        description: formData.description || undefined
      };

      const response = await api.post(API_ENDPOINTS.PRODUCTS, productData);

      if (response.data) {
        alert('상품이 성공적으로 등록되었습니다!');
        navigate(ROUTES.ADMIN);
      }
    } catch (err) {
      console.error('상품 등록 에러:', err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.status === 400) {
        setError('입력한 정보를 확인해주세요.');
      } else if (err.response?.status === 401) {
        setError('인증이 필요합니다. 다시 로그인해주세요.');
      } else {
        setError('상품 등록에 실패했습니다. 다시 시도해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="product-register-container">
      <div className="product-register-header">
        <button 
          className="back-btn"
          onClick={() => navigate(ROUTES.ADMIN)}
        >
          ← 뒤로가기
        </button>
        <h1>새 상품 등록</h1>
      </div>

      {error && (
        <div className="product-register-error">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="product-register-form">
        <div className="form-section">
          <h2 className="form-section-title">기본 정보</h2>
          
          <div className="form-group">
            <label htmlFor="sku" className="form-label">
              SKU <span className="required">*</span>
            </label>
            <input
              type="text"
              id="sku"
              name="sku"
              value={formData.sku}
              onChange={handleChange}
              className="form-input"
              placeholder="예: PROD-001"
              required
            />
            <p className="form-hint">상품의 고유 코드입니다. 중복될 수 없습니다.</p>
          </div>

          <div className="form-group">
            <label htmlFor="name" className="form-label">
              상품명 <span className="required">*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              placeholder="상품명을 입력하세요"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="price" className="form-label">
                가격 <span className="required">*</span>
              </label>
              <input
                type="number"
                id="price"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="form-input"
                placeholder="0"
                min="0"
                step="1"
                required
              />
              <p className="form-hint">원 단위로 입력하세요</p>
            </div>

            <div className="form-group">
              <label htmlFor="category" className="form-label">
                카테고리 <span className="required">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
                required
              >
                <option value="">선택하세요</option>
                <option value="상의">상의</option>
                <option value="하의">하의</option>
                <option value="악세서리">악세서리</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h2 className="form-section-title">이미지</h2>
          
          <div className="form-group">
            <label htmlFor="images" className="form-label">
              이미지
            </label>
            <div className="image-upload-buttons">
              <button
                type="button"
                className="cloudinary-upload-btn"
                onClick={openCloudinaryWidget}
              >
                📷 Cloudinary로 이미지 업로드
              </button>
              <button
                type="button"
                className="url-input-btn"
                onClick={addImageUrl}
              >
                🔗 URL로 추가
              </button>
            </div>
            <textarea
              id="images"
              name="images"
              value={formData.images}
              onChange={handleImageInput}
              className="form-textarea"
              placeholder="이미지 URL을 직접 입력하거나 위 버튼을 사용하여 업로드하세요. 여러 개인 경우 쉼표 또는 줄바꿈으로 구분하세요."
              rows="3"
            />
            <p className="form-hint">
              Cloudinary 위젯을 사용하여 이미지를 업로드하거나, URL을 직접 입력할 수 있습니다.
              여러 이미지를 등록하려면 쉼표(,) 또는 줄바꿈으로 구분하세요.
            </p>
          </div>

          {imageUrls.length > 0 && (
            <div className="image-preview-section">
              <h3 className="image-preview-title">이미지 미리보기</h3>
              <div className="image-preview-grid">
                {imageUrls.map((url, index) => (
                  <div key={index} className="image-preview-item">
                    <img 
                      src={url} 
                      alt={`Preview ${index + 1}`}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext fill="%23999" font-family="sans-serif" font-size="14" dy="10.5" font-weight="bold" x="50%25" y="50%25" text-anchor="middle"%3E이미지 없음%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <button
                      type="button"
                      className="remove-image-btn"
                      onClick={() => removeImageUrl(index)}
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="form-section">
          <h2 className="form-section-title">상품 설명</h2>
          
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              설명
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="form-textarea"
              placeholder="상품에 대한 상세 설명을 입력하세요"
              rows="5"
            />
          </div>
        </div>

        <div className="form-actions">
          <button
            type="button"
            className="cancel-btn"
            onClick={() => navigate(ROUTES.ADMIN)}
            disabled={loading}
          >
            취소
          </button>
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
          >
            {loading ? '등록 중...' : '상품 등록'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProductRegister;

