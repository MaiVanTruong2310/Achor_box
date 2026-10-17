import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Search,
  Edit2,
  RefreshCw,
  Box,
  Layers,
  Check,
  AlertCircle,
  AlertTriangle,
  Shield,
  Sparkles,
  Scale,
  Maximize2,
  PackageCheck,
  X,
  ExternalLink
} from 'lucide-react';
import { productsService, ExtendedProduct } from '../../services/api';
import { ProductVariant } from '../../types/database';
import { useAuth } from '../../contexts/AuthContext';
import './products.css';

interface FlatVariant {
  productId: string;
  productName: string;
  productSku: string;
  variant: ProductVariant;
}

export const VariantSpecificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const userRole = profile?.role || 'customer';
  const isSuperAdmin = userRole === 'super_admin';
  const isProductManager = userRole === 'product_manager';
  const isTechnician = userRole === 'technician';
  const canEditSpecs = isSuperAdmin || isProductManager;

  const [products, setProducts] = useState<ExtendedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>('all');
  const [selectedTier, setSelectedTier] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Edit Specs Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FlatVariant | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Form State
  const [form, setForm] = useState<{
    modelTier: string;
    widthCm: string;
    heightCm: string;
    depthCm: string;
    weightKg: string;
    maxLoadKg: string;
    capacityLiter: string;
    warrantyMonths: string;
    imagesText: string;
  }>({
    modelTier: 'BASE',
    widthCm: '',
    heightCm: '',
    depthCm: '',
    weightKg: '',
    maxLoadKg: '',
    capacityLiter: '',
    warrantyMonths: '24',
    imagesText: ''
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await productsService.getProducts();
      setProducts(data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách sản phẩm và biến thể.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Flatten all variants from products
  const flatVariants: FlatVariant[] = useMemo(() => {
    const list: FlatVariant[] = [];
    products.forEach((p) => {
      (p.variants || []).forEach((v) => {
        list.push({
          productId: p.id,
          productName: p.name,
          productSku: p.sku,
          variant: v
        });
      });
    });
    return list;
  }, [products]);

  // Filtered variants
  const filteredVariants = useMemo(() => {
    return flatVariants.filter((item) => {
      if (selectedProductId !== 'all' && item.productId !== selectedProductId) {
        return false;
      }
      if (selectedTier !== 'all') {
        const itemTier = item.variant.model_tier || 'BASE';
        if (itemTier !== selectedTier) return false;
      }
      if (debouncedSearchTerm.trim()) {
        const q = debouncedSearchTerm.toLowerCase().trim();
        const matchSku = item.variant.sku.toLowerCase().includes(q);
        const matchName = (item.variant.variant_name || item.variant.name || '').toLowerCase().includes(q);
        const matchProd = item.productName.toLowerCase().includes(q);
        if (!matchSku && !matchName && !matchProd) return false;
      }
      return true;
    });
  }, [flatVariants, selectedProductId, selectedTier, debouncedSearchTerm]);

  // Quick Seed Handler
  const handleSeedStandardProducts = async () => {
    if (!window.confirm('Khởi tạo 3 dòng tủ SmartBox tiêu chuẩn (Standard, Pro, Mini) với đầy đủ thông số kích thước, tải trọng và thời hạn bảo hành?')) {
      return;
    }
    setSeeding(true);
    setError('');
    try {
      await productsService.seedStandardProducts();
      showToast('Khởi tạo dữ liệu SmartBox tiêu chuẩn thành công!');
      await loadData();
    } catch (err: any) {
      setError('Khởi tạo thất bại: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setSeeding(false);
    }
  };

  // Open Edit Modal
  const openEditModal = (item: FlatVariant) => {
    setEditingItem(item);
    setModalError('');
    const v = item.variant;
    setForm({
      modelTier: v.model_tier || (v.has_weight_sensor ? 'PRO' : 'BASE'),
      widthCm: v.width_cm != null ? String(v.width_cm) : '',
      heightCm: v.height_cm != null ? String(v.height_cm) : '',
      depthCm: v.depth_cm != null ? String(v.depth_cm) : '',
      weightKg: v.weight_kg != null ? String(v.weight_kg) : '',
      maxLoadKg: v.max_load_kg != null ? String(v.max_load_kg) : '',
      capacityLiter: v.capacity_liter != null ? String(v.capacity_liter) : '',
      warrantyMonths: v.warranty_months != null ? String(v.warranty_months) : '24',
      imagesText: Array.isArray(v.images) ? v.images.join('\n') : ''
    });
    setEditModalOpen(true);
  };

  // Save Specs with anti-duplicate locking
  const handleSaveSpecs = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || submitting) return;
    if (!canEditSpecs) {
      setModalError('Tài khoản của bạn không có quyền chỉnh sửa thông số kỹ thuật.');
      return;
    }

    setSubmitting(true);
    setModalError('');
    try {
      const payload: any = {
        modelTier: form.modelTier || 'BASE',
        widthCm: form.widthCm ? Number(form.widthCm) : null,
        heightCm: form.heightCm ? Number(form.heightCm) : null,
        depthCm: form.depthCm ? Number(form.depthCm) : null,
        weightKg: form.weightKg ? Number(form.weightKg) : null,
        maxLoadKg: form.maxLoadKg ? Number(form.maxLoadKg) : null,
        capacityLiter: form.capacityLiter ? Number(form.capacityLiter) : null,
        warrantyMonths: form.warrantyMonths ? Number(form.warrantyMonths) : 24,
        images: form.imagesText
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean)
      };

      await productsService.updateVariantSpecifications(
        editingItem.productId,
        editingItem.variant.id,
        payload
      );

      showToast(`Đã lưu thông số kỹ thuật cho SKU ${editingItem.variant.sku}!`);
      setEditModalOpen(false);
      await loadData();
    } catch (err: any) {
      setModalError('Không lưu được thông số kỹ thuật: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setSubmitting(false);
    }
  };

  // Stats calculation
  const totalVariantsCount = flatVariants.length;
  const configuredSpecsCount = flatVariants.filter(
    (f) => f.variant.width_cm && f.variant.height_cm && f.variant.depth_cm
  ).length;
  const proTierCount = flatVariants.filter(
    (f) => (f.variant.model_tier === 'PRO' || f.variant.has_weight_sensor)
  ).length;
  const baseTierCount = totalVariantsCount - proTierCount;

  return (
    <div className="products-page">
      {/* Toast alert */}
      {toastMessage && (
        <div
          style={{
            background: 'rgba(16, 185, 129, 0.95)',
            color: '#fff',
            padding: '10px 18px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 600,
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)'
          }}
        >
          <Check size={16} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="products-topbar">
        <div className="products-topbar-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1>
              <span>Thông Số Biến Thể Kỹ Thuật</span>
              <span className="products-topbar-count">{totalVariantsCount} SKU</span>
            </h1>
            {isSuperAdmin && (
              <span className="fpt-badge fpt-badge-purple" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                🛡️ Toàn quyền Admin
              </span>
            )}
            {isProductManager && (
              <span className="fpt-badge fpt-badge-success" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                📦 Quản lý Kho & SP
              </span>
            )}
            {isTechnician && (
              <span className="fpt-badge fpt-badge-info" style={{ fontSize: '0.72rem', padding: '3px 8px' }}>
                🔧 Kỹ thuật viên (Tra cứu quy cách & kích thước)
              </span>
            )}
          </div>
          <p className="products-topbar-desc">
            {isTechnician
              ? 'Tra cứu quy cách số đo thực tế (Rộng × Cao × Sâu cm), khối lượng, tải trọng và thời hạn bảo hành của từng biến thể thiết bị.'
              : 'Cấu hình số đo thực tế (Rộng × Cao × Sâu cm), khối lượng, tải trọng, cảm biến cân và thời hạn bảo hành cho từng biến thể.'}
          </p>
        </div>

        <div className="products-topbar-actions">
          <button
            type="button"
            className="icon-btn-clean"
            onClick={loadData}
            title="Làm mới thông số"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>

          {flatVariants.length === 0 && isSuperAdmin && (
            <button
              type="button"
              className="btn-primary-compact"
              disabled={seeding || loading}
              onClick={handleSeedStandardProducts}
            >
              <Sparkles size={16} />
              <span>{seeding ? 'Đang khởi tạo…' : 'Khởi tạo dòng SmartBox chuẩn'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="products-stats-bar">
        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tổng số biến thể</span>
            <span className="products-stat-value">{totalVariantsCount}</span>
            <span className="products-stat-sub">SKU phiên bản kích cỡ</span>
          </div>
          <div className="products-stat-icon">
            <Layers size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Đã nhập kích thước thực tế</span>
            <span className="products-stat-value">{configuredSpecsCount}</span>
            <span className="products-stat-sub">
              {totalVariantsCount > 0
                ? `${Math.round((configuredSpecsCount / totalVariantsCount) * 100)}% biến thể hoàn thiện`
                : 'Chưa có dữ liệu'}
            </span>
          </div>
          <div className="products-stat-icon success">
            <PackageCheck size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Phiên bản Pro (Cảm biến cân)</span>
            <span className="products-stat-value">{proTierCount}</span>
            <span className="products-stat-sub">Tích hợp cân tải điện tử</span>
          </div>
          <div className="products-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
            <Scale size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Phiên bản Tiêu chuẩn (Base)</span>
            <span className="products-stat-value">{baseTierCount}</span>
            <span className="products-stat-sub">Khóa điện từ tiêu chuẩn</span>
          </div>
          <div className="products-stat-icon">
            <Box size={18} />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="products-toolbar-clean">
        <div className="products-toolbar-left">
          <div className="products-search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="products-search-input"
              placeholder="Tìm theo SKU biến thể, tên phiên bản hoặc sản phẩm…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                type="button"
                className="products-search-clear"
                onClick={() => setSearchTerm('')}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            className="products-select-clean"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
          >
            <option value="all">Tất cả sản phẩm ({products.length})</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            className="products-select-clean"
            value={selectedTier}
            onChange={(e) => setSelectedTier(e.target.value)}
          >
            <option value="all">Tất cả phân cấp phần cứng</option>
            <option value="BASE">Base · Không có cảm biến cân</option>
            <option value="PRO">Pro · Có cảm biến cân điện tử</option>
          </select>
        </div>
      </div>

      {/* Error alert */}
      {error && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#dc2626',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Updating indicator when refetching */}
      {loading && flatVariants.length > 0 && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 14px',
          borderRadius: 6,
          background: 'rgba(249, 115, 22, 0.1)',
          border: '1px solid rgba(249, 115, 22, 0.25)',
          color: 'var(--fpt-orange)',
          fontSize: '12.5px',
          fontWeight: 600,
          marginBottom: 10
        }}>
          <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span>
          <span>Đang cập nhật thông số kỹ thuật…</span>
        </div>
      )}

      {/* Table Container */}
      <div
        className="products-clean-table-card"
        style={{
          opacity: loading && flatVariants.length > 0 ? 0.75 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        <table className="products-clean-table">
          <thead>
            <tr>
              <th style={{ width: '22%' }}>Sản phẩm cha</th>
              <th style={{ width: '20%' }}>Biến thể SKU</th>
              <th style={{ width: '15%' }}>Kích thước (R × C × S)</th>
              <th style={{ width: '10%' }}>Dung tích</th>
              <th style={{ width: '15%' }}>Khối lượng &amp; Tải trọng</th>
              <th style={{ width: '10%' }}>Phân cấp</th>
              <th style={{ width: '8%' }}>Bảo hành</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && flatVariants.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={18} className="spin" />
                    <span>Đang tải thông số kỹ thuật các biến thể…</span>
                  </div>
                </td>
              </tr>
            ) : filteredVariants.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div className="products-clean-empty">
                    <div className="products-clean-empty-icon">
                      <Sliders size={22} />
                    </div>
                    <p style={{ margin: '8px 0 0', fontWeight: 600 }}>
                      {products.length === 0
                        ? 'Chưa có sản phẩm & biến thể nào trong hệ thống'
                        : 'Không tìm thấy biến thể nào phù hợp bộ lọc'}
                    </p>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {products.length === 0
                        ? 'Dữ liệu sản phẩm vừa được làm mới. Bạn có thể khởi tạo nhanh các dòng tủ SmartBox tiêu chuẩn với đầy đủ kích thước, tải trọng và cảm biến cân điện tử để kiểm thử ngay.'
                        : 'Thử tìm với từ khóa khác hoặc bỏ chọn bộ lọc để xem toàn bộ danh sách.'}
                    </span>

                    {products.length === 0 && (
                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: 12 }}>
                        <button
                          type="button"
                          className="btn-primary-compact"
                          disabled={seeding}
                          onClick={handleSeedStandardProducts}
                        >
                          <Sparkles size={16} />
                          <span>{seeding ? 'Đang khởi tạo…' : 'Khởi tạo dòng SmartBox tiêu chuẩn'}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          onClick={() => navigate('/products')}
                        >
                          <Box size={16} />
                          <span>Đến trang tạo sản phẩm</span>
                        </button>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredVariants.map((item) => {
                const v = item.variant;
                const hasDimensions = v.width_cm && v.height_cm && v.depth_cm;
                const isPro = v.model_tier === 'PRO' || v.has_weight_sensor;

                return (
                  <tr key={v.id}>
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {item.productName}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {item.productSku}
                        </div>
                      </div>
                    </td>

                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {v.variant_name || v.name}
                        </div>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span
                            style={{
                              fontFamily: 'monospace',
                              fontSize: '11px',
                              background: 'var(--bg-surface)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            {v.sku}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      {hasDimensions ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px' }}>
                          <Maximize2 size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          <span style={{ fontWeight: 500 }}>
                            {v.width_cm} × {v.height_cm} × {v.depth_cm} cm
                          </span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#f59e0b', fontStyle: 'italic' }}>
                          Chưa có số đo
                        </span>
                      )}
                    </td>

                    <td>
                      {v.capacity_liter ? (
                        <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {v.capacity_liter} L
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>-</span>
                      )}
                    </td>

                    <td>
                      <div style={{ fontSize: '12.5px' }}>
                        <div>
                          Nặng: <strong>{v.weight_kg != null ? `${v.weight_kg} kg` : '-'}</strong>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          Tải tối đa: {v.max_load_kg != null ? `${v.max_load_kg} kg` : '-'}
                        </div>
                      </div>
                    </td>

                    <td>
                      {isPro ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#2563eb',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 700
                          }}
                        >
                          <Scale size={12} />
                          <span>PRO</span>
                        </span>
                      ) : (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            background: 'var(--bg-surface)',
                            color: 'var(--text-muted)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 600,
                            border: '1px solid var(--border-subtle)'
                          }}
                        >
                          BASE
                        </span>
                      )}
                    </td>

                    <td>
                      <span style={{ fontSize: '12.5px', fontWeight: 500 }}>
                        {v.warranty_months ? `${v.warranty_months} tháng` : '24 tháng'}
                      </span>
                    </td>

                    <td style={{ textAlign: 'center' }}>
                      {canEditSpecs ? (
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => openEditModal(item)}
                          title="Chỉnh sửa thông số kích thước & tải trọng"
                        >
                          <Edit2 size={13} />
                          <span>Sửa</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary-compact"
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                          onClick={() => openEditModal(item)}
                          title="Xem chi tiết thông số kích thước & tải trọng (Chỉ xem)"
                        >
                          <Maximize2 size={13} />
                          <span>Xem</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Specifications Modal */}
      {editModalOpen && editingItem && (
        <div className="clean-modal-overlay" onClick={() => !submitting && setEditModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <h3 style={{ margin: 0 }}>
                    {canEditSpecs ? 'Cập Nhật Thông Số Kỹ Thuật' : 'Chi Tiết Thông Số Kỹ Thuật'}
                  </h3>
                  {!canEditSpecs && (
                    <span
                      className="clean-badge"
                      style={{
                        background: 'rgba(59, 130, 246, 0.12)',
                        color: '#2563eb',
                        border: '1px solid rgba(59, 130, 246, 0.25)',
                        fontSize: '11px',
                        padding: '2px 8px'
                      }}
                    >
                      Chế độ tra cứu (Chỉ xem)
                    </span>
                  )}
                </div>
                <p style={{ margin: '3px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                  {editingItem.productName} · <strong style={{ fontFamily: 'monospace' }}>{editingItem.variant.sku}</strong>
                </p>
              </div>
              <button
                type="button"
                className="action-icon-btn"
                disabled={submitting}
                onClick={() => setEditModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSpecs}>
              <div className="clean-modal-body">
                {modalError && (
                  <div role="alert" style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                    <span>{modalError}</span>
                  </div>
                )}
                {/* Hardware Tier */}
                <div className="clean-form-row">
                  <label>
                    Phân cấp phần cứng &amp; Cảm biến <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    className="clean-form-select"
                    value={form.modelTier}
                    onChange={(e) => setForm({ ...form, modelTier: e.target.value })}
                    disabled={submitting || !canEditSpecs}
                  >
                    <option value="BASE">Base · Tiêu chuẩn (Khóa chốt điện từ, không có cảm biến cân)</option>
                    <option value="PRO">Pro · Cao cấp (Tích hợp cảm biến cân trọng lượng điện tử)</option>
                  </select>
                </div>

                {/* 3 Dimensions */}
                <div className="clean-form-row">
                  <label>
                    Kích thước 3 chiều thực tế (cm) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                        Rộng (Width - cm)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="300"
                        className="clean-form-input"
                        placeholder="VD: 48"
                        value={form.widthCm}
                        onChange={(e) => setForm({ ...form, widthCm: e.target.value })}
                        disabled={submitting || !canEditSpecs}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                        Cao (Height - cm)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="300"
                        className="clean-form-input"
                        placeholder="VD: 95"
                        value={form.heightCm}
                        onChange={(e) => setForm({ ...form, heightCm: e.target.value })}
                        disabled={submitting || !canEditSpecs}
                      />
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '3px' }}>
                        Sâu (Depth - cm)
                      </span>
                      <input
                        type="number"
                        step="0.1"
                        min="5"
                        max="300"
                        className="clean-form-input"
                        placeholder="VD: 42"
                        value={form.depthCm}
                        onChange={(e) => setForm({ ...form, depthCm: e.target.value })}
                        disabled={submitting || !canEditSpecs}
                      />
                    </div>
                  </div>
                </div>

                {/* Capacity & Weight & MaxLoad */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                  <div className="clean-form-row">
                    <label>Dung tích buồng (L)</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="1000"
                      className="clean-form-input"
                      placeholder="VD: 70"
                      value={form.capacityLiter}
                      onChange={(e) => setForm({ ...form, capacityLiter: e.target.value })}
                      disabled={submitting || !canEditSpecs}
                    />
                  </div>

                  <div className="clean-form-row">
                    <label>Khối lượng vỏ (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="500"
                      className="clean-form-input"
                      placeholder="VD: 22"
                      value={form.weightKg}
                      onChange={(e) => setForm({ ...form, weightKg: e.target.value })}
                      disabled={submitting || !canEditSpecs}
                    />
                  </div>

                  <div className="clean-form-row">
                    <label>Tải trọng tối đa (kg)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="1000"
                      className="clean-form-input"
                      placeholder="VD: 50"
                      value={form.maxLoadKg}
                      onChange={(e) => setForm({ ...form, maxLoadKg: e.target.value })}
                      disabled={submitting || !canEditSpecs}
                    />
                  </div>
                </div>

                {/* Warranty Months */}
                <div className="clean-form-row">
                  <label>
                    Thời hạn bảo hành tiêu chuẩn (tháng) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="120"
                    required
                    className="clean-form-input"
                    placeholder="VD: 24"
                    value={form.warrantyMonths}
                    onChange={(e) => setForm({ ...form, warrantyMonths: e.target.value })}
                    disabled={submitting || !canEditSpecs}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Thời hạn này sẽ tự động gán vào thiết bị khi đơn hàng được nghiệm thu và tạo hồ sơ bảo hành.
                  </span>
                </div>

                {/* Images */}
                <div className="clean-form-row">
                  <label>Hình ảnh riêng cho phiên bản (mỗi dòng một URL)</label>
                  <textarea
                    rows={3}
                    className="clean-form-textarea"
                    placeholder="https://.../variant-image-1.jpg&#10;https://.../variant-image-2.jpg"
                    value={form.imagesText}
                    onChange={(e) => setForm({ ...form, imagesText: e.target.value })}
                    disabled={submitting || !canEditSpecs}
                    style={{ fontSize: '12px', fontFamily: 'monospace' }}
                  />
                </div>
              </div>

              <div className="clean-modal-footer">
                {!canEditSpecs ? (
                  <button
                    type="button"
                    className="btn-primary-compact"
                    onClick={() => setEditModalOpen(false)}
                  >
                    Đóng
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn-secondary-compact"
                      disabled={submitting}
                      onClick={() => setEditModalOpen(false)}
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="btn-primary-compact"
                      disabled={submitting}
                    >
                      {submitting ? 'Đang lưu…' : 'Lưu thông số kỹ thuật'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
