import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { InstallationBacklog } from '../components/InstallationBacklog';
import { getConcurrentDashboard, type ConcurrentDashboard } from '../services/concurrentDashboardApi';

const labels: Record<string,string> = { PENDING:'Chờ xử lý', AWAITING_PAYMENT:'Chờ thanh toán', PAID:'Đã thanh toán', CONFIRMED:'Đã duyệt', COMPLETED:'Hoàn tất', CANCELLED:'Đã hủy' };
const money = (value: number) => Number(value).toLocaleString('vi-VN') + ' ₫';
const today = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const panel: React.CSSProperties = {padding:24, minWidth:0};
export const Dashboard: React.FC = () => {
  const [date,setDate]=useState(today);
  const [mode,setMode]=useState<'parallel'|'sequential'>('parallel');
  const [revision,setRevision]=useState(0);
  const [data,setData]=useState<ConcurrentDashboard|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [demo,setDemo]=useState(false);
  useEffect(()=>{
    let active=true;setLoading(true);setError('');setData(null);
    getConcurrentDashboard(date,mode).then(result=>{if(active){setData(result);setDemo(result.demo);}})
      .catch(e=>{if(active)setError(e.status === 503 ? 'Báo cáo đang bận. Vui lòng thử lại sau ít giây.' : e.message);}).finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[date,mode,revision]);
  const unavailable = <p role="status">Phần số liệu này chưa tải được. Hãy thử tải lại.</p>;
  return <div style={{display:'flex',flexDirection:'column',gap:20}}>
    <div className="section-header" style={{flexWrap:'wrap',gap:12}}>
      <div><h1>Báo cáo bán hàng</h1><p>Ngày theo giờ Việt Nam · Thống kê bán chạy và tồn kho theo biến thể/SKU.</p></div>
      <div style={{display:'flex',gap:12,alignItems:'center',flexWrap:'wrap'}}>
        <label>Ngày báo cáo <input type="date" value={date} onChange={e=>{if(e.target.value)setDate(e.target.value);}} /></label>
        <button className="btn btn-primary" disabled={loading} onClick={()=>setRevision(r=>r+1)}>Tải lại</button>
      </div>
    </div>
    {demo && <div className="card" style={panel}><label>So sánh trong chế độ demo <select value={mode} onChange={e=>setMode(e.target.value as 'parallel'|'sequential')}><option value="parallel">Tải song song</option><option value="sequential">Tải tuần tự</option></select></label><p>Thời gian xử lý: {data ? `${data.elapsedMs} ms` : 'Đang đo…'}</p></div>}
    {loading && <p role="status">Đang tải báo cáo…</p>}
    {error && <p role="alert">{error} <button onClick={()=>setRevision(r=>r+1)}>Thử lại</button></p>}
    {data && <>
      {data.partial && <p role="alert">Một số phần chưa tải được; các số liệu còn lại vẫn sử dụng được.</p>}
      <p style={{color:'var(--text-secondary)'}}>Doanh thu gồm đơn đã thanh toán, đã duyệt hoặc hoàn tất; có thể bao gồm giao dịch thử nghiệm khi hệ thống dùng mock/VNPAY Sandbox.</p>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,340px),1fr))',gap:20}}>
        <section className="card" style={panel}><h2>Doanh thu ngày {data.date}</h2><p>Theo thời điểm thanh toán.</p>{data.revenueToday === null ? unavailable : <strong style={{fontSize:32}}>{money(data.revenueToday)}</strong>}</section>
        <section className="card" style={panel}><h2>Đơn hàng theo trạng thái</h2><p>Toàn bộ đơn trong hệ thống.</p>{data.orderCountByStatus === null ? unavailable : <dl>{Object.entries(labels).map(([key,label])=><div key={key} style={{display:'flex',justifyContent:'space-between',padding:'6px 0'}}><dt>{label}</dt><dd>{data.orderCountByStatus![key]}</dd></div>)}</dl>}<Link to="/orders">Quản lý đơn hàng</Link></section>
        <section className="card" style={panel}><h2>5 biến thể bán chạy</h2><p>30 ngày kết thúc vào {data.date} · Xếp theo số lượng đã bán.</p>{data.top5Variants === null ? unavailable : data.top5Variants.length === 0 ? <p>Chưa có biến thể được bán trong kỳ.</p> : <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Biến thể / SKU</th><th>Số lượng</th></tr></thead><tbody>{data.top5Variants.map(v=><tr key={v.variantId}><td style={{padding:'12px 0'}}>{v.name} · {v.variantName || 'Biến thể'}<br/><small>{v.sku || v.variantId}</small></td><td>{v.quantitySold}</td></tr>)}</tbody></table></div>}</section>
        <section className="card" style={panel}><h2>Biến thể sắp hết hàng</h2><p>Tồn có thể bán hiện tại ≤ 5 · Chỉ các biến thể và sản phẩm đang hoạt động.</p>{data.lowStockVariants === null ? unavailable : data.lowStockVariants.length === 0 ? <p>Không có biến thể sắp hết hàng.</p> : <div style={{overflowX:'auto'}}><table style={{width:'100%',textAlign:'left'}}><thead><tr><th>Biến thể / SKU</th><th>Tồn kho</th></tr></thead><tbody>{data.lowStockVariants.map(v=><tr key={v.variantId}><td style={{padding:'12px 0'}}>{v.name}<br/><small>{v.sku}</small></td><td>{v.stock}</td></tr>)}</tbody></table></div>}<Link to="/products">Quản lý kho hàng</Link></section>
      </div>
    </>}
    <InstallationBacklog revision={revision}/>
  </div>;
};
