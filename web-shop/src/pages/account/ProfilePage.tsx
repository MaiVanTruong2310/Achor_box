import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle2 } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState(user?.address || '');
  const [successMsg, setSuccessMsg] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(false);
    try {
      await updateProfile({ fullName, phone, address });
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-lg)',
        padding: '28px'
      }}
    >
      <h2 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text-main)', marginBottom: '6px' }}>
        Thông tin tài khoản
      </h2>
      <p style={{ fontSize: '13.5px', color: 'var(--text-muted)', marginBottom: '24px' }}>
        Cập nhật thông tin nhận hàng và số điện thoại liên hệ kỹ thuật.
      </p>

      {successMsg && (
        <div
          style={{
            backgroundColor: 'var(--success-bg)',
            color: 'var(--success-text)',
            padding: '10px 14px',
            borderRadius: 'var(--radius-md)',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '20px'
          }}
        >
          <CheckCircle2 size={16} />
          <span>Đã lưu cập nhật thông tin thành công</span>
        </div>
      )}

      <form onSubmit={handleSave}>
        <div className="form-group">
          <label className="form-label">Họ và tên</label>
          <input
            type="text"
            required
            className="form-input"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email (Không thể thay đổi)</label>
          <input
            type="email"
            disabled
            className="form-input"
            value={user?.email || ''}
            style={{ backgroundColor: 'var(--bg-surface-secondary)', color: 'var(--text-muted)' }}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Số điện thoại</label>
          <input
            type="tel"
            className="form-input"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Địa chỉ giao hàng mặc định</label>
          <textarea
            rows={3}
            className="form-textarea"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary btn-md">
          {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
      </form>
    </div>
  );
};
