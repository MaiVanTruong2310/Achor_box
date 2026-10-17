import {adminRequest} from './adminRequest';
export interface CustomerContact{id:string;profileId:string|null;fullName:string;email:string|null;phone:string|null;address:string|null;notes:string|null;archived:boolean;username:string|null;isLocked:boolean|null;createdAt:string;updatedAt:string}
export interface CustomerContactPage{content:CustomerContact[];page:number;size:number;totalElements:number;totalPages:number}
export const customerDirectoryApi={
 list:(page:number,search:string,account:string,state:string)=>adminRequest<CustomerContactPage>(`/admin/customers?${new URLSearchParams({page:String(page),size:'20',search,account,state})}`),
 create:(body:unknown,key:string)=>adminRequest<CustomerContact>('/admin/customers',{method:'POST',headers:{'Idempotency-Key':key},body:JSON.stringify(body)}),
 update:(id:string,body:unknown)=>adminRequest<CustomerContact>(`/admin/customers/${id}`,{method:'PUT',body:JSON.stringify(body)}),
};
