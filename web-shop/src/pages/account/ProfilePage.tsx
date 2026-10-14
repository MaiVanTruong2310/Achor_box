import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
export const ProfilePage: React.FC = () => {
  const { user, updateProfile } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || ''); const [phone, setPhone] = useState(user?.phone || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const save = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(''); setMessage(''); try { await updateProfile({ fullName, phone }); setMessage('Đã lưu hồ sơ. Thông tin trên đơn đã đặt vẫn được giữ nguyên.'); } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được hồ sơ.'); } finally { setBusy(false); } };
  return <section><h2>Thông tin tài khoản</h2>{error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}
    <form onSubmit={e => void save(e)}><label className="form-group">Email<input className="form-input" disabled value={user?.email || ''} /></label>
      <label className="form-group">Họ và tên<input className="form-input" required maxLength={200} value={fullName} disabled={busy} onChange={e => setFullName(e.target.value)} /></label>
      <label className="form-group">Số điện thoại<input className="form-input" type="tel" maxLength={30} value={phone} disabled={busy} onChange={e => setPhone(e.target.value)} /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu hồ sơ'}</button>
    </form><p><Link to="/account/addresses">Quản lý địa chỉ giao và lắp đặt</Link></p></section>;
};
