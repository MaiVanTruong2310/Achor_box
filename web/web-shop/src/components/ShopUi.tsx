import { Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ApiError, statuses } from '../api/shop';
import { useShop } from '../ShopContext';
export function useResource<T>(loader: (signal: AbortSignal) => Promise<T>, key: string) {
    const [data, setData] = useState<T>();
    const [error, setError] = useState<Error>();
    const [loading, setLoading] = useState(true);
    const [version, setVersion] = useState(0);
    const [loadedKey, setLoadedKey] = useState(key);
    useEffect(() => { const controller = new AbortController(); if (loadedKey !== key)
        setData(undefined); setLoadedKey(key); setError(undefined); setLoading(true); loader(controller.signal).then(value => { if (!controller.signal.aborted)
        setData(value); }).catch(reason => { if (!controller.signal.aborted) {
        setError(reason);
        if (reason instanceof ApiError && [401, 403, 404].includes(reason.status))
            setData(undefined);
    } }).finally(() => { if (!controller.signal.aborted)
        setLoading(false); }); return () => controller.abort(); }, [key, version]);
    return { data: loadedKey === key ? data : undefined, error: loadedKey === key ? error : undefined, loading: loadedKey !== key || loading, retry: () => setVersion(v => v + 1) };
}
export function ErrorNotice({ error, retry, focus = false }: {
    error?: Error;
    retry?: () => void;
    focus?: boolean;
}) { const notice = useRef<HTMLDivElement>(null); useEffect(() => { if (focus && error) notice.current?.focus(); }, [error, focus]); if (!error)
    return null; return <div ref={notice} className="notice danger" role="alert" tabIndex={-1}><p>{error.message}</p>{error instanceof ApiError && error.fields && <ul>{Object.entries(error.fields).map(([field, message]) => <li key={field}>{field}: {String(message)}</li>)}</ul>}{error instanceof ApiError && error.traceId && <p>Mã theo dõi: {error.traceId}</p>}{retry && <button onClick={retry}>Thử lại</button>}</div>; }
export function ResourceState({ loading, error, retry }: {
    loading: boolean;
    error?: Error;
    retry: () => void;
}) { return loading ? <div className="loading-state" role="status" aria-live="polite"><span>Đang tải dữ liệu…</span><div className="skeleton"/><div className="skeleton short"/></div> : <ErrorNotice error={error} retry={retry}/>; }
export function Status({ value }: {
    value: string;
}) { return <span className={`badge ${value}`} title={value}>{statuses[value] || value}</span>; }
export function Guard({ children }: {
    children: ReactNode;
}) { const { user } = useShop(); const location = useLocation(); return user && user.role !== 'customer' ? <section className="container section"><h1>Tài khoản nhân viên</h1><p>Khu vực này dành cho khách hàng. Hãy đăng xuất và sử dụng tài khoản khách hàng để mua hàng.</p><Link to="/products">Xem sản phẩm</Link></section> : user ? <Fragment key={user.userId}>{children}</Fragment> : <Navigate to={`/login?returnTo=${encodeURIComponent(location.pathname + location.search)}`} replace/>; }
export function Planned({ title, children }: {
    title: string;
    children?: ReactNode;
}) { return <section className="container section"><p className="eyebrow">Đang chuẩn bị</p><h1>{title}</h1><div className="notice">{children || 'Chức năng này sẽ được mở khi dịch vụ hỗ trợ sẵn sàng.'}</div><Link className="button secondary" to="/products">Khám phá sản phẩm</Link></section>; }
export function AccountNav() { return null; }
