import React, { createContext, useContext, useEffect, useState } from 'react';
import { paymentApi, PaymentMode, paymentLabel } from '../api/paymentApi';
const Context = createContext<{ mode: PaymentMode | null; error: string }>({ mode: null, error: '' });
export const usePaymentMode = () => useContext(Context);
export const PaymentModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<PaymentMode | null>(null); const [error, setError] = useState('');
  useEffect(() => { let active = true; paymentApi.mode().then(m => { if (typeof m.isSimulated !== 'boolean') throw new Error('Không xác định được chế độ thanh toán.'); if (active) setMode(m); }).catch(e => { if (active) setError(e.message); }); return () => { active = false; }; }, []);
  return <Context.Provider value={{mode,error}}>{children}</Context.Provider>;
};
export const PaymentModeNotice: React.FC = () => {
  const { mode, error } = usePaymentMode();
  if (!mode?.isSimulated && !error) return null;
  return <aside role="status" style={{padding:'10px 16px',background:'var(--warning-bg, #fff3cd)',color:'var(--text-main)',textAlign:'center'}}>{mode?.isSimulated ? paymentLabel(mode) : 'Chưa xác định được chế độ thanh toán. Vui lòng tải lại trước khi đặt hàng.'}</aside>;
};
