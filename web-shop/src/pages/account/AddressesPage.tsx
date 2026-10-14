import React, { useEffect, useState } from 'react';
import { AddressInput, CustomerAddress, customerApi } from '../../api/customerApi';
const empty: AddressInput = { label: '', recipientName: '', phone: '', addressLine: '', installationNote: '', isDefault: false };
export const AddressesPage: React.FC = () => {
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]); const [form, setForm] = useState<AddressInput>(empty);
  const [editing, setEditing] = useState<string | null>(null); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = async () => { try { setAddresses(await customerApi.addresses()); } catch (e) { setError(e instanceof Error ? e.message : 'Không tải được địa chỉ.'); } finally { setLoading(false); } };
  useEffect(() => { void load(); }, []);
  const save = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); setError(''); try { await customerApi.saveAddress(editing, form); setEditing(null); setForm(empty); await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Không lưu được địa chỉ.'); } finally { setBusy(false); } };
  const remove = async (id: string) => { if (!window.confirm('Xóa địa chỉ này khỏi sổ địa chỉ? Thông tin trên đơn đã đặt vẫn được giữ.')) return; setBusy(true); setError(''); try { await customerApi.deleteAddress(id); if (editing === id) { setEditing(null); setForm(empty); } await load(); } catch (e) { setError(e instanceof Error ? e.message : 'Không xóa được địa chỉ.'); } finally { setBusy(false); } };
  return <section><h2>Địa chỉ giao và lắp đặt</h2><p>Thay đổi tại đây chỉ áp dụng cho các đơn đặt sau. Địa chỉ trên đơn đã đặt được giữ nguyên.</p>
    {error && <p className="form-error" role="alert">{error}</p>}{loading && <p>Đang tải địa chỉ…</p>}
    {addresses.map(a => <article key={a.id} style={{ padding: 16, border: '1px solid var(--border-color)', margin: '12px 0' }}><b>{a.label}{a.isDefault ? ' · Mặc định' : ''}</b><p>{a.recipientName} · {a.phone}</p><p>{a.addressLine}</p><p>{a.installationNote}</p><button disabled={busy} onClick={() => { setEditing(a.id); setForm(a); }} className="btn btn-secondary">Sửa</button> <button disabled={busy} onClick={() => void remove(a.id)} className="btn btn-secondary">Xóa</button></article>)}
    <h3>{editing ? 'Sửa địa chỉ' : 'Thêm địa chỉ'}</h3><form onSubmit={e => void save(e)}>
      {(['label', 'recipientName', 'phone', 'addressLine', 'installationNote'] as const).map(field => <div className="form-group" key={field}><label className="form-label">{{ label: 'Tên gợi nhớ', recipientName: 'Người nhận', phone: 'Số điện thoại', addressLine: 'Địa chỉ đầy đủ', installationNote: 'Hướng dẫn giao/lắp đặt' }[field]}<input className="form-input" required={field !== 'installationNote'} maxLength={field === 'label' ? 100 : field === 'recipientName' ? 200 : field === 'phone' ? 30 : 2000} value={form[field] || ''} disabled={busy} onChange={e => setForm({ ...form, [field]: e.target.value })} /></label></div>)}
      <label><input type="checkbox" checked={form.isDefault} disabled={busy} onChange={e => setForm({ ...form, isDefault: e.target.checked })} /> Địa chỉ mặc định</label><div><button disabled={busy} className="btn btn-primary">{busy ? 'Đang lưu…' : 'Lưu địa chỉ'}</button> {editing && <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => { setEditing(null); setForm(empty); }}>Hủy sửa</button>}</div>
    </form></section>;
};
