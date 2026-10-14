import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Truck, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { deliveryApi, DeliveryApiError, Checks, Job, JobStatus, JobSummary, Page } from '../services/deliveryInstallation';
import './delivery-installations.css';
import { InstallationBacklog } from '../components/InstallationBacklog';

const labels: Record<JobStatus, string> = { ASSIGNED: 'Đã phân công', IN_PROGRESS: 'Đang thực hiện', DELIVERED: 'Đã giao', INSTALLED: 'Đã lắp đặt', COMPLETED: 'Đã nghiệm thu', FAILED: 'Cần xử lý lại' };
const date = (value: string | null) => value ? new Date(value).toLocaleString('vi-VN') : 'Chưa có dữ liệu';
const errorText = (e: unknown) => e instanceof Error ? e.message : 'Không xử lý được yêu cầu.';
const checksLabels = { serialOwner: 'Serial / SKU / chủ sở hữu', connection: 'Kết nối MQTT mới', unlock: 'Mở khóa: ACK + trạng thái thực', lock: 'Khóa: ACK + cửa đóng', weight: 'Cân Pro: TARE + biến động trọng lượng' };

export const DeliveryInstallations: React.FC = () => {
  const { profile } = useAuth();
  const manager = profile?.role === 'super_admin' || profile?.role === 'support_agent';
  const [list, setList] = useState<Page<JobSummary> | null>(null);
  const [page, setPage] = useState(0); const [status, setStatus] = useState('');
  const [job, setJob] = useState<Job | null>(null); const [checks, setChecks] = useState<Checks | null>(null);
  const [technicians, setTechnicians] = useState<{ id: string; fullName: string | null }[]>([]);
  const [eligible, setEligible] = useState<Page<{ id: string; shippingAddress: string | null; createdAt: string }> | null>(null);
  const [eligiblePage, setEligiblePage] = useState(0);
  const [error, setError] = useState(''); const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const [orderId, setOrderId] = useState(''); const [assignee, setAssignee] = useState(''); const [scheduled, setScheduled] = useState('');
  const [itemId, setItemId] = useState(''); const [serial, setSerial] = useState(''); const [note, setNote] = useState(''); const [reason, setReason] = useState(''); const [customerAccepted, setCustomerAccepted] = useState(false);
  const selected = useRef<string | null>(null); const keys = useRef(new Map<string, string>());
  const keyFor = (identity: string) => { if (!keys.current.has(identity)) keys.current.set(identity, crypto.randomUUID()); return keys.current.get(identity)!; };
  const load = useCallback(async () => {
    setLoading(true);
    try { setList(await deliveryApi.list(!manager, page, status)); } catch (e) { setError(errorText(e)); } finally { setLoading(false); }
  }, [manager, page, status]);
  const planning = useCallback(async () => {
    if (!manager) return;
    const [employees, orders] = await Promise.all([deliveryApi.technicians(), deliveryApi.eligible(eligiblePage)]);
    setTechnicians(employees); setEligible(orders);
  }, [manager, eligiblePage]);
  const open = useCallback(async (id: string, select = false) => {
    if (select) { selected.current = id; setJob(null); setChecks(null); setSerial(''); setNote(''); setReason(''); setCustomerAccepted(false); setItemId(''); }
    let detail: Job; let result: Checks;
    try { [detail, result] = await Promise.all([deliveryApi.detail(id), deliveryApi.checks(id)]); }
    catch (error) { if (error instanceof DeliveryApiError && [401,403,404].includes(error.status) && selected.current === id) { selected.current = null; setJob(null); setChecks(null); } throw error; }
    if (selected.current !== id) return;
    setJob(old => old?.id === id && old.version > detail.version ? old : detail);
    setChecks(old => old?.jobId === id && old.version > result.version ? old : result);
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { void planning().catch(e => setError(errorText(e))); }, [planning]);
  useEffect(() => {
    const timer = setInterval(() => { if (!document.hidden && selected.current && !busy) void open(selected.current).catch(e => setError(errorText(e))); }, 5000);
    return () => clearInterval(timer);
  }, [open, busy]);
  const refresh = async () => { setError(''); try { await load(); await planning(); if (selected.current) await open(selected.current); } catch (e) { setError(errorText(e)); } };
  const perform = async (action: string, body: unknown) => {
    if (!job || busy) return;
    const id = job.id; const identity = `${id}:${job.version}:${action}:${JSON.stringify(body)}`;
    setBusy(true); setError(''); setMessage('');
    try {
      await deliveryApi.mutate(job, action, body, keyFor(identity));
      await open(id); await load();
      setMessage(action === 'checks/commands' ? 'Lệnh đã xếp hàng. Chờ ACK và trạng thái thực; chưa xác nhận thiết bị đã hoạt động.' : 'Backend đã ghi nhận thao tác.');
      if (action === 'devices') setSerial('');
    } catch (e) { setError(errorText(e)); try { await open(id); } catch { /* Keep unknown outcome visible; do not simulate progress. */ } }
    finally { setBusy(false); }
  };
  const assign = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError('');
    try { const time = new Date(scheduled); if (!Number.isFinite(time.getTime())) throw new Error('Lịch hẹn không hợp lệ.'); const body = { assignedTo: assignee, scheduledAt: time.toISOString() }; const created = await deliveryApi.assign(orderId, body, keyFor(`assign:${orderId}:${JSON.stringify(body)}`)); selected.current = created.id; await open(created.id, true); await load(); await planning(); setMessage('Đã phân công công việc giao và lắp đặt.'); }
    catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  };
  const working = profile?.role === 'technician' && job?.assignedTo === profile.id;
  const terminal = job?.status === 'COMPLETED' || job?.status === 'FAILED' || job?.orderStatus === 'cancelled';
  const canCommand = working && (job?.status === 'DELIVERED' || job?.status === 'INSTALLED');

  return <div className="di-page">
    <header className="di-header"><div><h2><Truck size={24} /> {manager ? 'Điều phối giao & lắp đặt' : 'Công việc giao & lắp đặt của tôi'}</h2><p>Một nhân viên thực hiện cả giao và lắp. Đơn chỉ hoàn thành sau nghiệm thu đạt.</p></div><button className="btn btn-secondary" disabled={busy} onClick={() => void refresh()}><RefreshCw size={16} /> Tải lại</button></header>
    <InstallationBacklog revision={job?.version} />
    {error && <div className="di-alert" role="alert"><AlertCircle size={18} /><span>{error}</span></div>}
    {message && <div className="di-message" role="status">{message}</div>}
    {manager && <section className="di-card"><h3>Phân công đơn đã được phê duyệt</h3><form onSubmit={e => void assign(e)} className="di-form-grid">
      <label>Đơn CONFIRMED<select required value={orderId} disabled={busy} onChange={e => setOrderId(e.target.value)}><option value="">Chọn đơn đủ điều kiện</option>{eligible?.content.map(o => <option key={o.id} value={o.id}>{o.id.slice(0, 8)} · {o.shippingAddress || 'Địa chỉ chưa có dữ liệu'}</option>)}</select></label>
      <label>Nhân viên giao kiêm lắp<select required value={assignee} disabled={busy} onChange={e => setAssignee(e.target.value)}><option value="">Chọn nhân viên kỹ thuật</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.fullName || t.id}</option>)}</select></label>
      <label>Lịch hẹn<input type="datetime-local" required value={scheduled} disabled={busy} onChange={e => setScheduled(e.target.value)} /></label><button className="btn btn-primary" disabled={busy || !eligible?.content.length}>Phân công</button>
    </form><div className="di-pagination"><button className="btn btn-secondary" disabled={busy || eligiblePage === 0} onClick={() => setEligiblePage(p => p - 1)}>Trang trước</button><span>Đơn chờ phân công: {eligible?.totalElements ?? 'Chưa tải'}</span><button className="btn btn-secondary" disabled={busy || !eligible || eligiblePage + 1 >= eligible.totalPages} onClick={() => setEligiblePage(p => p + 1)}>Trang sau</button></div></section>}
    <div className="di-grid"><section className="di-card"><div className="di-card-heading"><h3>Danh sách công việc</h3><label className="di-filter">Trạng thái<select value={status} disabled={busy} onChange={e => { setStatus(e.target.value); setPage(0); }}><option value="">Tất cả</option>{Object.entries(labels).map(([s, text]) => <option key={s} value={s}>{text}</option>)}</select></label></div>
      {loading && <p role="status">Đang tải công việc…</p>}
      {!loading && list?.content.length === 0 && <p>Chưa có công việc trong bộ lọc này.</p>}
      <div className="di-jobs">{list?.content.map(row => <button key={row.id} className={`di-job${job?.id === row.id ? ' selected' : ''}`} disabled={busy} onClick={() => { setError(''); void open(row.id, true).catch(e => setError(errorText(e))); }}><b>Đơn {row.orderId.slice(0, 8)}</b><span>{date(row.scheduledAt)}</span><span className="di-badge">{labels[row.status]}</span><small>Lượt {row.attempt}</small></button>)}</div>
      <div className="di-pagination"><button className="btn btn-secondary" disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page + 1} · {list?.totalElements ?? '—'} việc</span><button className="btn btn-secondary" disabled={busy || !list || page + 1 >= list.totalPages} onClick={() => setPage(p => p + 1)}>Sau</button></div>
    </section><section className="di-card" aria-busy={busy}>
      {!job ? <p>Chọn công việc để xem thông tin và tiến độ.</p> : <>
        <div className="di-card-heading"><h3>Đơn {job.orderId.slice(0, 8)}</h3><span className="di-badge">{labels[job.status]}</span></div>
        <p className="di-id">Job {job.id} · Lượt {job.attempt} · Phiên bản {job.version}</p>
        <div className="di-contact"><b>{job.customer?.fullName || 'Chưa có tên khách'}</b><p>{job.customer?.shippingAddress || 'Chưa có địa chỉ'}</p>{job.customer?.installationNote && <p>Hướng dẫn giao/lắp đặt: {job.customer.installationNote}</p>}{job.customer?.phone ? <a href={`tel:${job.customer.phone}`}>{job.customer.phone}</a> : <span>Chưa có số điện thoại</span>}</div>
        <p>Lịch hẹn: {date(job.scheduledAt)}</p><ol className="di-timeline"><li>Nhận việc: {date(job.startedAt)}</li><li>Đã giao: {date(job.deliveredAt)}</li><li>Đã lắp: {date(job.installedAt)}</li><li>Nghiệm thu: {date(job.completedAt)}</li></ol>
        {job.failureReason && <p className="di-alert">{job.failureReason}</p>}
        {working && job.status === 'ASSIGNED' && job.orderStatus === 'confirmed' && <button className="btn btn-primary" disabled={busy} onClick={() => void perform('start', undefined)}>Nhận việc & bắt đầu</button>}
        {working && job.status === 'IN_PROGRESS' && <button className="btn btn-primary" disabled={busy} onClick={() => void perform('confirm-delivery', { note: note || null })}>Xác nhận đã giao thiết bị</button>}
        {working && (job.status === 'IN_PROGRESS' || job.status === 'DELIVERED') && <form className="di-serial" onSubmit={e => { e.preventDefault(); void perform('devices', { orderItemId: itemId, serialNumber: serial.trim() }); }}><h4>Liên kết serial thực tế</h4><label>Thiết bị trong đơn<select required value={itemId} disabled={busy} onChange={e => setItemId(e.target.value)}><option value="">Chọn item</option>{job.items?.map(i => <option key={i.id} value={i.id}>{i.productName || i.sku || i.id} · {i.variantName} · SL {i.quantity}</option>)}</select></label><label>Serial<input required maxLength={100} value={serial} disabled={busy} autoCapitalize="none" onChange={e => setSerial(e.target.value)} placeholder="Nhập serial trên thiết bị đã đăng ký" /></label><button className="btn btn-secondary" disabled={busy}>Liên kết serial</button><small>Serial phải đã được đăng ký trong kho thiết bị. Không tạo hoặc nhận quyền sở hữu từ dữ liệu tự nhập.</small></form>}
        <h4>Thiết bị & kết quả kiểm tra từ backend</h4>{job.devices.length === 0 && <p>Chưa liên kết serial.</p>}
        {checks?.recorded && <p>Kết quả được lưu tại nghiệm thu {date(checks.acceptedAt || null)}. Đây là bằng chứng tại thời điểm nghiệm thu, không phải trạng thái thiết bị hiện tại.</p>}
        {job.devices.map(device => { const result = checks?.devices.find(d => d.deviceId === device.deviceId); return <div className="di-device" key={device.deviceId}><b>{device.serialNumber}</b><span>{device.hasWeightSensor ? 'Có cảm biến trọng lượng' : 'Không yêu cầu kiểm tra cân'}</span><ul>{Object.entries(checksLabels).map(([type, label]) => { const value = result?.checks[type as keyof typeof checksLabels]; return <li key={type}>{value === true ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}<span>{label}</span><b>{value === null ? 'Không áp dụng' : value === true ? 'Đạt' : 'Chưa đạt'}</b></li>; })}</ul>{canCommand && <div className="di-actions"><button className="btn btn-secondary" disabled={busy} onClick={() => void perform('checks/commands', { deviceId: device.deviceId, action: 'UNLOCK' })}>Kiểm tra mở khóa</button><button className="btn btn-secondary" disabled={busy} onClick={() => void perform('checks/commands', { deviceId: device.deviceId, action: 'LOCK' })}>Kiểm tra khóa</button>{device.hasWeightSensor && <button className="btn btn-secondary" disabled={busy} onClick={() => void perform('checks/commands', { deviceId: device.deviceId, action: 'TARE' })}>TARE & kiểm tra cân</button>}</div>}
          {device.hasWeightSensor && <p>Để trống cân khi TARE; sau phản hồi zero, đặt vật kiểm tra để backend quan sát biến động trọng lượng. Không nhập số cân để đánh dấu đạt.</p>}
          {result?.commands.slice(0, 6).map(c => <small className="di-command" key={c.id}>{c.action}: {c.status} · {c.lastError || 'Chờ/đọc phản hồi thiết bị'}</small>)}
        </div>; })}
        <button className="btn btn-secondary" disabled={busy} onClick={() => void open(job.id).catch(e => setError(errorText(e)))}>Đọc lại kết quả kiểm tra</button>
        {checks?.failedChecks.length ? <div className="di-diagnostics"><p>Điều kiện còn thiếu:</p><ul>{checks.failedChecks.map(f => <li key={f}>{f}</li>)}</ul></div> : null}
        {working && (job.status === 'DELIVERED' || job.status === 'INSTALLED') && <label>Ghi chú lắp đặt<textarea maxLength={2000} value={note} disabled={busy} onChange={e => setNote(e.target.value)} /></label>}
        {working && job.status === 'DELIVERED' && <button className="btn btn-primary" disabled={busy || !checks?.serialComplete || !note.trim()} onClick={() => void perform('confirm-installation', { installationNote: note.trim() })}>Xác nhận đã lắp đặt</button>}
        {working && job.status === 'INSTALLED' && <div className="di-acceptance"><label className="di-checkbox"><input type="checkbox" checked={customerAccepted} disabled={busy} onChange={e => setCustomerAccepted(e.target.checked)} />Tôi ghi nhận khách hàng đã đồng ý nghiệm thu.</label><button className="btn btn-primary" disabled={busy || !checks?.ready || checks.version !== job.version || !customerAccepted} onClick={() => void perform('acceptance', { customerAccepted, note: note || null })}>Nghiệm thu & hoàn thành</button><p>Backend kiểm tra lại tất cả thiết bị trong giao dịch trước khi chuyển Order sang COMPLETED.</p></div>}
        {!terminal && (working || manager) && <div className="di-failure"><label>Lý do thất bại<textarea maxLength={2000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label><button className="btn btn-secondary" disabled={busy || !reason.trim()} onClick={() => void perform('fail', { failureReason: reason.trim() })}>Ghi nhận thất bại</button></div>}
        {job.orderStatus === 'cancelled' && <p>Đơn hàng đã hủy; công việc đã khép lại và không được phân công lại.</p>}
        {manager && job.orderStatus === 'confirmed' && (job.status === 'FAILED' || job.status === 'ASSIGNED') && <div className="di-reassign"><h4>Phân công / lên lịch lại cùng công việc</h4><label>Nhân viên<select value={assignee} disabled={busy} onChange={e => setAssignee(e.target.value)}><option value="">Chọn nhân viên</option>{technicians.map(t => <option key={t.id} value={t.id}>{t.fullName || t.id}</option>)}</select></label><label>Lịch hẹn<input type="datetime-local" value={scheduled} disabled={busy} onChange={e => setScheduled(e.target.value)} /></label><label>Lý do<textarea maxLength={2000} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} /></label><button className="btn btn-primary" disabled={busy || !assignee || !scheduled || !reason.trim()} onClick={() => { const time = new Date(scheduled); if (!Number.isFinite(time.getTime())) { setError('Lịch hẹn không hợp lệ.'); return; } void perform('reassign', { assignedTo: assignee, scheduledAt: time.toISOString(), reason: reason.trim() }); }}>Phân công lại</button></div>}
        <details><summary>Lịch sử công việc</summary><ol className="di-history">{job.history?.map((h, i) => <li key={`${h.version}:${h.action}:${i}`}><b>{h.action} · {labels[h.toStatus as JobStatus] || h.toStatus}</b><span>{date(h.createdAt)} · Lượt {h.attempt}</span>{h.reason && <p>{h.reason}</p>}</li>)}</ol></details>
      </>}
    </section></div>
  </div>;
};
