import React, { useEffect, useState } from 'react';
import { adminRequest } from '../services/adminRequest';
import { useAuth } from '../contexts/AuthContext';

interface Claim {
  id: string; description: string; images: string[]; status: string; assignedTo: string | null;
  assigneeName: string | null; internalNotes: string | null; serialNumber: string;
  customerName: string | null; customerPhone: string | null; createdAt: string;
}
interface Technician { id: string; fullName: string; phone: string | null }
const labels: Record<string, string> = { new: 'Mới tiếp nhận', assigned: 'Đã phân công', in_progress: 'Đang xử lý', resolved: 'Đã hoàn tất', rejected: 'Đã từ chối' };

export const Warranties: React.FC = () => {
  const { profile } = useAuth();
  const manager = profile?.role === 'super_admin' || profile?.role === 'support_agent';
  const [page, setPage] = useState(0), [pages, setPages] = useState(0), [total, setTotal] = useState(0);
  const [rows, setRows] = useState<Claim[]>([]), [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false), [error, setError] = useState(''), [revision, setRevision] = useState(0);
  const [selected, setSelected] = useState<Claim | null>(null), [assignee, setAssignee] = useState('');
  const [status, setStatus] = useState('new'), [notes, setNotes] = useState(''), [busy, setBusy] = useState(false), [editError, setEditError] = useState('');

  useEffect(() => {
    let alive = true; setLoading(true); setError('');
    adminRequest<{content: Claim[]; totalPages: number; totalElements: number}>(`/warranties/claims/paged?page=${page}&size=20`)
      .then(data => { if (alive) { setRows(data.content); setPages(data.totalPages); setTotal(data.totalElements); } })
      .catch(e => { if (alive) { setRows([]); setError(e.message); } }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page, revision]);
  useEffect(() => {
    if (!manager) return;
    let alive = true;
    adminRequest<Technician[]>('/warranties/technicians').then(data => { if (alive) setTechnicians(data); }).catch(e => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [manager]);
  const open = (claim: Claim) => { setSelected(claim); setAssignee(claim.assignedTo || ''); setStatus(claim.status); setNotes(claim.internalNotes || ''); setEditError(''); };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected || busy) return; setBusy(true); setEditError('');
    try {
      let assigned = false;
      if (manager && assignee !== (selected.assignedTo || '')) {
        if (!assignee) throw new Error('Chọn kỹ thuật viên để phân công lại.');
        await adminRequest(`/warranties/claims/${selected.id}/assign`, {method: 'PATCH', body: JSON.stringify({technicianId: assignee})}); assigned = true;
      }
      if (notes !== (selected.internalNotes || '')) await adminRequest(`/warranties/claims/${selected.id}/notes`, {method: 'PATCH', body: JSON.stringify({notes})});
      if (status !== selected.status && !(assigned && status === 'new')) await adminRequest(`/warranties/claims/${selected.id}/status`, {method: 'PATCH', body: JSON.stringify({status})});
      setSelected(null); setRevision(r => r + 1);
    } catch (e) { setEditError((e as Error).message); setRevision(r => r + 1); }
    finally { setBusy(false); }
  };
  return <div className="page-body">
    <h2>Yêu cầu bảo hành</h2><p>{manager ? 'Tiếp nhận yêu cầu của khách và phân công kỹ thuật viên.' : 'Các yêu cầu được phân công cho bạn.'}</p>
    {error && <p role="alert">{error}</p>}
    <div style={{display:'flex',gap:12,margin:'16px 0',alignItems:'center'}}><span>{total} yêu cầu · Trang {pages ? page + 1 : 0}/{pages}</span>
      <button className="btn btn-secondary" disabled={loading || page === 0} onClick={() => setPage(p => p - 1)}>Trước</button>
      <button className="btn btn-secondary" disabled={loading || page + 1 >= pages} onClick={() => setPage(p => p + 1)}>Sau</button>
      <button className="btn btn-secondary" disabled={loading} onClick={() => setRevision(r => r + 1)}>Tải lại</button></div>
    {loading && <p>Đang tải…</p>}
    {!loading && !error && rows.length === 0 && <p>Chưa có yêu cầu bảo hành.</p>}
    {rows.map(claim => <article className="card" key={claim.id} style={{padding:20,marginBottom:16}}>
      <b>{claim.serialNumber} · {labels[claim.status] || claim.status}</b><p>{claim.customerName || 'Khách hàng'} {claim.customerPhone || ''}</p>
      <p>{claim.description}</p><p>Kỹ thuật viên: {claim.assigneeName || 'Chưa phân công'}</p>
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{(claim.images || []).map(url => <a key={url} href={url} target="_blank" rel="noreferrer"><img src={url} alt="Ảnh sự cố do khách gửi" style={{width:120,height:120,objectFit:'cover'}}/></a>)}</div>
      <p>{new Date(claim.createdAt).toLocaleString('vi-VN')}</p><button className="btn btn-primary" onClick={() => open(claim)}>Xử lý yêu cầu</button>
    </article>)}
    {selected && <div className="modal-overlay"><div className="modal-content" style={{maxWidth:650}}><h3>Xử lý {selected.serialNumber}</h3>
      {editError && <p role="alert">{editError}</p>}<form onSubmit={save} style={{display:'grid',gap:14}}>
        {manager && <label>Kỹ thuật viên<select className="input-field" disabled={busy} value={assignee} onChange={e => setAssignee(e.target.value)}><option value="">Chưa phân công</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.fullName} {t.phone || ''}</option>)}</select></label>}
        <label>Trạng thái<select className="input-field" disabled={busy} value={status} onChange={e => setStatus(e.target.value)}>{Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Ghi chú nội bộ<textarea className="input-field" maxLength={10000} disabled={busy} value={notes} onChange={e => setNotes(e.target.value)}/></label>
        <div style={{display:'flex',gap:12}}><button className="btn btn-primary" disabled={busy}>{busy ? 'Đang lưu…' : 'Lưu'}</button><button className="btn btn-secondary" type="button" disabled={busy} onClick={() => setSelected(null)}>Đóng</button></div>
      </form></div></div>}
  </div>;
};
