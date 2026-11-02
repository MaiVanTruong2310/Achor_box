import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

/** Keeps a crashing page from blanking the whole console; resets when the route key changes. */
export class PageErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[admin] page crashed', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="ui-empty" role="alert">
        <strong>Trang này gặp lỗi khi hiển thị.</strong>
        <p>Dữ liệu trả về không đúng định dạng mong đợi. Thử tải lại, nếu vẫn lỗi hãy báo cho quản trị hệ thống.</p>
        <button type="button" className="ui-btn" onClick={() => this.setState({ error: null })}>Thử lại</button>
      </div>
    );
  }
}
