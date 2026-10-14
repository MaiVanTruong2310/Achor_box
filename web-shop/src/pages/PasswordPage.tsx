import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
export const PasswordPage: React.FC<{ mode: 'forgot' | 'reset' | 'change' }> = ({ mode }) => {
  const [email, setEmail] = useState(''); const [current, setCurrent] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [tokenHash] = useState(() => new URLSearchParams(window.location.search).get('token_hash') || '');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [message, setMessage] = useState(''); const navigate = useNavigate();
  useEffect(() => { if (mode === 'reset') window.history.replaceState(null, '', window.location.pathname); }, [mode]);
  const submit = async (e: React.FormEvent) => { e.preventDefault(); setError(''); setMessage(''); if (mode !== 'forgot' && password !== confirm) { setError('Mật khẩu xác nhận không khớp.'); return; } setBusy(true);
    try { const result = mode === 'forgot' ? await authApi.forgotPassword(email) : mode === 'reset' ? await authApi.resetPassword(tokenHash, password) : await authApi.changePassword(current, password); if (mode === 'change') navigate('/login', { state: { message: result.message }, replace: true }); else setMessage(result.message); }
    catch (e) { setError(e instanceof Error ? e.message : 'Không xử lý được yêu cầu.'); } finally { setBusy(false); }
  };
  return <section className="container" style={{ maxWidth: 520, padding: 28 }}><h2>{mode === 'forgot' ? 'Quên mật khẩu' : mode === 'reset' ? 'Đặt lại mật khẩu' : 'Đổi mật khẩu'}</h2>
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message} <Link to="/login">Đăng nhập</Link></p>}
    {mode === 'reset' && !tokenHash ? <p>Liên kết đặt lại mật khẩu không hợp lệ. <Link to="/forgot-password">Yêu cầu email mới</Link></p> : <form onSubmit={e => void submit(e)}>
      {mode === 'forgot' && <label className="form-group">Email<input className="form-input" required type="email" autoComplete="email" value={email} disabled={busy} onChange={e => setEmail(e.target.value)} /></label>}
      {mode === 'change' && <label className="form-group">Mật khẩu hiện tại<input className="form-input" required type="password" autoComplete="current-password" value={current} disabled={busy} onChange={e => setCurrent(e.target.value)} /></label>}
      {mode !== 'forgot' && <><label className="form-group">Mật khẩu mới (8–72 ký tự)<input className="form-input" required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={password} disabled={busy} onChange={e => setPassword(e.target.value)} /></label><label className="form-group">Nhập lại mật khẩu mới<input className="form-input" required type="password" autoComplete="new-password" minLength={8} maxLength={72} value={confirm} disabled={busy} onChange={e => setConfirm(e.target.value)} /></label></>}
      <button className="btn btn-primary" disabled={busy || (mode === 'reset' && !!message)}>{busy ? 'Đang xử lý…' : mode === 'forgot' ? 'Gửi email hướng dẫn' : 'Lưu mật khẩu mới'}</button>
    </form>}</section>;
};
