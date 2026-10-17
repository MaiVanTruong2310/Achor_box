import {supabase} from './supabase';import {AdminApiError,adminRequest} from './adminRequest';
const base=(import.meta.env.VITE_BACKEND_API_URL||'http://localhost:8080/api').replace(/\/+$/,'');
export interface ReportDefinition{code:string;name:string;params:{name:string;dataType:string;required:boolean;maxDays:number|null}[]}
export const reportDefinition=()=>adminRequest<ReportDefinition>('/reports/RPT_REVENUE_DAILY');
export async function exportRevenue(format:'PDF'|'XLSX',params:Record<string,string>):Promise<Blob>{
 const {data:{session}}=await supabase.auth.getSession();if(!session?.access_token)throw new AdminApiError('Vui lòng đăng nhập lại.',401);
 const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),60000);
 try{const response=await fetch(`${base}/reports/RPT_REVENUE_DAILY/export`,{method:'POST',headers:{Authorization:`Bearer ${session.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({format,params}),signal:controller.signal});
  if(!response.ok){const text=await response.text();let error:any={};try{error=JSON.parse(text);}catch{/* Do not download an error page. */}if(response.status===401)window.dispatchEvent(new CustomEvent('smartbox:auth-expired'));throw new AdminApiError(error.message||`Không xuất được báo cáo (${response.status}).`,response.status);}
  const type=response.headers.get('Content-Type')||'';if(!(format==='PDF'?type.includes('application/pdf'):type.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')))throw new AdminApiError('File báo cáo trả về không đúng định dạng.',response.status);
  const blob=await response.blob();if(blob.size===0)throw new AdminApiError('Báo cáo trả về rỗng.',response.status);return blob;
 }catch(e){if(e instanceof AdminApiError)throw e;throw new AdminApiError('Chưa nhận được file báo cáo. Vui lòng thử lại.',0);}finally{clearTimeout(timer);}
}
