import { customerRequest } from './customerClient';
export interface SalesInvoice {invoiceNumber:string;orderId:string;issuedAt:string;html:string}
export const issueSalesInvoice = (orderId:string) => customerRequest<SalesInvoice>(`/orders/${encodeURIComponent(orderId)}/sales-invoice`,{method:'POST'});
