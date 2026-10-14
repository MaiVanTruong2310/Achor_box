import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {paymentApi,PAYMENT_LABELS} from '../api/paymentApi';
import {useAuth} from '../context/AuthContext';
export const VnpayReturnPage:React.FC=()=>{
 const {user,isLoading}=useAuth();
 const [query]=useState(()=>new URLSearchParams(window.location.search));
 const [payment,setPayment]=useState(''),[gateway,setGateway]=useState(''),[order,setOrder]=useState<any>(null),[error,setError]=useState(''),[waiting,setWaiting]=useState(true);
 useEffect(()=>{let alive=true;window.history.replaceState({},'',window.location.pathname);paymentApi.verifyReturn(query).then(result=>{if(alive){setPayment(result.paymentId);setGateway(result.gatewayResult);setError('');}}).catch(e=>{if(alive){setError(e.message);setWaiting(false);}});return()=>{alive=false;};},[query]);
 useEffect(()=>{if(!payment||!user)return;let alive=true,attempts=0;let timer:ReturnType<typeof setTimeout>;
 const poll=async()=>{try{const row=await paymentApi.orderForPayment(payment);if(!alive)return;setOrder(row);setError('');if(row.payment?.status!=='pending'){setWaiting(false);return;}if(++attempts>=20){setWaiting(false);return;}timer=setTimeout(poll,3000);}catch(e){if(alive){setError((e as Error).message);setWaiting(false);}}};poll();return()=>{alive=false;clearTimeout(timer);};},[payment,user?.id]);
 return <div className="container" style={{padding:'40px 16px'}}><h2>Kết quả VNPAY Sandbox</h2><p>Đây là giao dịch kiểm thử, không thu tiền thật.</p>{error&&<p role="alert">{error}</p>}{payment&&<p>Cổng thanh toán trả về: {gateway==='SUCCESS'?'Thành công':'Chưa thành công'}.</p>}{!isLoading&&!user&&<p><Link to="/login" state={{from:{pathname:'/account/orders'}}}>Đăng nhập</Link> để xem trạng thái đơn hàng.</p>}{order&&<><p>Trạng thái đã ghi nhận: {PAYMENT_LABELS[order.payment?.status]||order.payment?.status||order.status}</p><Link className="btn btn-primary" to={`/account/orders/${order.id}`}>Xem đơn hàng</Link></>}{waiting&&user&&<p>Đang chờ xác nhận giao dịch từ máy chủ…</p>}{!waiting&&order?.payment?.status==='pending'&&<p>Chưa nhận được IPN. Kiểm tra lại đơn hàng sau; chưa xác nhận thanh toán thành công.</p>}<p>Kết quả trên cổng chỉ để tham khảo; đơn được xác nhận sau khi hệ thống nhận và kiểm tra IPN.</p></div>;
};
