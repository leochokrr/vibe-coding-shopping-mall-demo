import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { API_ENDPOINTS, ROUTES } from '../../utils/constants';
import './ProductManage.css';

const ProductManage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all'); // all, 상의, 하의, 악세서리
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 2,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [editingProduct, setEditingProduct] = useState(null);
  const [editForm, setEditForm] = useState({
    sku: '',
    name: '',
    price: '',
    category: '',
    images: '',
    description: ''
  });

  useEffect(() => {
    // 검색어나 필터가 변경되면 첫 페이지로 리셋
    setCurrentPage(1);
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    fetchProducts();
  }, [searchTerm, categoryFilter, currentPage]); // 검색어, 필터, 페이지 변경 시 서버에서 데이터 가져오기

  const fetchProducts = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page: currentPage,
        limit: 2 // 페이지당 2개씩 표시
      };
      if (categoryFilter !== 'all') {
        params.category = categoryFilter;
      }
      if (searchTerm) {
        params.search = searchTerm;
      }
      const response = await api.get(API_ENDPOINTS.PRODUCTS, { params });
      
      // 페이지네이션 정보와 상품 목록 분리
      if (response.data && response.data.products) {
        setProducts(response.data.products || []);
        setPagination(response.data.pagination || {
          currentPage: 1,
          totalPages: 1,
          totalItems: 0,
          itemsPerPage: 2,
          hasNextPage: false,
          hasPrevPage: false
        });
      } else {
        // 이전 API 형식과의 호환성 (products 배열을 직접 반환하는 경우)
        setProducts(response.data || []);
      }
    } catch (err) {
      console.error('상품 목록 가져오기 실패:', err);
      setError('상품 목록을 불러오는데 실패했습니다.');
      if (err.response?.status === 401) {
        setError('인증이 필요합니다. 다시 로그인해주세요.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (productId) => {
    if (!window.confirm('정말 이 상품을 삭제하시겠습니까?')) {
      return;
    }

    try {
      await api.delete(`${API_ENDPOINTS.PRODUCTS}/${productId}`);
      setProducts(products.filter(product => product._id !== productId));
      alert('상품이 삭제되었습니다.');
    } catch (err) {
      console.error('상품 삭제 실패:', err);
      alert('상품 삭제에 실패했습니다.');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product._id);
    setEditForm({
      sku: product.sku,
      name: product.name,
      price: product.price.toString(),
      category: product.category,
      images: product.images ? product.images.join(', ') : '',
      description: product.description || ''
    });
  };

  const handleUpdate = async (productId) => {
    try {
      const updateData = {
        ...editForm,
        price: parseFloat(editForm.price),
        images: editForm.images 
          ? editForm.images.split(/[,\n]/).map(url => url.trim()).filter(url => url)
          : []
      };
      const response = await api.put(`${API_ENDPOINTS.PRODUCTS}/${productId}`, updateData);
      setProducts(products.map(product => product._id === productId ? response.data.product : product));
      setEditingProduct(null);
      alert('상품 정보가 업데이트되었습니다.');
    } catch (err) {
      console.error('상품 업데이트 실패:', err);
      alert('상품 정보 업데이트에 실패했습니다.');
    }
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setEditForm({ sku: '', name: '', price: '', category: '', images: '', description: '' });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      // 페이지 변경 시 스크롤을 맨 위로
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // 페이지 번호 배열 생성 (현재 페이지 기준 앞뒤 2페이지씩)
  const getPageNumbers = () => {
    const pages = [];
    const totalPages = pagination.totalPages;
    const current = pagination.currentPage;
    
    if (totalPages <= 7) {
      // 전체 페이지가 7개 이하면 모두 표시
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // 현재 페이지 기준 앞뒤 2페이지씩 표시
      if (current <= 3) {
        // 앞부분
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (current >= totalPages - 2) {
        // 뒷부분
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // 중간
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  if (loading) {
    return (
      <div className="product-manage-container">
        <div className="product-manage-loading">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="product-manage-container">
      <div className="product-manage-header">
        <div className="product-manage-header-top">
          <div>
            <h1>상품 관리</h1>
            <p className="product-manage-subtitle">등록된 상품을 관리합니다</p>
          </div>
          <div className="product-manage-actions">
            <button 
              className="back-btn"
              onClick={() => navigate(ROUTES.ADMIN)}
            >
              ← 뒤로가기
            </button>
            <button 
              className="add-product-btn"
              onClick={() => navigate(ROUTES.PRODUCT_REGISTER)}
            >
              새 상품 등록하기
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="product-manage-error">
          {error}
        </div>
      )}

      <div className="product-manage-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="상품명 또는 SKU로 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${categoryFilter === 'all' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('all')}
          >
            전체
          </button>
          <button
            className={`filter-btn ${categoryFilter === '상의' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('상의')}
          >
            상의
          </button>
          <button
            className={`filter-btn ${categoryFilter === '하의' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('하의')}
          >
            하의
          </button>
          <button
            className={`filter-btn ${categoryFilter === '악세서리' ? 'active' : ''}`}
            onClick={() => setCategoryFilter('악세서리')}
          >
            악세서리
          </button>
        </div>
        <button className="refresh-btn" onClick={fetchProducts}>
          새로고침
        </button>
      </div>

      <div className="product-manage-stats">
        <div className="stat-card">
          <div className="stat-value">{pagination.totalItems}</div>
          <div className="stat-label">전체 상품</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pagination.currentPage}</div>
          <div className="stat-label">현재 페이지</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pagination.totalPages}</div>
          <div className="stat-label">전체 페이지</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{products.length}</div>
          <div className="stat-label">이번 페이지 상품</div>
        </div>
      </div>

      <div className="products-table-container">
        <table className="products-table">
          <thead>
            <tr>
              <th>SKU</th>
              <th>상품명</th>
              <th>가격</th>
              <th>카테고리</th>
              <th>이미지</th>
              <th>등록일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan="7" className="no-data">
                  {searchTerm || categoryFilter !== 'all' 
                    ? '검색 결과가 없습니다.' 
                    : '상품이 없습니다.'}
                </td>
              </tr>
            ) : (
              products.map(product => (
                <tr key={product._id}>
                  {editingProduct === product._id ? (
                    <>
                      <td>
                        <input
                          type="text"
                          value={editForm.sku}
                          onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="edit-input"
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          value={editForm.price}
                          onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                          className="edit-input"
                          min="0"
                        />
                      </td>
                      <td>
                        <select
                          value={editForm.category}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                          className="edit-select"
                        >
                          <option value="상의">상의</option>
                          <option value="하의">하의</option>
                          <option value="악세서리">악세서리</option>
                        </select>
                      </td>
                      <td>
                        <textarea
                          value={editForm.images}
                          onChange={(e) => setEditForm({ ...editForm, images: e.target.value })}
                          className="edit-input"
                          rows="2"
                          placeholder="이미지 URL (쉼표로 구분)"
                        />
                      </td>
                      <td>{new Date(product.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="save-btn"
                            onClick={() => handleUpdate(product._id)}
                          >
                            저장
                          </button>
                          <button
                            className="cancel-btn"
                            onClick={handleCancelEdit}
                          >
                            취소
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{product.sku}</td>
                      <td>{product.name}</td>
                      <td>{product.price.toLocaleString()}원</td>
                      <td>
                        <span className={`category-badge ${product.category}`}>
                          {product.category}
                        </span>
                      </td>
                      <td>
                        {product.images && product.images.length > 0 ? (
                          <div className="product-images-preview">
                            <img 
                              src={product.images[0]} 
                              alt={product.name}
                              className="product-thumbnail"
                              onError={(e) => {
                                e.target.style.display = 'none';
                              }}
                            />
                            {product.images.length > 1 && (
                              <span className="image-count">+{product.images.length - 1}</span>
                            )}
                          </div>
                        ) : (
                          <span className="no-image">이미지 없음</span>
                        )}
                      </td>
                      <td>{new Date(product.createdAt).toLocaleDateString('ko-KR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="edit-btn"
                            onClick={() => handleEdit(product)}
                          >
                            수정
                          </button>
                          <button
                            className="delete-btn"
                            onClick={() => handleDelete(product._id)}
                          >
                            삭제
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="pagination-container">
          <div className="pagination-info">
            <span>
              전체 {pagination.totalItems}개 중 {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1}-
              {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)}개 표시
            </span>
          </div>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(1)}
              disabled={!pagination.hasPrevPage}
            >
              ««
            </button>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              «
            </button>
            {getPageNumbers().map((page, index) => (
              page === '...' ? (
                <span key={`ellipsis-${index}`} className="pagination-ellipsis">...</span>
              ) : (
                <button
                  key={page}
                  className={`pagination-btn ${page === pagination.currentPage ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              )
            ))}
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              »
            </button>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
            >
              »»
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManage;

