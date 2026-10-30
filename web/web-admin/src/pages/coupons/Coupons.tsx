import React, { useState, useEffect, useMemo } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Check,
  AlertCircle,
  Copy,
  Percent,
  Calendar,
  X,
  Power,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { couponService, CouponItem, CouponRequest } from '../../services/couponService';
import { toast } from '../../contexts/ToastContext';
import '../catalog/products.css';

export const CouponsPage: React.FC = () => {
  const [coupons, setCoupons] = useState<CouponItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  // Form Fields
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState<string>('10');
  const [minOrderValue, setMinOrderValue] = useState<string>('0');
  const [maxDiscount, setMaxDiscount] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [usageLimit, setUsageLimit] = useState<string>('100');
  const [isActive, setIsActive] = useState<boolean>(true);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [couponToDelete, setCouponToDelete] = useState<CouponItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showToast = (msg: string) => {
    toast.success(msg);
  };

  const loadCoupons = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await couponService.getCoupons();
      setCoupons(data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách mã giảm giá.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setCode('');
    setDescription('');
    setDiscountType('percentage');
    setDiscountValue('10');
    setMinOrderValue('0');
    setMaxDiscount('');
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    setStartDate(today);
    setEndDate(nextMonth);
    setUsageLimit('100');
    setIsActive(true);
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (item: CouponItem) => {
    setModalMode('edit');
    setEditingId(item.id);
    setCode(item.code);
    setDescription(item.description || '');
    setDiscountType(item.discountType);
    setDiscountValue(String(item.discountValue));
    setMinOrderValue(item.minOrderValue != null ? String(item.minOrderValue) : '0');
    setMaxDiscount(item.maxDiscount != null ? String(item.maxDiscount) : '');
    setStartDate(item.startDate ? item.startDate.split('T')[0] : '');
    setEndDate(item.endDate ? item.endDate.split('T')[0] : '');
    setUsageLimit(String(item.usageLimit));
    setIsActive(item.isActive);
    setModalError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setModalError('Vui lòng nhập mã ưu đãi / khuyến mãi.');
      return;
    }
    if (cleanCode.length > 50) {
      setModalError('Mã ưu đãi không được vượt quá 50 ký tự.');
      return;
    }

    if (!startDate || !endDate) {
      setModalError('Vui lòng chọn thời gian bắt đầu và kết thúc hiệu lực.');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setModalError('Ngày kết thúc phải diễn ra sau ngày bắt đầu.');
      return;
    }

    const dVal = Number(discountValue);
    if (isNaN(dVal) || dVal <= 0) {
      setModalError('Mức giảm giá phải lớn hơn 0.');
      return;
    }

    if (discountType === 'percentage' && dVal > 100) {
      setModalError('Tỷ lệ phần trăm giảm giá không được vượt quá 100%.');
      return;
    }

    setSubmitting(true);
    setModalError('');

    try {
      const payload: CouponRequest = {
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
        discountType,
        discountValue: dVal,
        minOrderValue: minOrderValue ? Number(minOrderValue) : 0,
        maxDiscount: maxDiscount ? Number(maxDiscount) : undefined,
        startDate: `${startDate}T00:00:00Z`,
        endDate: `${endDate}T23:59:59Z`,
        usageLimit: Number(usageLimit) || 100,
        isActive
      };

      if (modalMode === 'create') {
        await couponService.createCoupon(payload);
        showToast(`Tạo mã ưu đãi "${payload.code}" thành công!`);
      } else if (editingId) {
        await couponService.updateCoupon(editingId, payload);
        showToast(`Cập nhật mã "${payload.code}" thành công!`);
      }

      setModalOpen(false);
      await loadCoupons();
    } catch (err: any) {
      setModalError(err?.message || 'Không thể lưu thông tin mã giảm giá.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = async (item: CouponItem) => {
    try {
      const res = await couponService.toggleCoupon(item.id);
      setCoupons(prev => prev.map(c => c.id === item.id ? { ...c, isActive: res.isActive } : c));
      showToast(res.isActive ? `Đã kích hoạt mã "${item.code}"` : `Đã tạm dừng mã "${item.code}"`);
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi hệ thống', 'Không thể cập nhật trạng thái');
    }
  };

  const openDeleteModal = (item: CouponItem) => {
    setCouponToDelete(item);
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!couponToDelete || deleting) return;
    setDeleting(true);
    try {
      await couponService.deleteCoupon(couponToDelete.id);
      showToast(`Đã xóa mã giảm giá "${couponToDelete.code}"`);
      setDeleteModalOpen(false);
      setCouponToDelete(null);
      await loadCoupons();
    } catch (err: any) {
      toast.error(err?.message || 'Lỗi hệ thống', 'Xóa thất bại');
    } finally {
      setDeleting(false);
    }
  };

  const copyCode = (val: string) => {
    navigator.clipboard.writeText(val);
    showToast(`Đã sao chép mã: ${val}`);
  };

  // Helper date status
  const getValidityStatus = (startStr: string, endStr: string, active: boolean) => {
    if (!active) return { label: 'Tạm dừng', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)' };
    const now = new Date();
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (now < start) return { label: 'Sắp diễn ra', color: '#2563eb', bg: 'rgba(37, 99, 235, 0.1)' };
    if (now > end) return { label: 'Đã hết hạn', color: '#dc2626', bg: 'rgba(239, 68, 68, 0.1)' };
    return { label: 'Đang áp dụng', color: '#16a34a', bg: 'rgba(22, 163, 74, 0.1)' };
  };

  // Filtered coupons
  const filteredCoupons = useMemo(() => {
    return coupons.filter((item) => {
      // Type
      if (selectedType !== 'all' && item.discountType !== selectedType) return false;
      // Status
      if (selectedStatus === 'active' && !item.isActive) return false;
      if (selectedStatus === 'inactive' && item.isActive) return false;
      if (selectedStatus === 'expired') {
        const end = new Date(item.endDate);
        if (end >= new Date()) return false;
      }
      // Search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchCode = item.code.toLowerCase().includes(q);
        const matchDesc = (item.description || '').toLowerCase().includes(q);
        if (!matchCode && !matchDesc) return false;
      }
      return true;
    });
  }, [coupons, selectedType, selectedStatus, searchTerm]);

  // Metrics
  const totalCount = coupons.length;
  const activeCount = coupons.filter(c => c.isActive && new Date(c.endDate) >= new Date()).length;
  const expiredCount = coupons.filter(c => !c.isActive || new Date(c.endDate) < new Date()).length;
  const totalUsed = coupons.reduce((sum, c) => sum + (c.usedCount || 0), 0);

  return (
    <div className="products-page">
      {/* Toast Alert */}
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

      {/* Topbar */}
      <div className="products-topbar">
        <div className="products-topbar-title">
          <h1>
            <span>Quản Lý Mã Giảm Giá &amp; Coupon</span>
            <span className="products-topbar-count">{totalCount} mã</span>
          </h1>
          <p className="products-topbar-desc">
            Cấu hình voucher khuyến mãi, tỷ lệ chiết khấu, giá trị đơn tối thiểu và thời hạn áp dụng đơn hàng SmartBox.
          </p>
        </div>

        <div className="products-topbar-actions">
          <button
            type="button"
            className="icon-btn-clean"
            onClick={loadCoupons}
            title="Làm mới danh sách"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>

          <button
            type="button"
            className="btn-primary-compact"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            <span>Tạo mã giảm giá</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="products-stats-bar">
        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tổng số mã</span>
            <span className="products-stat-value">{totalCount}</span>
            <span className="products-stat-sub">Đã cấu hình</span>
          </div>
          <div className="products-stat-icon">
            <Ticket size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Đang áp dụng</span>
            <span className="products-stat-value">{activeCount}</span>
            <span className="products-stat-sub">Khách có thể sử dụng</span>
          </div>
          <div className="products-stat-icon success">
            <Check size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tạm dừng / Hết hạn</span>
            <span className="products-stat-value">{expiredCount}</span>
            <span className="products-stat-sub">Không thể áp dụng</span>
          </div>
          <div className="products-stat-icon warning">
            <Calendar size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Lượt đã sử dụng</span>
            <span className="products-stat-value">{totalUsed}</span>
            <span className="products-stat-sub">Lượt dùng thực tế</span>
          </div>
          <div className="products-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#2563eb' }}>
            <Percent size={18} />
          </div>
        </div>
      </div>

      {/* Toolbar Filter */}
      <div className="products-toolbar-clean">
        <div className="products-toolbar-left">
          <div className="products-search-input-wrap">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="products-search-input"
              placeholder="Tìm theo mã voucher hoặc nội dung ưu đãi…"
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
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="all">Tất cả hình thức giảm</option>
            <option value="percentage">Giảm theo tỷ lệ (%)</option>
            <option value="fixed_amount">Giảm số tiền cố định (₫)</option>
          </select>

          <select
            className="products-select-clean"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang kích hoạt</option>
            <option value="inactive">Đang tạm dừng</option>
            <option value="expired">Đã hết hạn</option>
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

      {/* Table Card */}
      <div
        className="products-clean-table-card"
        style={{
          opacity: loading && coupons.length > 0 ? 0.75 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        <table className="products-clean-table">
          <thead>
            <tr>
              <th style={{ width: '18%' }}>Mã Coupon</th>
              <th style={{ width: '25%' }}>Mức ưu đãi</th>
              <th style={{ width: '15%' }}>Đơn tối thiểu</th>
              <th style={{ width: '18%' }}>Hiệu lực</th>
              <th style={{ width: '12%' }}>Lượt sử dụng</th>
              <th style={{ width: '10%', textAlign: 'center' }}>Trạng thái</th>
              <th style={{ width: '90px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && coupons.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={18} className="spin" />
                    <span>Đang tải danh sách mã giảm giá…</span>
                  </div>
                </td>
              </tr>
            ) : filteredCoupons.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: 'center', padding: '48px 20px' }}>
                  <div className="products-clean-empty">
                    <div className="products-clean-empty-icon">
                      <Ticket size={24} />
                    </div>
                    <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Không tìm thấy mã giảm giá nào</p>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {searchTerm ? 'Thử tìm với từ khóa khác' : 'Nhấn nút "Tạo mã giảm giá" để khởi tạo ưu đãi đầu tiên'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCoupons.map((item) => {
                const validity = getValidityStatus(item.startDate, item.endDate, item.isActive);
                const percentUsed = item.usageLimit > 0 ? Math.min(100, Math.round((item.usedCount / item.usageLimit) * 100)) : 0;

                return (
                  <tr key={item.id}>
                    {/* Code */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            fontFamily: 'monospace',
                            fontWeight: 700,
                            fontSize: '13px',
                            background: 'var(--bg-surface)',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--fpt-orange)',
                            letterSpacing: '0.04em'
                          }}
                        >
                          {item.code}
                        </span>
                        <button
                          type="button"
                          className="action-icon-btn"
                          style={{ width: 24, height: 24 }}
                          onClick={() => copyCode(item.code)}
                          title="Sao chép mã"
                        >
                          <Copy size={12} />
                        </button>
                      </div>
                    </td>

                    {/* Discount & Description */}
                    <td>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>
                          {item.discountType === 'percentage'
                            ? `Giảm ${item.discountValue}% ${item.maxDiscount ? `(Tối đa ${Number(item.maxDiscount).toLocaleString('vi-VN')} ₫)` : ''}`
                            : `Giảm ${Number(item.discountValue).toLocaleString('vi-VN')} ₫`}
                        </div>
                        {item.description && (
                          <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: 2 }}>
                            {item.description}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Min Order Value */}
                    <td>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                        {item.minOrderValue && Number(item.minOrderValue) > 0
                          ? `${Number(item.minOrderValue).toLocaleString('vi-VN')} ₫`
                          : 'Không giới hạn'}
                      </span>
                    </td>

                    {/* Validity Period */}
                    <td>
                      <div style={{ fontSize: '12px' }}>
                        <div>
                          {item.startDate ? item.startDate.split('T')[0] : '—'} <ArrowRight size={11} style={{ verticalAlign: 'middle', margin: '0 2px' }} /> {item.endDate ? item.endDate.split('T')[0] : '—'}
                        </div>
                        <span
                          style={{
                            display: 'inline-block',
                            marginTop: 4,
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: '10.5px',
                            fontWeight: 600,
                            color: validity.color,
                            background: validity.bg
                          }}
                        >
                          {validity.label}
                        </span>
                      </div>
                    </td>

                    {/* Usage count */}
                    <td>
                      <div>
                        <div style={{ fontSize: '12px', fontWeight: 600 }}>
                          {item.usedCount} / {item.usageLimit}
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: 4,
                            background: 'var(--border-subtle)',
                            borderRadius: 2,
                            marginTop: 4,
                            overflow: 'hidden'
                          }}
                        >
                          <div
                            style={{
                              width: `${percentUsed}%`,
                              height: '100%',
                              background: percentUsed >= 90 ? '#ef4444' : 'var(--fpt-orange)',
                              borderRadius: 2
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Status Toggle */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handleToggle(item)}
                        title={item.isActive ? 'Nhấn để tạm dừng' : 'Nhấn để kích hoạt'}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 8px',
                          borderRadius: 6,
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          border: 'none',
                          background: item.isActive ? 'rgba(22, 163, 74, 0.12)' : 'rgba(100, 116, 139, 0.12)',
                          color: item.isActive ? '#16a34a' : '#64748b',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <Power size={11} />
                        <span>{item.isActive ? 'Bật' : 'Tắt'}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          className="action-icon-btn"
                          onClick={() => openEditModal(item)}
                          title="Chỉnh sửa mã giảm giá"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          className="action-icon-btn danger"
                          onClick={() => openDeleteModal(item)}
                          title="Xóa mã giảm giá"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="clean-modal-overlay" onClick={() => !submitting && setModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 640, width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3>{modalMode === 'create' ? 'Tạo Mã Giảm Giá Mới' : `Chỉnh Sửa Mã: ${code}`}</h3>
              <button
                type="button"
                className="action-icon-btn"
                disabled={submitting}
                onClick={() => setModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSave}>
              <div className="clean-modal-body">
                {modalError && (
                  <div role="alert" style={{ padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertCircle size={15} style={{ flexShrink: 0 }} />
                    <span>{modalError}</span>
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 12 }}>
                  <div className="clean-form-row">
                    <label>
                      Mã Voucher * <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>(In hoa, viết liền)</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={30}
                      className="clean-form-input"
                      style={{ textTransform: 'uppercase', fontFamily: 'monospace', fontWeight: 600 }}
                      placeholder="VD: SMARTBOX2026"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="clean-form-row">
                    <label>Loại chiết khấu *</label>
                    <select
                      className="clean-form-select"
                      value={discountType}
                      onChange={(e) => setDiscountType(e.target.value as any)}
                      disabled={submitting}
                    >
                      <option value="percentage">Phần trăm (%)</option>
                      <option value="fixed_amount">Số tiền cố định (₫)</option>
                    </select>
                  </div>
                </div>

                <div className="clean-form-row">
                  <label>Mô tả ưu đãi</label>
                  <input
                    type="text"
                    maxLength={150}
                    className="clean-form-input"
                    placeholder="VD: Giảm 10% tối đa 100k cho khách hàng đặt mua tủ SmartBox"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="clean-form-row">
                    <label>
                      Mức giảm giá * {discountType === 'percentage' ? '(%)' : '(₫)'}
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={discountType === 'percentage' ? 100 : 100000000}
                      step={discountType === 'percentage' ? 1 : 1000}
                      className="clean-form-input"
                      placeholder={discountType === 'percentage' ? 'VD: 10' : 'VD: 50000'}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="clean-form-row">
                    <label>Đơn tối thiểu (₫)</label>
                    <input
                      type="number"
                      min={0}
                      step={10000}
                      className="clean-form-input"
                      placeholder="VD: 500000 (0 = không áp dụng)"
                      value={minOrderValue}
                      onChange={(e) => setMinOrderValue(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                {discountType === 'percentage' && (
                  <div className="clean-form-row">
                    <label>Mức giảm tối đa (₫)</label>
                    <input
                      type="number"
                      min={1000}
                      step={10000}
                      className="clean-form-input"
                      placeholder="VD: 200000 (để trống nếu không giới hạn)"
                      value={maxDiscount}
                      onChange={(e) => setMaxDiscount(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                )}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="clean-form-row">
                    <label>Ngày bắt đầu *</label>
                    <input
                      type="date"
                      required
                      className="clean-form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="clean-form-row">
                    <label>Ngày kết thúc *</label>
                    <input
                      type="date"
                      required
                      className="clean-form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      disabled={submitting}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, alignItems: 'center' }}>
                  <div className="clean-form-row">
                    <label>Giới hạn số lần dùng *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={1000000}
                      className="clean-form-input"
                      placeholder="VD: 100"
                      value={usageLimit}
                      onChange={(e) => setUsageLimit(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div style={{ paddingTop: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(e) => setIsActive(e.target.checked)}
                        disabled={submitting}
                        style={{ width: 16, height: 16, accentColor: 'var(--fpt-orange)' }}
                      />
                      <span>Kích hoạt mã ưu đãi ngay</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="clean-modal-footer">
                <button
                  type="button"
                  className="btn-secondary-compact"
                  disabled={submitting}
                  onClick={() => setModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn-primary-compact"
                  disabled={submitting || !code.trim()}
                >
                  {submitting ? 'Đang lưu…' : modalMode === 'create' ? 'Tạo mã voucher' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && couponToDelete && (
        <div className="clean-modal-overlay" onClick={() => !deleting && setDeleteModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <ShieldAlert size={18} />
                <span>Xác nhận xóa mã ưu đãi</span>
              </h3>
              <button
                type="button"
                className="action-icon-btn"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="clean-modal-body">
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa mã giảm giá <strong>"{couponToDelete.code}"</strong>?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Sau khi xóa, khách hàng sẽ không thể nhập mã này tại bước thanh toán đơn hàng.
              </p>
            </div>

            <div className="clean-modal-footer">
              <button
                type="button"
                className="btn-secondary-compact"
                disabled={deleting}
                onClick={() => setDeleteModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="btn-primary-compact"
                style={{ background: '#dc2626' }}
                disabled={deleting}
                onClick={handleDelete}
              >
                {deleting ? 'Đang xóa…' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
