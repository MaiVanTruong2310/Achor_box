import React, { useState, useEffect } from 'react';
import { adminRequest } from '../services/adminRequest';
import { Layers, CreditCard, Truck, Plus, Edit2, Trash2, CheckCircle2, XCircle, RefreshCw, X } from 'lucide-react';

export type Kind = 'categories' | 'payment-methods' | 'shipping-methods';

interface Row {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  fee?: number;
  is_active?: boolean;
}

const labels: Record<Kind, string> = {
  categories: 'Danh mục sản phẩm',
  'payment-methods': 'Phương thức thanh toán',
  'shipping-methods': 'Phương thức giao & lắp đặt'
};

const kindIcons: Record<Kind, React.ReactNode> = {
  categories: <Layers size={15} />,
  'payment-methods': <CreditCard size={15} />,
  'shipping-methods': <Truck size={15} />
};

export interface AdminCatalogSettingsProps {
  forcedKind?: Kind;
  categoriesOnly?: boolean;
  hideCategories?: boolean;
}

export const AdminCatalogSettings: React.FC<AdminCatalogSettingsProps> = ({
  forcedKind,
  categoriesOnly = false,
  hideCategories = false
}) => {
  const [kind, setKind] = useState<Kind>(
    forcedKind || (hideCategories ? 'payment-methods' : 'categories')
  );
  const [rows, setRows] = useState<Row[]>([]);
  const [editing, setEditing] = useState<Row | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [fee, setFee] = useState('0');
  const [active, setActive] = useState(true);

  // UI status
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Sync with forcedKind if provided
  useEffect(() => {
    if (forcedKind && forcedKind !== kind) {
      setKind(forcedKind);
    }
  }, [forcedKind]);

  const clear = () => {
    setEditing(null);
    setName('');
    setSlug('');
    setDescription('');
    setFee('0');
    setActive(true);
    setError('');
  };

  const openCreate = () => {
    clear();
    setIsModalOpen(true);
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

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editing && kind === 'categories') {
      setSlug(autoGenerateSlug(val));
    }
  };

  const load = async () => {
    setBusy(true);
    setError('');
    try {
      const data = await adminRequest<Row[]>(`/settings/${kind}`);
      setRows(data);
    } catch (e) {
      setRows([]);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    clear();
    load();
  }, [kind]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    try {
      let body: any;
      if (kind === 'categories') {
        body = {
          name: name.trim(),
          slug: slug.trim(),
          description: description.trim()
        };
      } else if (kind === 'shipping-methods') {
        body = {
          name: name.trim(),
          fee: Number(fee),
          isActive: active
        };
      } else {
        body = {
          name: name.trim(),
          isActive: active
        };
      }

      const url = `/settings/${kind}${editing ? '/' + editing.id : ''}`;
      await adminRequest(url, {
        method: editing ? 'PUT' : 'POST',
        body: JSON.stringify(body)
      });

      await load();
      clear();
      setIsModalOpen(false);
      setMessage(editing ? 'Đã cập nhật thành công.' : 'Đã thêm mới thành công.');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (row: Row) => {
    const confirmMsg =
      kind === 'categories'
        ? `Xác nhận xóa danh mục "${row.name}"? Chỉ danh mục chưa có sản phẩm hoặc bảo hành mới có thể xóa.`
        : `Ngừng sử dụng "${row.name}"?`;

    if (!confirm(confirmMsg)) return;

    setBusy(true);
    setError('');

    try {
      await adminRequest(`/settings/${kind}/${row.id}`, { method: 'DELETE' });
      await load();
      if (editing?.id === row.id) clear();
      setMessage(kind === 'categories' ? 'Đã xóa danh mục thành công.' : 'Đã chuyển sang trạng thái ngừng dùng.');
      setTimeout(() => setMessage(''), 3000);
    } catch (e) {
      const errMsg = (e as Error).message;
      if (errMsg.includes('CATEGORY_IN_USE')) {
        setError('Không thể xóa: Danh mục này đang được sản phẩm hoặc chính sách bảo hành sử dụng.');
      } else {
        setError(errMsg);
      }
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (row: Row) => {
    setEditing(row);
    setName(row.name);
    setSlug(row.slug || '');
    setDescription(row.description || '');
    setFee(String(row.fee || 0));
    setActive(row.is_active !== false);
    setError('');
    setIsModalOpen(true);
  };

  const displayedKinds = (Object.keys(labels) as Kind[]).filter((k) => {
    if (hideCategories && k === 'categories') return false;
    if (categoriesOnly && k !== 'categories') return false;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Category Kind Sub-tabs (Only show if not forced by parent) */}
      {!forcedKind && displayedKinds.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            padding: '4px',
            background: 'var(--bg-card)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle)',
            width: 'fit-content'
          }}
        >
          {displayedKinds.map((k) => (
            <button
              key={k}
              disabled={busy}
              type="button"
              onClick={() => setKind(k)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: kind === k ? 600 : 500,
                borderRadius: '7px',
                border: 'none',
                background: kind === k ? 'var(--accent-primary)' : 'transparent',
                color: kind === k ? '#ffffff' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              {kindIcons[k]}
              {labels[k]}
            </button>
          ))}
        </div>
      )}

      {/* Alert / Feedback Messages - Compact */}
      {message && (
        <div
          role="status"
          style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.25)',
            borderRadius: '8px',
            padding: '8px 14px',
            color: '#10b981',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {error && !isModalOpen && (
        <div
          role="alert"
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '8px 14px',
            color: '#ef4444',
            fontSize: '0.8125rem',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <XCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Data Table Card */}
      <div
        className="card"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-card)'
        }}
      >
        <div
          style={{
            padding: '12px 18px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
              Danh sách {labels[kind].toLowerCase()}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                padding: '2px 8px',
                borderRadius: '999px',
                background: 'var(--accent-primary-soft)',
                color: 'var(--accent-primary)'
              }}
            >
              {rows.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={openCreate}
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8125rem',
                padding: '6px 13px',
                borderRadius: '8px'
              }}
            >
              <Plus size={14} />
              Thêm mới
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={load}
              disabled={busy}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.8125rem',
                padding: '6px 12px',
                borderRadius: '8px'
              }}
            >
              <RefreshCw size={13} className={busy ? 'spin' : ''} />
              Làm mới
            </button>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="data-table" style={{ width: '100%', margin: 0, fontSize: '0.84rem' }}>
            <thead>
              <tr>
                <th style={{ width: '28%', padding: '10px 16px' }}>Tên</th>
                <th style={{ width: kind === 'categories' ? '25%' : '35%', padding: '10px 16px' }}>
                  {kind === 'categories' ? 'Đường dẫn (Slug)' : 'Trạng thái / Chi tiết'}
                </th>
                {kind === 'categories' && <th style={{ padding: '10px 16px' }}>Mô tả</th>}
                <th style={{ width: '140px', textAlign: 'center', padding: '10px 16px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 600, color: 'var(--text-primary)', padding: '10px 16px' }}>
                    {row.name}
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    {kind === 'categories' ? (
                      <code
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '0.78rem',
                          fontFamily: 'var(--font-mono)',
                          color: 'var(--accent-sky)'
                        }}
                      >
                        {row.slug}
                      </code>
                    ) : kind === 'shipping-methods' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {Number(row.fee || 0).toLocaleString('vi-VN')} ₫
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>·</span>
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            background: row.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                            color: row.is_active ? 'var(--accent-emerald)' : '#ef4444'
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              background: row.is_active ? 'var(--accent-emerald)' : '#ef4444'
                            }}
                          />
                          {row.is_active ? 'Đang sử dụng' : 'Đã ngừng'}
                        </span>
                      </div>
                    ) : (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '999px',
                          background: row.is_active ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                          color: row.is_active ? 'var(--accent-emerald)' : '#ef4444'
                        }}
                      >
                        <span
                          style={{
                            width: '5px',
                            height: '5px',
                            borderRadius: '50%',
                            background: row.is_active ? 'var(--accent-emerald)' : '#ef4444'
                          }}
                        />
                        {row.is_active ? 'Đang hoạt động' : 'Đã ngừng'}
                      </span>
                    )}
                  </td>
                  {kind === 'categories' && (
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', padding: '10px 16px' }}>
                      {row.description || '—'}
                    </td>
                  )}
                  <td style={{ textAlign: 'center', padding: '10px 16px' }}>
                    <div style={{ display: 'inline-flex', gap: '5px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => startEdit(row)}
                        title="Chỉnh sửa"
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '6px'
                        }}
                      >
                        <Edit2 size={12} />
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        disabled={busy}
                        onClick={() => remove(row)}
                        title={kind === 'categories' ? 'Xóa danh mục' : 'Ngừng dùng'}
                        style={{
                          padding: '4px 9px',
                          fontSize: '0.78rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRadius: '6px',
                          color: '#ef4444'
                        }}
                      >
                        <Trash2 size={12} />
                        {kind === 'categories' ? 'Xóa' : 'Ngừng'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !busy && (
                <tr>
                  <td
                    colSpan={kind === 'categories' ? 4 : 3}
                    style={{ textAlign: 'center', padding: '30px', color: 'var(--text-secondary)' }}
                  >
                    Chưa có cấu hình nào. Bấm <strong>Thêm mới</strong> để tạo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit (Clean & Focused) */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(3px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '16px'
          }}
          onClick={() => !busy && setIsModalOpen(false)}
        >
          <div
            style={{
              background: 'var(--bg-card)',
              borderRadius: '14px',
              border: '1px solid var(--border-subtle)',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <h3 style={{ margin: 0, fontSize: '0.96rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {editing ? `Chỉnh sửa ${labels[kind].toLowerCase()}` : `Thêm ${labels[kind].toLowerCase()} mới`}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={busy}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={save} style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {error && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '0.8rem',
                    display: 'flex',
                    gap: '6px',
                    alignItems: 'center'
                  }}
                >
                  <XCircle size={15} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: '5px',
                    color: 'var(--text-primary)'
                  }}
                >
                  Tên {labels[kind].toLowerCase()} <span style={{ color: 'var(--accent-rose)' }}>*</span>
                </label>
                <input
                  className="input-field"
                  required
                  maxLength={120}
                  placeholder={
                    kind === 'categories'
                      ? 'VD: Linh kiện thay thế & sửa chữa'
                      : kind === 'shipping-methods'
                      ? 'VD: Giao hàng hỏa tốc 2H'
                      : 'VD: Cổng VNPAY QR'
                  }
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  disabled={busy}
                  style={{ width: '100%', margin: 0 }}
                  autoFocus
                />
              </div>

              {kind === 'categories' && (
                <>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '5px',
                        color: 'var(--text-primary)'
                      }}
                    >
                      Đường dẫn (Slug) <span style={{ color: 'var(--accent-rose)' }}>*</span>
                    </label>
                    <input
                      className="input-field"
                      required
                      pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                      maxLength={120}
                      placeholder="VD: linh-kien-thay-the"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      disabled={busy}
                      style={{ width: '100%', fontFamily: 'var(--font-mono)', margin: 0 }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        marginBottom: '5px',
                        color: 'var(--text-primary)'
                      }}
                    >
                      Mô tả danh mục
                    </label>
                    <textarea
                      className="input-field"
                      rows={2}
                      maxLength={1000}
                      placeholder="Mô tả công dụng của nhóm sản phẩm này..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={busy}
                      style={{ width: '100%', resize: 'vertical', margin: 0 }}
                    />
                  </div>
                </>
              )}

              {kind === 'shipping-methods' && (
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      marginBottom: '5px',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Phí vận chuyển tham khảo (₫)
                  </label>
                  <input
                    className="input-field"
                    type="number"
                    min="0"
                    max="100000000"
                    step="1000"
                    value={fee}
                    onChange={(e) => setFee(e.target.value)}
                    disabled={busy}
                    style={{ width: '100%', margin: 0 }}
                  />
                </div>
              )}

              {kind !== 'categories' && (
                <div>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      disabled={busy}
                      style={{ width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                    />
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {kind === 'shipping-methods' ? 'Đang sử dụng gói này' : 'Đang hoạt động'}
                    </span>
                  </label>
                </div>
              )}

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '8px',
                  marginTop: '6px',
                  paddingTop: '12px',
                  borderTop: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsModalOpen(false)}
                  disabled={busy}
                  style={{ borderRadius: '8px', padding: '7px 14px', fontSize: '0.82rem' }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm"
                  disabled={busy}
                  style={{ borderRadius: '8px', padding: '7px 16px', fontSize: '0.82rem' }}
                >
                  {editing ? 'Lưu thay đổi' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
