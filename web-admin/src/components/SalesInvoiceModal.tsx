import React, { useEffect, useRef, useState } from 'react';
import { issueSalesInvoice, type SalesInvoice } from '../services/salesInvoiceApi';
export const SalesInvoiceModal: React.FC<{orderId:string;onClose:()=>void}> = ({orderId,onClose}) => {
  const [invoice,setInvoice]=useState<SalesInvoice|null>(null);
  const [error,setError]=useState('');const [revision,setRevision]=useState(0);
  const frame=useRef<HTMLIFrameElement>(null);
  const [ready,setReady]=useState(false);
  useEffect(()=>{let active=true;setInvoice(null);setError('');setReady(false);
    issueSalesInvoice(orderId).then(data=>{if(active)setInvoice(data);}).catch(e=>{if(active)setError(e.message);});
    return()=>{active=false;};
  },[orderId,revision]);
  const download=()=>{if(!invoice)return;const url=URL.createObjectURL(new Blob([invoice.html],{type:'text/html;charset=utf-8'}));
    const link=document.createElement('a');link.href=url;link.download=`${invoice.invoiceNumber}.html`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <div role="dialog" aria-modal="true" aria-label="Hóa đơn bán hàng" style={{position:'fixed',inset:0,zIndex:2000,background:'#0008',padding:16,display:'flex',alignItems:'center',justifyContent:'center'}}>
    <section style={{background:'var(--bg-surface, white)',color:'var(--text-primary, #172437)',borderRadius:12,width:'min(100%,1000px)',height:'92vh',display:'flex',flexDirection:'column',overflow:'hidden'}}>
      <div style={{padding:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}><strong>Hóa đơn bán hàng</strong><div style={{display:'flex',gap:8}}>
        <button className="btn btn-secondary" disabled={!invoice} onClick={download}>Tải HTML</button>
        <button className="btn btn-primary" disabled={!ready} onClick={()=>{frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print();}}>In / Lưu PDF</button>
        <button className="btn btn-secondary" onClick={onClose} aria-label="Đóng hóa đơn">Đóng</button>
      </div></div>
      {error ? <div style={{padding:24}}><p role="alert">{error}</p><button className="btn btn-secondary" onClick={()=>setRevision(r=>r+1)}>Thử lại</button></div> : !invoice ? <p role="status" style={{padding:24}}>Đang lập / tải hóa đơn…</p> : <iframe ref={frame} title="Nội dung hóa đơn bán hàng" sandbox="allow-same-origin allow-modals" srcDoc={invoice.html} onLoad={()=>setReady(true)} style={{flex:1,width:'100%',border:0,minHeight:0}}/>}
    </section>
  </div>;
};
