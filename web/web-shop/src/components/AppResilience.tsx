import { Component, useEffect, useState, type ReactNode } from 'react';
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (this.state.failed) return <main className="container section"><h1>Trang đang gặp sự cố.</h1><p>Bạn có thể tải lại trang để tiếp tục. Nếu vừa gửi đơn hoặc thanh toán, hãy kiểm tra đơn hàng trước khi thực hiện lại.</p><button className="button" onClick={() => window.location.reload()}>Tải lại trang</button><a className="text-link" href="/account/orders">Kiểm tra đơn hàng</a></main>;
    return this.props.children;
  }
}
export function ConnectionNotice() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update); window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  return online ? null : <p className="connection-notice" role="status">Bạn đang ngoại tuyến. Hãy kết nối lại trước khi gửi đơn hoặc thanh toán. Nếu vừa gửi yêu cầu, kiểm tra trạng thái đơn khi có mạng.</p>;
}
