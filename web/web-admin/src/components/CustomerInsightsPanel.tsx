import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getCustomerInsights, type CustomerInsights } from '../services/concurrentDashboardApi';
import './customer-insights.css';

const money = (v: number) => Number(v).toLocaleString('vi-VN') + ' ₫';

function delta(current: number, previous: number): { text: string; tone: 'up' | 'down' | 'flat' } {
  if (previous === 0) return current > 0 ? { text: 'Chưa có số liệu kỳ trước', tone: 'up' } : { text: 'Chưa có thay đổi', tone: 'flat' };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return { text: 'Bằng 30 ngày trước', tone: 'flat' };
  return { text: `${pct > 0 ? '+' : ''}${pct}% so với 30 ngày trước`, tone: pct > 0 ? 'up' : 'down' };
}

export const CustomerInsightsPanel: React.FC<{ revision?: number }> = ({ revision = 0 }) => {
  const [data, setData] = useState<CustomerInsights | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setError('');
    getCustomerInsights()
      .then((r) => { if (active) setData(r); })
      .catch((e) => { if (active) setError(e?.message || 'Không tải được thống kê khách hàng.'); });
    return () => { active = false; };
  }, [revision]);

  const d = data ? delta(data.newLast30Days, data.newPrevious30Days) : null;
  const topRevenue = data?.topCustomers[0]?.revenue || 1;

  return (
    <section className="ci-panel" aria-label="Thống kê khách hàng">
      <header className="ci-head">
        <h3 className="ci-title">Khách hàng</h3>
        <Link to="/customers" className="ci-link">Xem tất cả</Link>
      </header>

      {error && <p className="ci-empty">{error}</p>}
      {!error && !data && <p className="ci-empty">Đang tải số liệu…</p>}

      {data && (
        <>
          <div className="ci-kpis">
            <div className="ci-kpi">
              <span className="ci-kpi-label">Khách mới, 30 ngày</span>
              <span className="ci-kpi-val">{data.newLast30Days}</span>
              {d && <span className={`ci-kpi-note ${d.tone}`}>{d.text}</span>}
            </div>
            <div className="ci-kpi">
              <span className="ci-kpi-label">Khách mới, 7 ngày</span>
              <span className="ci-kpi-val">{data.newLast7Days}</span>
              <span className="ci-kpi-note">Tổng {data.totalCustomers} khách</span>
            </div>
            <div className="ci-kpi">
              <span className="ci-kpi-label">Doanh thu mỗi khách</span>
              <span className="ci-kpi-val">{money(data.avgRevenuePerBuyer)}</span>
              <span className="ci-kpi-note">{data.buyers} khách đã thanh toán</span>
            </div>
          </div>

          <h4 className="ci-sub">Khách hàng có doanh thu cao nhất</h4>
          {data.topCustomers.length === 0 ? (
            <p className="ci-empty">Chưa có khách hàng nào thanh toán đơn hàng.</p>
          ) : (
            <ol className="ci-list">
              {data.topCustomers.map((c, i) => (
                <li key={c.id} className="ci-row">
                  <span className="ci-rank" aria-hidden="true">{i + 1}</span>
                  <div className="ci-who">
                    <span className="ci-name">{c.name}</span>
                    <span className="ci-meta">{c.orders} đơn{c.email ? ` · ${c.email}` : ''}</span>
                    <span className="ci-bar"><span style={{ width: `${Math.max(4, (c.revenue / topRevenue) * 100)}%` }} /></span>
                  </div>
                  <span className="ci-money">{money(c.revenue)}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </section>
  );
};
