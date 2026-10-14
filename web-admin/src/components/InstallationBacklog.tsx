import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { backendRequest } from '../services/deliveryInstallation';
interface Summary { scope: string; counts: Record<string, number>; observedAt: string }
const labels: Record<string,string> = { pendingApproval: 'PO Ticket chờ duyệt', unassigned: 'Chưa phân công', ASSIGNED: 'Chưa nhận việc', IN_PROGRESS: 'Đang thực hiện', DELIVERED: 'Chưa xác nhận lắp đặt', INSTALLED: 'Chờ nghiệm thu', FAILED: 'Thất bại / cần xử lý', overdue: 'Quá lịch hẹn' };
export const InstallationBacklog: React.FC<{ revision?: number }> = ({ revision }) => {
  const { profile } = useAuth(); const [summary, setSummary] = useState<Summary | null>(null); const [error, setError] = useState('');
  useEffect(() => { let active = true; if (!profile || !['super_admin','support_agent','technician'].includes(profile.role)) return;
    const load = () => backendRequest<Summary>('/delivery-installations/dashboard').then(data => { if (active) { setSummary(data); setError(''); } }).catch(e => { if (active) setError(e.message); });
    void load(); const timer = setInterval(() => { if (!document.hidden) void load(); },30000); return () => { active = false; clearInterval(timer); };
  }, [profile?.id,profile?.role,revision]);
  if (!profile || !['super_admin','support_agent','technician'].includes(profile.role)) return null;
  return <section style={{padding:20,border:'1px solid var(--border-color)',borderRadius:12,marginBottom:20}}><h3>Công việc tồn đọng{summary?.scope === 'MY_JOBS' ? ' của tôi' : ''}{summary ? ` · ${summary.counts.totalOutstanding}` : ''}</h3>{error && <p role="alert">{error}</p>}{!summary && !error && <p>Đang tải số liệu…</p>}
    {summary && <><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:12}}>{Object.entries(labels).filter(([key])=>summary.scope!=='MY_JOBS'||!['pendingApproval','unassigned'].includes(key)).map(([key,label])=><div key={key}><strong style={{fontSize:24}}>{summary.counts[key]}</strong><p>{label}</p></div>)}</div><small>Cập nhật {new Date(summary.observedAt).toLocaleString('vi-VN')} · Quá lịch hẹn là một phần của số công việc, không cộng hai lần.</small><p><Link to="/delivery-installations">Xem danh sách giao và lắp đặt</Link></p></>}
  </section>;
};
