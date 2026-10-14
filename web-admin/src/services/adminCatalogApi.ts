import { adminRequest } from './adminRequest';
import { ExtendedOrder } from './api';
import { Profile } from '../types/database';
export interface Page<T> { content: T[]; currentPage: number; totalElements: number; totalPages: number }
export const adminCatalogApi = {
  async users(page: number, search: string, role: string, status: string): Promise<Page<Profile>> {
    const q=new URLSearchParams({page:String(page),size:'20',search});
    if(role!=='all')q.set('role',role);if(status!=='all')q.set('locked',String(status==='locked'));
    const result=await adminRequest<Page<any>>(`/users/paged?${q}`);
    return {...result,content:result.content.map(p=>({id:p.id,full_name:p.fullName,email:p.email,phone:p.phone,avatar_url:p.avatarUrl,default_address:p.defaultAddress,role:p.role,is_locked:p.isLocked,is_2fa_enabled:p.is2faEnabled,created_at:p.createdAt,updated_at:p.updatedAt}))};
  },
  async orders(page:number,search:string,status:string,payment:string):Promise<Page<ExtendedOrder>> {
    const q=new URLSearchParams({page:String(page),size:'20',search});
    if(status!=='all')q.set('status',status);if(payment!=='all')q.set('payment',payment);
    const result=await adminRequest<Page<any>>(`/orders/paged?${q}`);
    return {...result,content:result.content.map(o=>({id:o.id,user_id:o.userId,promotion_id:o.promotionId,status:o.status,shipping_address:o.shippingAddress,tracking_number:o.trackingNumber,total:o.total,payment_method:o.paymentMethod,payment_status:o.paymentStatus,transaction_ref:o.transactionRef,items_summary:o.itemsSummary,created_at:o.createdAt,updated_at:o.updatedAt,customer:{id:o.userId,full_name:o.customerName,phone:o.customerPhone,avatar_url:null,default_address:o.shippingAddress,role:'customer',is_locked:false,is_2fa_enabled:false,created_at:o.createdAt,updated_at:o.updatedAt}}))};
  }
};
