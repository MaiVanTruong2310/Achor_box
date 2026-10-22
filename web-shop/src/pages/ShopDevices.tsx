import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, date, request, shop, type Device } from '../api/shop';
import { useShop } from '../ShopContext';
import { AccountNav, ErrorNotice, ResourceState, useResource } from '../components/ShopUi';
export function DeviceStatus({ device }: {
    device: Device;
}) { const last = device.last_seen_at ? Date.parse(device.last_seen_at) : NaN; const stale = !Number.isFinite(last) || Date.now() - last > 120000; return <><p>Trạng thái: {stale ? 'Chưa xác định / dữ liệu cũ' : device.status}</p><p>Lần cuối nhận dữ liệu: {date(device.last_seen_at)}</p><p>Cửa: {device.door_status || 'Chưa có dữ liệu'} · Khóa: {device.lock_status || 'Chưa có dữ liệu'}</p></>; }
export function Devices() { const { user } = useShop(); const resource = useResource(shop.devices, user?.userId || ''); return <section className="container section"><AccountNav /><h1>Thiết bị của tôi.</h1><ResourceState {...resource}/>{resource.data?.map(device => <Link key={device.id} className="panel device-card" to={`/account/devices/${device.id}`}><h3>{device.name || device.serial_number}</h3><p>Serial: {device.serial_number}</p><DeviceStatus device={device}/><span className="text-link">Xem thiết bị →</span></Link>)}{resource.data?.length === 0 && <p className="notice">Bạn chưa có thiết bị được liên kết.</p>}</section>; }
interface Reading {
    id: string;
    distance_cm: number | null;
    door_status?: string;
    received_at: string;
}
interface Parcel {
    id: string;
    detected_at: string;
    collected_at?: string;
    status: string;
}
interface Command {
    id?: string;
    commandId?: string;
    status: string;
    last_error?: string;
}
export function DeviceDetail() {
    const { id = '' } = useParams();
    const { user } = useShop();
    const resource = useResource(async (signal) => (await shop.devices(signal)).find(d => d.id === id) || null, `${user?.userId}:${id}`);
    const [packagesPage, setPackagesPage] = useState(0);
    const [readingsPage, setReadingsPage] = useState(0);
    const packages = useResource(signal => request<Parcel[]>(`/devices/${id}/packages?page=${packagesPage}&size=20`, { signal }), `${user?.userId}:${id}:${packagesPage}`);
    const readings = useResource(signal => request<Reading[]>(`/devices/${id}/readings?page=${readingsPage}&size=20`, { signal }), `${user?.userId}:${id}:${readingsPage}`);
    const [error, setError] = useState<Error>();
    const [busy, setBusy] = useState(false);
    const [command, setCommand] = useState<Command>();
    const [pollEnded, setPollEnded] = useState(false);
    const [pollVersion, setPollVersion] = useState(0);
    const commandKeys = useRef<Record<string, string>>({});
    useEffect(() => { const timer = setInterval(() => { if (!document.hidden && !resource.loading) resource.retry(); }, 10000); return () => clearInterval(timer); }, [id, user?.userId, resource.loading]);
    useEffect(() => { setCommand(undefined); setError(undefined); setPackagesPage(0); setReadingsPage(0); commandKeys.current = {}; }, [id, user?.userId]);
    const commandId = command?.commandId || command?.id;
    useEffect(() => {
        if (!commandId)
            return;
        const controller = new AbortController();
        let timer: ReturnType<typeof setTimeout>;
        const start = Date.now();
        setPollEnded(false);
        const poll = async () => { if (controller.signal.aborted)
            return; if (Date.now() - start > 15000) {
            setPollEnded(true);
            return;
        } if (document.hidden) {
            timer = setTimeout(poll, 1000);
            return;
        } try {
            const value = await request<Command>(`/devices/${id}/commands/${commandId}`, { signal: controller.signal });
            if (controller.signal.aborted)
                return;
            setCommand(value);
            if (['ACKNOWLEDGED', 'FAILED', 'TIMED_OUT'].includes(value.status)) {
                setPollEnded(true);
                resource.retry();
                readings.retry();
                return;
            }
        }
        catch (reason) {
            if (controller.signal.aborted)
                return;
            setError(reason as Error);
            if (reason instanceof ApiError && [401, 403, 404].includes(reason.status)) {
                setPollEnded(true);
                return;
            }
        } if (!controller.signal.aborted)
            timer = setTimeout(poll, 1000); };
        void poll();
        return () => { controller.abort(); clearTimeout(timer); };
    }, [commandId, id, user?.userId, pollVersion]);
    async function activate() { if (busy)
        return; setBusy(true); setError(undefined); try {
        await request(`/devices/${id}/activate`, { method: 'POST' });
        resource.retry();
    }
    catch (reason) {
        setError(reason as Error);
    }
    finally {
        setBusy(false);
    } }
    async function send(kind: string) { if (busy)
        return; setBusy(true); setError(undefined); setPollEnded(false); const key = commandKeys.current[kind] ||= crypto.randomUUID(); try {
        const value = await request<Command>(`/devices/${id}/commands`, { method: 'POST', body: JSON.stringify({ command: kind, requestKey: key }) });
        setCommand({ ...value, commandId: value.commandId || value.id });
    }
    catch (reason) {
        setError(reason as Error);
    }
    finally {
        setBusy(false);
    } }
    return <section className="container section"><AccountNav /><h1>Thiết bị & bưu kiện.</h1><ResourceState {...resource}/>{resource.data === null && <p className="notice">Không tìm thấy thiết bị trong tài khoản của bạn.</p>}{resource.data && <><div className="panel"><h2>{resource.data.name || resource.data.serial_number}</h2><DeviceStatus device={resource.data}/><ErrorNotice error={error}/>{!resource.data.activated_at ? <button disabled={busy} onClick={activate}>Kích hoạt thiết bị</button> : <div className="actions"><button disabled={busy || (!!command && !pollEnded)} onClick={() => send('LOCK')}>Gửi lệnh khóa</button><button disabled={busy || (!!command && !pollEnded)} onClick={() => send('UNLOCK')}>Gửi lệnh mở khóa</button></div>}{busy && <p role="status">Đang gửi yêu cầu…</p>}{command && <div role="status"><p>Lệnh: {command.status} · {command.last_error}</p><p>Gửi lệnh và ACK chưa xác nhận thay đổi vật lý. Hãy đối chiếu trạng thái cửa / khóa và thời điểm telemetry.</p>{pollEnded && <p>Đã dừng theo dõi tự động. <button onClick={() => setPollVersion(v => v + 1)}>Kiểm tra lại lệnh</button><button onClick={() => { setCommand(undefined); commandKeys.current = {}; }}>Chuẩn bị lệnh mới</button></p>}</div>}<p className="muted">Chức năng cân và TARE sẽ mở khi có thông tin xác minh khả năng cảm biến của thiết bị.</p><button onClick={resource.retry}>Cập nhật trạng thái</button></div><div className="panel"><h2>Bưu kiện gần đây.</h2><ResourceState {...packages}/>{packages.data?.map(parcel => <article className="data-row" key={parcel.id}><p>{parcel.status}</p><p>Phát hiện: {date(parcel.detected_at)} · Đã lấy: {date(parcel.collected_at)}</p></article>)}{packages.data?.length === 0 && <p>Chưa có bưu kiện ở trang này.</p>}<div className="actions"><button disabled={packages.loading || packagesPage === 0} onClick={() => setPackagesPage(p => p - 1)}>Trang trước</button><span>Trang {packagesPage + 1}</span><button disabled={packages.loading || packages.data?.length !== 20} onClick={() => setPackagesPage(p => p + 1)}>Trang sau</button></div></div><div className="panel"><h2>Dữ liệu cảm biến gần đây.</h2><ResourceState {...readings}/>{readings.data?.map(reading => <article className="data-row" key={reading.id}><p>{date(reading.received_at)}</p><p>Cửa: {reading.door_status || 'Chưa có dữ liệu'} · Khoảng cách: {reading.distance_cm == null ? 'Chưa có dữ liệu' : `${reading.distance_cm} cm`}</p></article>)}{readings.data?.length === 0 && <p>Chưa có dữ liệu cảm biến ở trang này.</p>}<div className="actions"><button disabled={readings.loading || readingsPage === 0} onClick={() => setReadingsPage(p => p - 1)}>Trang trước</button><span>Trang {readingsPage + 1}</span><button disabled={readings.loading || readings.data?.length !== 20} onClick={() => setReadingsPage(p => p + 1)}>Trang sau</button></div></div></>}</section>;
}
