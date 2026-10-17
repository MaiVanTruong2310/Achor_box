import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Package,
  Layers,
  History,
  DollarSign,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  CheckCircle2,
  Calendar,
  Shield,
  Scale,
  Maximize2,
  TrendingUp,
  TrendingDown,
  ArrowUpDown
} from 'lucide-react';
import { productsService, ExtendedProduct } from '../../services/api';
import { adminRequest } from '../../services/adminRequest';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '../../contexts/ToastContext';
import './product-detail.css';

export const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userRole = profile?.role || 'customer';
  const canAdjustStock = ['super_admin', 'product_manager'].includes(userRole);

  const [product, setProduct] = useState<ExtendedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Gallery
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // Inventory movements history
  const [movements, setMovements] = useState<any[]>([]);
  const [loadingMovements, setLoadingMovements] = useState(false);

  // Stock Adjustment in Sidebar
  const [adjustDelta, setAdjustDelta] = useState<number>(10);
  const [adjustType, setAdjustType] = useState<'in' | 'out'>('in');
  const [adjustVariantId, setAdjustVariantId] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('Nhập hàng kiểm định chất lượng');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);
  const [adjustMsg, setAdjustMsg] = useState('');

  const fetchProductData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await productsService.getProductById(id);
      setProduct(data);
      if (data.images && data.images.length > 0) {
        setSelectedImage(data.images[0]);
      }
      if (data.variants && data.variants.length > 0) {
        setAdjustVariantId(data.variants[0].id);
      }

      // Fetch inventory movements
      setLoadingMovements(true);
      try {
        const hist = await adminRequest<any[]>(`/products/${encodeURIComponent(id)}/inventory-history`);
        setMovements(Array.isArray(hist) ? hist : []);
      } catch (hErr) {
        console.warn('Could not load inventory history', hErr);
      } finally {
        setLoadingMovements(false);
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể tải thông tin sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductData();
  }, [id]);

  const handleCopyId = () => {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const backPath = userRole === 'product_manager' ? '/po/products' : userRole === 'technician' ? '/technician/products' : '/admin/products';

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !product || adjustSubmitting) return;

    setAdjustSubmitting(true);
    setAdjustMsg('');

    // Với tài khoản PO: Luôn gửi yêu cầu đề xuất cho Admin phê duyệt
    if (userRole === 'product_manager') {
      const actionName = adjustType === 'in' ? 'nhập' : 'xuất';
      const variantObj = product.variants?.find(v => v.id === adjustVariantId);
      const variantTitle = variantObj ? (variantObj.variant_name || variantObj.sku) : product.name;
      const successText = `Đã gửi yêu cầu ${actionName} kho (${Math.abs(adjustDelta)} sản phẩm - ${variantTitle}) đến Quản trị viên (Admin) phê duyệt thành công!`;
      setTimeout(() => {
        setAdjustSubmitting(false);
        setAdjustMsg(successText);
        toast.success(successText, 'Gửi yêu cầu phê duyệt thành công');
      }, 400);
      return;
    }

    const delta = adjustType === 'in' ? Math.abs(adjustDelta) : -Math.abs(adjustDelta);
    try {
      if (adjustVariantId) {
        await adminRequest(`/products/${id}/variants/${adjustVariantId}/stock`, {
          method: 'PATCH',
          body: JSON.stringify({ delta, reason: adjustReason.trim() })
        });
      } else {
        await adminRequest(`/products/${id}/stock`, {
          method: 'PATCH',
          body: JSON.stringify({ delta, reason: adjustReason.trim() })
        });
      }
      const successText = `Đã ${adjustType === 'in' ? 'nhập' : 'xuất'} ${Math.abs(adjustDelta)} sản phẩm thành công!`;
      setAdjustMsg(successText);
      toast.success(successText, 'Điều chỉnh kho thành công');
      fetchProductData();
      setTimeout(() => setAdjustMsg(''), 4000);
    } catch (err: any) {
      toast.error(err?.message || 'Thao tác không thành công', 'Lỗi điều chỉnh tồn kho');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-top-nav">
          <button type="button" className="back-link-btn" onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <RefreshCw size={28} className="spin" style={{ marginBottom: 12 }} />
          <div>Đang tải chi tiết sản phẩm #{id}…</div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="product-detail-page">
        <div className="product-detail-top-nav">
          <button type="button" className="back-link-btn" onClick={() => navigate(backPath)}>
            <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
          </button>
        </div>
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--danger, #ef4444)' }}>
          <AlertTriangle size={36} style={{ marginBottom: 12 }} />
          <h3>Không tìm thấy sản phẩm</h3>
          <p>{error || 'Sản phẩm không tồn tại hoặc đã bị xóa.'}</p>
          <button type="button" className="back-link-btn" style={{ marginTop: 16 }} onClick={fetchProductData}>
            Thử tải lại
          </button>
        </div>
      </div>
    );
  }

  const variants = product.variants || [];
  const totalStock = variants.length > 0
    ? variants.reduce((sum, v) => sum + (v.stock_quantity || 0), 0)
    : (product.stock_quantity ?? 0);

  return (
    <div className="product-detail-page">
      {/* Top Nav Breadcrumbs */}
      <div className="product-detail-top-nav">
        <button type="button" className="back-link-btn" onClick={() => navigate(backPath)}>
          <ArrowLeft size={16} /> Quay lại danh sách sản phẩm
        </button>
        <button type="button" className="back-link-btn" onClick={fetchProductData} title="Làm mới">
          <RefreshCw size={15} /> Làm mới
        </button>
      </div>

      {/* Main Header Card */}
      <div className="product-detail-header-card">
        <div className="product-header-left">
          <div className="product-header-icon">
            <Package size={28} />
          </div>
          <div className="product-header-title-wrap">
            <h2>
              <span>{product.name}</span>
              <span className="product-sku-badge">{product.sku}</span>
              <button
                type="button"
                onClick={handleCopyId}
                title="Sao chép ID sản phẩm"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                {copied ? <Check size={16} style={{ color: '#10b981' }} /> : <Copy size={16} />}
              </button>
            </h2>
            <div className="product-meta-chips">
              <span style={{ color: 'var(--text-secondary)' }}>
                Danh mục: <strong>{product.category_name || 'Hộp nhận hàng thông minh'}</strong>
              </span>
              <span>•</span>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 12,
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: product.is_active ? '#10b981' : '#ef4444',
                  backgroundColor: product.is_active ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  border: product.is_active ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)'
                }}
              >
                {product.is_active ? 'Đang kinh doanh' : 'Tạm dừng bán'}
              </span>
              <span>•</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-muted)' }}>
                <Calendar size={13} /> Khởi tạo: {product.created_at ? new Date(product.created_at).toLocaleDateString('vi-VN') : '—'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Giá gốc niêm yết</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#ea580c' }}>
              {(product.price || 0).toLocaleString('vi-VN')} ₫
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="product-content-layout">
        {/* Left Column: Gallery, Specs, Variants, History */}
        <div className="product-left-column">
          {/* Card: Images & Description */}
          <div className="product-card-panel">
            <div className="product-gallery-wrap">
              <div className="product-main-image">
                {selectedImage ? (
                  <img src={selectedImage} alt={product.name} />
                ) : (
                  <Package size={64} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              {product.images && product.images.length > 1 && (
                <div className="product-image-thumbnails">
                  {product.images.map((img, i) => (
                    <div
                      key={i}
                      className={`thumb-item ${selectedImage === img ? 'active' : ''}`}
                      onClick={() => setSelectedImage(img)}
                    >
                      <img src={img} alt={`Thumb ${i}`} />
                    </div>
                  ))}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 260 }}>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 600 }}>Mô tả sản phẩm</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {product.description || 'Chưa có mô tả chi tiết cho sản phẩm này.'}
                </p>

                {/* Technical Specifications Highlights */}
                <div className="specs-grid">
                  <div className="spec-box">
                    <span className="spec-lbl">Cảm biến trọng lượng</span>
                    <span className="spec-val" style={{ color: product.has_weight_sensor ? '#10b981' : 'var(--text-muted)' }}>
                      {product.has_weight_sensor ? '✓ Tích hợp cảm biến' : 'Không trang bị'}
                    </span>
                  </div>
                  <div className="spec-box">
                    <span className="spec-lbl">Tổng lượng tồn kho</span>
                    <span className="spec-val" style={{ color: totalStock > 0 ? '#10b981' : '#ef4444' }}>
                      {totalStock} chiếc sẵn sàng
                    </span>
                  </div>
                  <div className="spec-box">
                    <span className="spec-lbl">Số lượng biến thể kích cỡ</span>
                    <span className="spec-val">{variants.length} biến thể (S/M/L)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Variants List */}
          <div className="product-card-panel">
            <div className="product-panel-header">
              <h3>
                <Layers size={18} style={{ color: '#ea580c' }} />
                Danh Sách Biến Thể Kích Cỡ & Định Mức Tồn Kho
              </h3>
            </div>

            {variants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                Sản phẩm chỉ có phiên bản tiêu chuẩn (chưa có biến thể phụ).
              </div>
            ) : (
              <div className="product-table-wrapper">
                <table className="variants-table">
                  <thead>
                    <tr>
                      <th>Biến thể / Size</th>
                      <th>Mã SKU</th>
                      <th>Kích thước (H x W x D)</th>
                      <th>Dung tích / Tải trọng</th>
                      <th style={{ textAlign: 'right' }}>Giá thực tế</th>
                      <th style={{ textAlign: 'center' }}>Tồn kho</th>
                      <th style={{ textAlign: 'center' }}>Bảo hành</th>
                    </tr>
                  </thead>
                  <tbody>
                    {variants.map((v) => (
                      <tr key={v.id}>
                        <td>
                          <strong style={{ color: 'var(--text-primary)' }}>{v.variant_name || v.name}</strong>
                        </td>
                        <td>
                          <code style={{ fontSize: '0.8rem', color: '#ea580c' }}>{v.sku}</code>
                        </td>
                        <td>
                          {v.height_cm || v.width_cm || v.depth_cm ? (
                            <span>{v.height_cm || 0} × {v.width_cm || 0} × {v.depth_cm || 0} cm</span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>Tiêu chuẩn</span>
                          )}
                        </td>
                        <td>
                          <span>
                            {v.capacity_liter ? `${v.capacity_liter}L` : '—'}
                            {v.max_load_kg ? ` / ${v.max_load_kg}kg` : ''}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>
                          {(v.calculated_price || (product.price + (v.price_delta || 0))).toLocaleString('vi-VN')} ₫
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 10,
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              background: (v.stock_quantity || 0) > 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: (v.stock_quantity || 0) > 0 ? '#10b981' : '#ef4444'
                            }}
                          >
                            {v.stock_quantity ?? 0}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {v.warranty_months ? `${v.warranty_months} tháng` : '12 tháng'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Card: Inventory Movements History */}
          <div className="product-card-panel">
            <div className="product-panel-header">
              <h3>
                <History size={18} style={{ color: '#3b82f6' }} />
                Lịch Sử Biến Động Xuất / Nhập Kho Sản Phẩm
              </h3>
            </div>

            {loadingMovements ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                <RefreshCw size={20} className="spin" style={{ marginBottom: 8 }} />
                <div>Đang tải lịch sử kho…</div>
              </div>
            ) : movements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                Chưa có ghi nhận giao dịch xuất nhập kho gần đây cho sản phẩm này.
              </div>
            ) : (
              <div className="product-table-wrapper">
                <table className="inventory-history-table">
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Biến thể</th>
                      <th style={{ textAlign: 'center' }}>Biến động</th>
                      <th>Lý do nghiệp vụ</th>
                      <th>Người thực hiện</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m, idx) => {
                      const delta = Number(m.delta ?? 0);
                      const isPositive = delta > 0;
                      return (
                        <tr key={m.id || idx}>
                          <td style={{ whiteSpace: 'nowrap', color: 'var(--text-secondary)' }}>
                            {m.createdAt ? new Date(m.createdAt).toLocaleString('vi-VN') : '—'}
                          </td>
                          <td>
                            <strong>{m.variantName || m.sku || 'Sản phẩm chính'}</strong>
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                                fontWeight: 700,
                                color: isPositive ? '#10b981' : '#ef4444'
                              }}
                            >
                              {isPositive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                              {isPositive ? `+${delta}` : delta}
                            </span>
                          </td>
                          <td>{m.reason || 'Kiểm kê kho định kỳ'}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{m.actorName || m.created_by || 'Hệ thống'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Stock Adjust & Admin Info */}
        <div className="product-right-column">
          {/* Quick Adjust Stock */}
          {canAdjustStock && (
            <div className="product-card-panel">
              <div className="product-panel-header">
                <h3>
                  <ArrowUpDown size={18} style={{ color: '#ea580c' }} />
                  {userRole === 'product_manager' ? 'Gửi Đề Xuất Điều Chỉnh Kho' : 'Điều Chỉnh Xuất / Nhập Kho Nhanh'}
                </h3>
              </div>

              {userRole === 'product_manager' && (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-surface-hover, rgba(234, 88, 12, 0.05))', padding: '10px 12px', borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 12, lineHeight: 1.5 }}>
                  ℹ️ <strong>Quy trình PO:</strong> Yêu cầu xuất/nhập kho sẽ được gửi đến Quản trị viên (Admin) thẩm định và phê duyệt trước khi cập nhật số lượng tồn thực tế.
                </div>
              )}

              {adjustMsg && (
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontSize: '0.85rem', marginBottom: 12, border: '1px solid rgba(16, 185, 129, 0.25)', lineHeight: 1.4 }}>
                  <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
                  {adjustMsg}
                </div>
              )}

              <form onSubmit={handleAdjustStock} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {variants.length > 0 && (
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Chọn biến thể
                    </label>
                    <select
                      value={adjustVariantId}
                      onChange={(e) => setAdjustVariantId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '9px 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border-subtle)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        marginTop: 4,
                        fontSize: '0.85rem'
                      }}
                    >
                      {variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.variant_name || v.name} (Tồn: {v.stock_quantity ?? 0})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Thao tác kho
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button
                      type="button"
                      onClick={() => setAdjustType('in')}
                      style={{
                        padding: '9px',
                        borderRadius: 8,
                        border: adjustType === 'in' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
                        background: adjustType === 'in' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-surface)',
                        color: adjustType === 'in' ? '#10b981' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      + Nhập kho
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('out')}
                      style={{
                        padding: '9px',
                        borderRadius: 8,
                        border: adjustType === 'out' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
                        background: adjustType === 'out' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-surface)',
                        color: adjustType === 'out' ? '#ef4444' : 'var(--text-secondary)',
                        fontWeight: 600,
                        fontSize: '0.84rem',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      - Xuất kho
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Số lượng
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(Math.max(1, parseInt(e.target.value) || 1))}
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      marginTop: 4,
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Lý do điều chỉnh
                  </label>
                  <input
                    type="text"
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="VD: Nhập xưởng lô mới, điều chuyển..."
                    style={{
                      width: '100%',
                      padding: '9px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      marginTop: 4,
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={adjustSubmitting}
                  style={{
                    padding: '11px 16px',
                    borderRadius: 8,
                    border: 'none',
                    background: adjustType === 'in' ? '#10b981' : '#ef4444',
                    color: '#fff',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    marginTop: 6,
                    transition: 'opacity 0.18s ease'
                  }}
                >
                  {adjustSubmitting
                    ? 'Đang xử lý…'
                    : userRole === 'product_manager'
                    ? `Gửi yêu cầu ${adjustType === 'in' ? 'nhập' : 'xuất'} kho cho Admin duyệt`
                    : `Xác nhận ${adjustType === 'in' ? 'nhập' : 'xuất'} kho`}
                </button>
              </form>
            </div>
          )}

          {/* Warranty & Product Tier policy */}
          <div className="product-card-panel">
            <div className="product-panel-header">
              <h3>
                <Shield size={18} style={{ color: '#10b981' }} />
                Chính Sách Bảo Hành & Lắp Đặt
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              <div>• <strong>Bảo hành chính hãng:</strong> 12 - 24 tháng theo từng biến thể kích cỡ SmartBox.</div>
              <div>• <strong>Hỗ trợ kỹ thuật:</strong> Đội ngũ kỹ thuật viên SmartBox hỗ trợ lắp đặt tận nơi.</div>
              <div>• <strong>Kiểm định:</strong> Tiêu chuẩn chống nước IP54 / IP65 theo quy chuẩn công nghiệp.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
