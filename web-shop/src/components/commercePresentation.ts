export const labels: Record<string,string> = {
 CREATED:'Đã tạo đơn', UPDATED:'Đã cập nhật thông tin', RESUBMITTED:'Đã gửi giải trình', ORDER_CREATED_AWAITING_APPROVAL:'Đơn đã gửi và đang chờ xét duyệt',
 APPROVE:'Đã phê duyệt', REJECT:'Đã từ chối', RETURN:'Yêu cầu bổ sung thông tin', ASSIGN:'Đã phân công giao lắp', REASSIGN:'Đã phân công lại', START:'Bắt đầu giao lắp', DELIVER:'Đã giao thiết bị', INSTALL:'Đã lắp đặt', ACCEPT:'Đã nghiệm thu', FAIL:'Giao lắp cần xử lý lại',
 SUBMIT_COMPLETION:'Đã gửi báo cáo nghiệm thu', PO_APPROVE_COMPLETION:'PO đã duyệt nghiệm thu', PO_REJECT_COMPLETION:'Yêu cầu bổ sung nghiệm thu', LINK_SERIAL:'Đã gắn serial thiết bị', CHECK_LOCK:'Kiểm tra khóa', CHECK_UNLOCK:'Kiểm tra mở khóa', CHECK_TARE:'Kiểm tra cảm biến cân',
 pending:'Chờ duyệt đơn', awaiting_payment:'Chờ thanh toán', paid:'Đã thanh toán', confirmed:'Đã xác nhận', processing:'Đang chuẩn bị', shipping:'Đang giao hàng', delivered:'Đã giao hàng', completed:'Đã hoàn tất', cancelled:'Đã hủy', refunded:'Đã hoàn tiền', customer_decision_pending:'Cần bạn xác nhận',
 PENDING:'Chờ xét duyệt', APPROVED:'Đã duyệt', REJECTED:'Đã từ chối', RETURNED:'Cần giải trình', PARTIALLY_REJECTED:'Duyệt một phần', CANCELLED:'Đã hủy',
 ASSIGNED:'Đã phân công', IN_PROGRESS:'Đang giao lắp', DELIVERED:'Đã giao thiết bị', INSTALLED:'Đã lắp đặt', WAITING_PO_CONFIRMATION:'Chờ duyệt nghiệm thu', COMPLETED:'Đã nghiệm thu', FAILED:'Cần xử lý lại',
 success:'Thành công', failed:'Thất bại', expired:'Hết hạn', refund_required:'Chờ hoàn tiền', active:'Còn hiệu lực', void:'Đã vô hiệu', new:'Đã tiếp nhận', assigned:'Đã phân công', in_progress:'Đang xử lý', resolved:'Đã xử lý', rejected:'Đã từ chối',
 CHECKOUT:'Đã mở phiên thanh toán', PAYMENT_SUCCESS:'Thanh toán thành công', PAYMENT_TIMEOUT:'Quá hạn thanh toán', INSTALLATION_ACCEPTED:'Đã xác nhận nghiệm thu', ORDER_COMPLETED:'Đơn hàng hoàn tất', DRAFT_EXPIRED:'Đơn nháp hết hạn', PO_APPROVED_COMPLETION:'PO đã xác nhận hoàn tất'
};
export function eventLabel(value = '') { return labels[value] || labels[value.replace(/^TECH_/, '')] || 'Cập nhật trạng thái'; }
export function knownLabel(value = '') { return !!(labels[value] || labels[value.replace(/^TECH_/, '')]); }
export function statusLabel(value: string, context = '') { return value === 'pending' && context === 'payment' ? 'Chờ thanh toán' : labels[value] || 'Đang cập nhật'; }
export function tone(value: string) { const key=value.toLowerCase(); return ['success','paid','completed','approved','resolved','active'].includes(key) ? 'positive' : ['failed','cancelled','rejected','void','expired'].includes(key) ? 'negative' : ['pending','awaiting_payment','returned','customer_decision_pending','waiting_po_confirmation','refund_required'].includes(key) ? 'warning' : 'neutral'; }
export function displayDate(value?: string | null, onlyDate=false) {
 if(!value) return 'Chưa cập nhật';
 const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(value); const parsed=new Date(dateOnly ? value+'T00:00:00+07:00' : value);
 if(!Number.isFinite(parsed.getTime())) return value;
 return new Intl.DateTimeFormat('vi-VN',{timeZone:'Asia/Ho_Chi_Minh',day:'2-digit',month:'2-digit',year:'numeric',...(!onlyDate && !dateOnly ? {hour:'2-digit',minute:'2-digit',hour12:false} : {})}).format(parsed);
}
export function eventDescription(value?: string) { if(!value) return ''; if(knownLabel(value)) return eventLabel(value); return value.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})/g, stamp=>displayDate(stamp)); }
export function warrantyState(record: {status:string;startDate:string;endDate:string}, today: string) { if(record.status !== 'active') return statusLabel(record.status); if(today < record.startDate) return 'Chưa đến ngày hiệu lực'; if(today > record.endDate) return 'Đã hết hạn'; return 'Còn hiệu lực'; }
