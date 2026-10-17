import React, { useEffect, useState, useRef } from 'react';
import {
  X,
  User,
  Mail,
  Phone,
  Shield,
  MapPin,
  Calendar,
  KeyRound,
  ShieldCheck,
  Copy,
  Check,
  LogOut,
  Edit3,
  Save,
  Image,
  AlertCircle,
  UploadCloud,
  Trash2
} from 'lucide-react';
import { Profile } from '../types/database';
import { roleLabels } from '../navigation';
import { useAuth } from '../contexts/AuthContext';
import { adminRequest } from '../services/adminRequest';

interface UserProfileModalProps {
  open: boolean;
  onClose: () => void;
  profile: Profile | null;
  onLogout: () => void;
  initialMode?: 'view' | 'edit';
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  open,
  onClose,
  profile,
  onLogout,
  initialMode = 'view'
}) => {
  const { updateProfile } = useAuth();
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [copied, setCopied] = useState(false);

  // Edit form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [defaultAddress, setDefaultAddress] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const avatarFileInputRef = useRef<HTMLInputElement>(null);

  // Sync mode and form values when opened
  useEffect(() => {
    if (open) {
      setMode(initialMode);
      setErrorMsg('');
      setSuccessMsg('');
      if (profile) {
        setFullName(profile.full_name || '');
        setPhone(profile.phone || '');
        setAvatarUrl(profile.avatar_url || '');
        setDefaultAddress(profile.default_address || '');
      }
    }
  }, [open, initialMode, profile]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open || !profile) return null;

  const currentDisplayName = fullName.trim() || profile.full_name || profile.email || 'A';
  const userInitial = currentDisplayName.charAt(0).toUpperCase();

  const handleCopyId = () => {
    if (!profile.id) return;
    void navigator.clipboard.writeText(profile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Upload Avatar to Cloudinary via backend API
  const handleAvatarFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrorMsg('Vui lòng chọn một tệp hình ảnh hợp lệ (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    setUploadingAvatar(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('file', file);

      let uploadUrl = '';
      try {
        const res = await adminRequest<{ url: string }>('/auth/avatar', {
          method: 'POST',
          body: formData
        });
        uploadUrl = res?.url || '';
      } catch {
        // Fallback to /products/images which uses the same Cloudinary storage
        const res = await adminRequest<{ url: string }>('/products/images', {
          method: 'POST',
          body: formData
        });
        uploadUrl = res?.url || '';
      }

      if (uploadUrl) {
        setAvatarUrl(uploadUrl);
        setSuccessMsg('Đã tải ảnh lên thành công!');
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch (err: any) {
      setErrorMsg('Tải ảnh lên thất bại: ' + (err?.message || 'Lỗi mạng'));
    } finally {
      setUploadingAvatar(false);
      if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn.');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const bodyPayload = JSON.stringify({
        fullName: fullName.trim(),
        phone: phone.trim() ? phone.trim() : null,
        avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        defaultAddress: defaultAddress.trim() ? defaultAddress.trim() : null
      });

      let res: any;
      try {
        res = await adminRequest<any>('/auth/me', {
          method: 'PUT',
          body: bodyPayload
        });
      } catch (err: any) {
        // Fallback to POST if server only accepts POST
        if (err?.status === 405 || (err?.message && err.message.includes('405'))) {
          res = await adminRequest<any>('/auth/me', {
            method: 'POST',
            body: bodyPayload
          });
        } else {
          throw err;
        }
      }

      const updatedProfile: Profile = {
        ...profile,
        full_name: res?.fullName || fullName.trim(),
        phone: res?.phone !== undefined ? res.phone : (phone.trim() || null),
        avatar_url: res?.avatarUrl !== undefined ? res.avatarUrl : (avatarUrl.trim() || null),
        default_address: res?.defaultAddress !== undefined ? res.defaultAddress : (defaultAddress.trim() || null),
        updated_at: res?.updatedAt || new Date().toISOString()
      };

      updateProfile(updatedProfile);
      setSuccessMsg('Cập nhật hồ sơ tài khoản thành công!');
      setTimeout(() => {
        setSuccessMsg('');
        setMode('view');
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const formattedDate = profile.created_at
    ? new Date(profile.created_at).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    : '—';

  return (
    <div className="fpt-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="profile-modal-title">
      <div className="fpt-modal-box profile-modal-box" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 590 }}>
        {/* Header with Title and Mode Switcher */}
        <div className="fpt-modal-header" style={{ padding: '16px 20px', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="profile-modal-icon-badge">
              {mode === 'edit' ? <Edit3 size={18} /> : <User size={18} />}
            </div>
            <div>
              <h3 id="profile-modal-title" style={{ fontSize: '16px', margin: 0, fontWeight: 700 }}>
                {mode === 'edit' ? 'Chỉnh sửa tài khoản' : 'Thông tin tài khoản'}
              </h3>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {profile.email}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Mode switch pills */}
            <div style={{
              display: 'inline-flex',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 8,
              padding: 2
            }}>
              <button
                type="button"
                onClick={() => { setMode('view'); setErrorMsg(''); }}
                style={{
                  border: 'none',
                  background: mode === 'view' ? 'var(--bg-card)' : 'transparent',
                  color: mode === 'view' ? 'var(--fpt-orange)' : 'var(--text-muted)',
                  fontWeight: mode === 'view' ? 600 : 500,
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: mode === 'view' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <User size={12} />
                <span>Xem</span>
              </button>
              <button
                type="button"
                onClick={() => { setMode('edit'); setErrorMsg(''); }}
                style={{
                  border: 'none',
                  background: mode === 'edit' ? 'var(--bg-card)' : 'transparent',
                  color: mode === 'edit' ? 'var(--fpt-orange)' : 'var(--text-muted)',
                  fontWeight: mode === 'edit' ? 600 : 500,
                  fontSize: '11.5px',
                  padding: '4px 10px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  boxShadow: mode === 'edit' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                }}
              >
                <Edit3 size={12} />
                <span>Sửa</span>
              </button>
            </div>

            <button
              type="button"
              className="icon-button"
              onClick={onClose}
              aria-label="Đóng cửa sổ"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="fpt-modal-body profile-modal-body" style={{ padding: '20px' }}>
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              color: 'var(--fpt-rose)',
              fontSize: '13px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderRadius: 8,
              background: 'rgba(16, 185, 129, 0.1)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              color: 'var(--fpt-emerald)',
              fontSize: '13px',
              fontWeight: 600
            }}>
              <Check size={16} style={{ flexShrink: 0 }} />
              <span>{successMsg}</span>
            </div>
          )}

          {mode === 'view' ? (
            <>
              {/* Profile Hero Section */}
              <div className="profile-hero-card">
                <div className="profile-hero-avatar">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.full_name || 'Avatar'} />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div className="profile-hero-info" style={{ flex: 1 }}>
                  <h4>{profile.full_name || 'Người dùng hệ thống'}</h4>
                  <p className="profile-hero-email">{profile.email || '—'}</p>
                  <div className="profile-hero-badges">
                    <span className="profile-role-pill">
                      <Shield size={12} />
                      <span>{roleLabels[profile.role] || profile.role}</span>
                    </span>
                    <span className={`profile-status-pill ${profile.is_locked ? 'locked' : 'active'}`}>
                      <span className="profile-status-dot" />
                      <span>{profile.is_locked ? 'Tài khoản bị khóa' : 'Đang hoạt động'}</span>
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  className="profile-copy-btn"
                  onClick={() => setMode('edit')}
                  title="Chỉnh sửa hồ sơ"
                  style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '12px' }}
                >
                  <Edit3 size={13} />
                  <span>Sửa thông tin</span>
                </button>
              </div>

              {/* Details Grid */}
              <div className="profile-details-grid">
                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <Mail size={14} />
                    <span>Email đăng nhập</span>
                  </div>
                  <div className="profile-detail-value">{profile.email || '—'}</div>
                </div>

                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <Phone size={14} />
                    <span>Số điện thoại</span>
                  </div>
                  <div className="profile-detail-value">{profile.phone || 'Chưa thiết lập'}</div>
                </div>

                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <MapPin size={14} />
                    <span>Địa chỉ</span>
                  </div>
                  <div className="profile-detail-value">{profile.default_address || 'Chưa thiết lập'}</div>
                </div>

                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <ShieldCheck size={14} />
                    <span>Xác thực 2 lớp (2FA)</span>
                  </div>
                  <div className="profile-detail-value">
                    {profile.is_2fa_enabled ? (
                      <span style={{ color: 'var(--fpt-emerald)', fontWeight: 600 }}>Đã kích hoạt</span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Chưa kích hoạt</span>
                    )}
                  </div>
                </div>

                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <Calendar size={14} />
                    <span>Ngày tham gia</span>
                  </div>
                  <div className="profile-detail-value">{formattedDate}</div>
                </div>

                <div className="profile-detail-item">
                  <div className="profile-detail-label">
                    <KeyRound size={14} />
                    <span>Mã định danh (ID)</span>
                  </div>
                  <div className="profile-id-row">
                    <code className="profile-id-code" title={profile.id}>{profile.id}</code>
                    <button
                      type="button"
                      className="profile-copy-btn"
                      onClick={handleCopyId}
                      title="Sao chép ID"
                    >
                      {copied ? <Check size={13} style={{ color: 'var(--fpt-emerald)' }} /> : <Copy size={13} />}
                      <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            /* EDIT FORM */
            <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Avatar Live Preview & Cloudinary Upload */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                padding: '16px',
                background: 'var(--bg-card)',
                borderRadius: 12,
                border: '1px solid var(--border-subtle)',
                flexWrap: 'wrap'
              }}>
                <div className="profile-hero-avatar" style={{ width: 62, height: 62, fontSize: 24, flexShrink: 0, position: 'relative' }}>
                  {avatarUrl.trim() ? (
                    <img
                      src={avatarUrl.trim()}
                      alt="Preview Avatar"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                  {uploadingAvatar && (
                    <div style={{
                      position: 'absolute',
                      inset: 0,
                      background: 'rgba(0,0,0,0.5)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%'
                    }}>
                      <div className="clean-spinner" style={{ width: 20, height: 20, borderTopColor: '#fff' }} />
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Image size={14} style={{ color: 'var(--fpt-orange)' }} />
                    <span>Ảnh đại diện (Cloudinary)</span>
                  </label>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={avatarFileInputRef}
                    accept="image/png, image/jpeg, image/jpg, image/webp"
                    onChange={handleAvatarFileSelect}
                    style={{ display: 'none' }}
                  />

                  {/* Upload button & actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                    <button
                      type="button"
                      disabled={uploadingAvatar}
                      onClick={() => avatarFileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '7px 14px',
                        background: 'linear-gradient(135deg, var(--fpt-orange) 0%, #ea580c 100%)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 7,
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: uploadingAvatar ? 'not-allowed' : 'pointer',
                        boxShadow: '0 2px 8px rgba(249, 115, 22, 0.25)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {uploadingAvatar ? (
                        <>
                          <div className="clean-spinner" style={{ width: 13, height: 13, borderTopColor: '#fff' }} />
                          <span>Đang tải lên…</span>
                        </>
                      ) : (
                        <>
                          <UploadCloud size={15} />
                          <span>Tải ảnh lên</span>
                        </>
                      )}
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        disabled={uploadingAvatar}
                        onClick={() => setAvatarUrl('')}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '7px 12px',
                          background: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 7,
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                        title="Xóa ảnh đại diện hiện tại"
                      >
                        <Trash2 size={13} />
                        <span>Xóa ảnh</span>
                      </button>
                    )}
                  </div>

                  {/* URL Text Input */}
                  <input
                    type="url"
                    className="fpt-input"
                    placeholder="Hoặc dán link ảnh HTTPS trực tiếp…"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '7px 10px',
                      borderRadius: 6,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      fontSize: '12px'
                    }}
                  />
                  <small style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginTop: 4 }}>
                    Hỗ trợ tệp PNG, JPG, WEBP tối đa 5MB. Ảnh được lưu trữ bảo mật trên Cloudinary.
                  </small>
                </div>
              </div>

              {/* Form Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="fpt-form-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="edit-fullname" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Họ và tên <span style={{ color: 'var(--fpt-rose)' }}>*</span>
                  </label>
                  <input
                    id="edit-fullname"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="fpt-form-group">
                  <label htmlFor="edit-phone" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Số điện thoại
                  </label>
                  <input
                    id="edit-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0987654321"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      fontSize: '13.5px'
                    }}
                  />
                </div>

                <div className="fpt-form-group">
                  <label htmlFor="edit-email-readonly" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    Email đăng nhập (Cố định)
                  </label>
                  <input
                    id="edit-email-readonly"
                    type="email"
                    disabled
                    value={profile.email || ''}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text-muted)',
                      fontSize: '13.5px',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                <div className="fpt-form-group" style={{ gridColumn: 'span 2' }}>
                  <label htmlFor="edit-address" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Địa chỉ liên hệ / Công tác
                  </label>
                  <input
                    id="edit-address"
                    type="text"
                    value={defaultAddress}
                    onChange={(e) => setDefaultAddress(e.target.value)}
                    placeholder="Tòa nhà FPT, Phố Duy Tân, Cầu Giấy, Hà Nội"
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-card)',
                      fontSize: '13.5px'
                    }}
                  />
                </div>
              </div>

              {/* Informative Note */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--bg-surface)',
                borderRadius: 8,
                border: '1px dashed var(--border-subtle)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: 1.5
              }}>
                💡 <strong>Ghi chú:</strong> Thông tin họ tên và ảnh đại diện Cloudinary sẽ được đồng bộ ngay tức thì trên thanh tiêu đề và các biên bản thao tác hệ thống mà không cần đăng nhập lại.
              </div>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div className="fpt-modal-footer profile-modal-footer" style={{ padding: '14px 20px' }}>
          {mode === 'view' ? (
            <>
              <button
                type="button"
                className="profile-logout-btn"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
              >
                <LogOut size={16} />
                <span>Đăng xuất</span>
              </button>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => setMode('edit')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  <Edit3 size={15} />
                  <span>Chỉnh sửa thông tin</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={onClose}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 8,
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Đóng
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving || uploadingAvatar}
                onClick={() => {
                  setMode('view');
                  setErrorMsg('');
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || uploadingAvatar}
                onClick={() => void handleSave()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 18px',
                  borderRadius: 8,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: (saving || uploadingAvatar) ? 'not-allowed' : 'pointer'
                }}
              >
                {saving ? (
                  <>
                    <span className="clean-spinner" style={{ width: 14, height: 14, borderTopColor: '#fff' }} />
                    <span>Đang lưu…</span>
                  </>
                ) : (
                  <>
                    <Save size={15} />
                    <span>Lưu thay đổi</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
