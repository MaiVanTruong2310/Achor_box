const prefix = 'anchorbox_order_pending:';
export function hasPendingOrder(userId: string): boolean {
  try { return localStorage.getItem(prefix + userId) !== null; }
  catch { return false; }
}
export function markPendingOrder(userId: string): void {
  // Fail before sending the order if the browser cannot retain the recovery marker.
  try { localStorage.setItem(prefix + userId, String(Date.now())); }
  catch { throw new Error('Trình duyệt không lưu được trạng thái đơn. Hãy cho phép lưu dữ liệu trang web trước khi gửi đơn.'); }
}
export function clearPendingOrder(userId: string): void {
  localStorage.removeItem(prefix + userId);
}
