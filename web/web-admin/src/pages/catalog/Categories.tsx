import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  RefreshCw,
  Tag,
  Check,
  AlertCircle,
  Copy,
  Box,
  Wrench,
  ShieldAlert,
  X,
  User
} from 'lucide-react';
import { ProductCategory } from '../../types/database';
import { productsService } from '../../services/api';
import './products.css';

export const Categories: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [productManagers, setProductManagers] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [error, setError] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string>('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Create / Edit Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string>('');

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<ProductCategory | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const autoGenerateSlug = (text: string) => {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const loadCategories = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await productsService.getCategories();
      setCategories(data || []);
    } catch (err: any) {
      setError(err?.message || 'Không thể tải danh sách loại sản phẩm.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
    productsService.getProductManagers().then(setProductManagers).catch(() => []);
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    if (modalMode === 'create') {
      setSlug(autoGenerateSlug(val));
    }
  };

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setManagerId('');
    setModalError('');
    setModalOpen(true);
  };

  const openEditModal = (cat: ProductCategory) => {
    setModalMode('edit');
    setEditingId(cat.id);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setManagerId(cat.manager_id || cat.managerId || '');
    setModalError('');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting || !name.trim()) return;

    setSubmitting(true);
    setModalError('');
    try {
      const finalSlug = slug.trim() || autoGenerateSlug(name);
      if (modalMode === 'create') {
        await productsService.createCategory({
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || undefined,
          managerId: managerId || null
        });
        showToast('Tạo mới danh mục thành công!');
      } else if (editingId) {
        await productsService.updateCategory(editingId, {
          name: name.trim(),
          slug: finalSlug,
          description: description.trim() || undefined,
          managerId: managerId || null
        });
        showToast('Cập nhật thông tin danh mục thành công!');
      }
      setModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setModalError('Thao tác thất bại: ' + (err?.message || 'Lỗi hệ thống'));
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (cat: ProductCategory) => {
    setCategoryToDelete(cat);
    setDeleteError('');
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!categoryToDelete || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await productsService.deleteCategory(categoryToDelete.id);
      showToast(`Đã xóa danh mục "${categoryToDelete.name}".`);
      setDeleteModalOpen(false);
      setCategoryToDelete(null);
      await loadCategories();
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('CATEGORY_IN_USE')) {
        setDeleteError('Không thể xóa danh mục này vì đang có sản phẩm liên kết. Vui lòng chuyển hoặc xóa các sản phẩm thuộc danh mục trước.');
      } else {
        setDeleteError('Xóa danh mục thất bại: ' + msg);
      }
    } finally {
      setDeleting(false);
    }
  };

  const copySlug = (val: string) => {
    navigator.clipboard.writeText(val);
    showToast(`Đã sao chép slug: ${val}`);
  };

  // Filtered categories
  const filteredCategories = useMemo(() => {
    const q = debouncedSearchTerm.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.description && c.description.toLowerCase().includes(q))
    );
  }, [categories, debouncedSearchTerm]);

  // Category Icon helper
  const getCategoryIcon = (slugStr: string) => {
    if (slugStr.includes('linh-kien') || slugStr.includes('sua-chua')) {
      return <Wrench size={16} style={{ color: '#0284c7' }} />;
    }
    if (slugStr.includes('phu-kien') || slugStr.includes('tien-ich')) {
      return <Tag size={16} style={{ color: '#8b5cf6' }} />;
    }
    return <Box size={16} style={{ color: 'var(--fpt-orange)' }} />;
  };

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

      {/* Page Header */}
      <div className="products-topbar">
        <div className="products-topbar-title">
          <h1>
            <span>Danh Mục Sản Phẩm</span>
            <span className="products-topbar-count">{categories.length}</span>
          </h1>
          <p className="products-topbar-desc">
            Phân loại thiết bị tủ SmartBox, phụ tùng linh kiện sửa chữa và tiện ích mở rộng.
          </p>
        </div>

        <div className="products-topbar-actions">
          <button
            type="button"
            className="icon-btn-clean"
            onClick={loadCategories}
            title="Làm mới danh mục"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
          </button>

          <button
            type="button"
            className="btn-primary-compact"
            onClick={openCreateModal}
          >
            <Plus size={16} />
            <span>Thêm danh mục</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="products-stats-bar">
        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tổng danh mục</span>
            <span className="products-stat-value">{categories.length}</span>
            <span className="products-stat-sub">Đã cấu hình trên hệ thống</span>
          </div>
          <div className="products-stat-icon">
            <Layers size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Tủ nhận hàng chính</span>
            <span className="products-stat-value">
              {categories.filter((c) => c.slug.includes('smartbox') || c.slug.includes('tu-nhan-hang') || c.slug.includes('hop-nhan-hang')).length}
            </span>
            <span className="products-stat-sub">Tủ hoàn chỉnh</span>
          </div>
          <div className="products-stat-icon success">
            <Box size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Linh kiện & Sửa chữa</span>
            <span className="products-stat-value">
              {categories.filter((c) => c.slug.includes('linh-kien')).length}
            </span>
            <span className="products-stat-sub">Bo mạch, cảm biến, khóa chốt</span>
          </div>
          <div className="products-stat-icon">
            <Wrench size={18} />
          </div>
        </div>

        <div className="products-stat-tile">
          <div className="products-stat-info">
            <span className="products-stat-label">Phụ kiện & Tiện ích</span>
            <span className="products-stat-value">
              {categories.filter((c) => c.slug.includes('phu-kien')).length}
            </span>
            <span className="products-stat-sub">Mái che, đèn LED, chân đế</span>
          </div>
          <div className="products-stat-icon">
            <Tag size={18} />
          </div>
        </div>
      </div>

      {/* Filter / Search Toolbar */}
      <div className="products-toolbar-clean">
        <div className="products-search-input-wrap" style={{ maxWidth: 420 }}>
          <Search size={15} className="search-icon" />
          <input
            type="text"
            className="products-search-input"
            placeholder="Tìm theo tên hoặc slug danh mục…"
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
      </div>

      {/* Error Banner */}
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
      {loading && categories.length > 0 && (
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
          <span>Đang cập nhật danh sách danh mục…</span>
        </div>
      )}

      {/* Categories Table */}
      <div
        className="products-clean-table-card"
        style={{
          opacity: loading && categories.length > 0 ? 0.75 : 1,
          transition: 'opacity 0.2s ease'
        }}
      >
        <table className="products-clean-table">
          <thead>
            <tr>
              <th style={{ width: '28%' }}>Danh mục</th>
              <th style={{ width: '18%' }}>Đường dẫn (Slug)</th>
              <th style={{ width: '24%' }}>Quản lý phụ trách (PO)</th>
              <th>Mô tả chi tiết</th>
              <th style={{ width: '110px', textAlign: 'center' }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {loading && categories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)' }}>
                    <RefreshCw size={18} className="spin" />
                    <span>Đang tải danh mục từ hệ thống…</span>
                  </div>
                </td>
              </tr>
            ) : filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0' }}>
                  <div className="products-clean-empty">
                    <div className="products-clean-empty-icon">
                      <Layers size={22} />
                    </div>
                    <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Không tìm thấy danh mục nào</p>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {searchTerm ? 'Thử tìm với từ khóa khác' : 'Nhấn nút "Thêm danh mục" ở trên để tạo mới'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => (
                <tr key={cat.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: 'var(--bg-surface)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0
                        }}
                      >
                        {getCategoryIcon(cat.slug)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                          {cat.name}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <code className="product-sku-code">
                        {cat.slug}
                      </code>
                      <button
                        type="button"
                        onClick={() => copySlug(cat.slug)}
                        title="Sao chép slug"
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          padding: 2,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Copy size={13} />
                      </button>
                    </div>
                  </td>

                  <td>
                    {(() => {
                      const mId = cat.manager_id || cat.managerId;
                      const assignedPo = productManagers.find((pm) => pm.id === mId);
                      const poName = assignedPo ? assignedPo.fullName : cat.manager_name;
                      if (!poName) {
                        return (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                            Chưa phân công
                          </span>
                        );
                      }
                      return (
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            background: 'rgba(59, 130, 246, 0.08)',
                            border: '1px solid rgba(59, 130, 246, 0.22)',
                            color: '#2563eb',
                            fontSize: '12px',
                            fontWeight: 600
                          }}
                        >
                          <User size={13} />
                          <span>{poName}</span>
                        </div>
                      );
                    })()}
                  </td>

                  <td>
                    <span style={{ fontSize: '12.5px', color: cat.description ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                      {cat.description || 'Chưa có thông tin mô tả chi tiết'}
                    </span>
                  </td>

                  <td style={{ textAlign: 'center' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="action-icon-btn"
                        onClick={() => openEditModal(cat)}
                        title="Chỉnh sửa danh mục"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        className="action-icon-btn danger"
                        onClick={() => openDeleteModal(cat)}
                        title="Xóa danh mục"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="clean-modal-overlay" onClick={() => !submitting && setModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3>{modalMode === 'create' ? 'Thêm Danh Mục Mới' : 'Chỉnh Sửa Danh Mục'}</h3>
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
                <div className="clean-form-row">
                  <label>
                    Tên danh mục <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    className="clean-form-input"
                    placeholder="VD: Phụ Kiện và Tiện Ích Mở Rộng"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="clean-form-row">
                  <label>
                    Đường dẫn định danh (Slug) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    className="clean-form-input"
                    placeholder="VD: phu-kien-tien-ich"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    disabled={submitting}
                    style={{ fontFamily: 'monospace' }}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', display: 'block' }}>
                    Chỉ dùng chữ cái thường không dấu, số và dấu gạch nối (-).
                  </span>
                </div>

                <div className="clean-form-row">
                  <label>Mô tả danh mục</label>
                  <textarea
                    rows={3}
                    maxLength={300}
                    className="clean-form-textarea"
                    placeholder="Mô tả mục đích sử dụng hoặc các sản phẩm thuộc danh mục này…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={submitting}
                  />
                </div>

                <div className="clean-form-row">
                  <label>
                    Quản lý phụ trách (PO)
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>
                      (Phụ trách thẩm định các đơn hàng chứa sản phẩm thuộc danh mục này)
                    </span>
                  </label>
                  <select
                    className="clean-form-select"
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    disabled={submitting}
                  >
                    <option value="">-- Chưa phân công (Chung hệ thống) --</option>
                    {productManagers.map((pm) => (
                      <option key={pm.id} value={pm.id}>
                        {pm.fullName} ({pm.email})
                      </option>
                    ))}
                  </select>
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
                  disabled={submitting || !name.trim()}
                >
                  {submitting ? 'Đang lưu…' : modalMode === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && categoryToDelete && (
        <div className="clean-modal-overlay" onClick={() => !deleting && setDeleteModalOpen(false)}>
          <div className="clean-modal-box" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div className="clean-modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                <ShieldAlert size={18} />
                <span>Xác nhận xóa danh mục</span>
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
              {deleteError && (
                <div role="alert" style={{ marginBottom: 12, padding: '10px 14px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#dc2626', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <AlertCircle size={15} style={{ flexShrink: 0 }} />
                  <span>{deleteError}</span>
                </div>
              )}
              <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                Bạn có chắc chắn muốn xóa danh mục <strong>"{categoryToDelete.name}"</strong>?
              </p>
              <p style={{ margin: '8px 0 0', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Nếu danh mục đang chứa sản phẩm, hệ thống sẽ ngăn chặn thao tác để bảo vệ tính toàn vẹn dữ liệu.
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
