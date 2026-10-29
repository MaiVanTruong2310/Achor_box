import { adminRequest } from './adminRequest';
export interface SalesInvoice {invoiceNumber:string;orderId:string;issuedAt:string;html:string}
export const issueSalesInvoice = (orderId:string) => adminRequest<SalesInvoice>(`/orders/${encodeURIComponent(orderId)}/sales-invoice`,{method:'POST'});
