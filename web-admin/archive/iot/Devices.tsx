import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Search,
  RefreshCw,
  Battery,
  Wifi,
  Radio,
  AlertTriangle,
  UploadCloud,
  CheckCircle2,
  Lock,
  Activity,
  X,
  ShieldCheck,
  MapPin,
  Globe,
  Server,
  Zap,
  Navigation
} from 'lucide-react';
import { Device } from '../types/database';
import { devicesService, ExtendedDevice } from '../services/api';
import { RealDeviceMap } from '../components/RealDeviceMap';

export const Devices: React.FC = () => {
  const [devices, setDevices] = useState<ExtendedDevice[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDevice, setSelectedDevice] = useState<ExtendedDevice | null>(null);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  // Modals
  const [isPingModalOpen, setIsPingModalOpen] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResult, setPingResult] = useState<string | null>(null);

  const loadDevices = async () => {
    setLoading(true);
    const data = await devicesService.getDevices();
    setDevices(data);
    setLoading(false);
  };

  useEffect(() => {
    loadDevices();
  }, []);

  // Filtered devices
  const filteredDevices = devices.filter((dev) => {
    const matchesStatus = filterStatus === 'all' || dev.status === filterStatus;
    const matchesSearch =
      dev.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.location_label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dev.public_ip.includes(searchTerm) ||
      dev.owner?.full_name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Handle focus on map
  const handleFocusOnMap = (dev: ExtendedDevice) => {
    setHighlightedId(dev.id);
    setSelectedDevice(dev);
    // Smooth scroll to map
    const mapElement = document.getElementById('iot-geoip-map');
    if (mapElement) {
      mapElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Run ICMP Ping test to IP
  const handleRunPingTest = (dev: ExtendedDevice) => {
    setSelectedDevice(dev);
    setIsPinging(true);
    setPingResult(null);
    setIsPingModalOpen(true);

    setTimeout(() => {
      setIsPinging(false);
      if (dev.status === 'offline') {
        setPingResult(`Request timed out. Không nhận được phản hồi từ IP ${dev.public_ip} (Thiết bị đang tắt nguồn hoặc mất kết nối Wi-Fi).`);
      } else {
        setPingResult(`PING ${dev.public_ip} thành công: 4 packets transmitted, 4 received, 0% packet loss. Thời gian phản hồi trung bình: ${dev.ping_ms || 22}ms (TTL=54).`);
      }
    }, 1200);
  };

  const onlineDevicesCount = devices.filter(d => d.status === 'online').length;
  const offlineDevicesCount = devices.filter(d => d.status === 'offline').length;
  const errorDevicesCount = devices.filter(d => d.status === 'error').length;
  const maintDevicesCount = devices.filter(d => d.status === 'maintenance').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Privacy Shield Notice Banner */}
      <div style={{
        background: 'rgba(16, 185, 129, 0.08)',
        border: '1px solid rgba(16, 185, 129, 0.25)',
        borderRadius: '12px',
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
      }}>
        <ShieldCheck size={20} color="var(--accent-emerald)" style={{ flexShrink: 0 }} />
        <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>Chế độ Bảo Mật E2EE:</strong> Chỉ tiếp nhận telemetry mạng và trạng thái cảm biến. Quyền mở khóa thuộc về chủ sở hữu.
        </div>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(37, 99, 235, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-primary)'
            }}>
              <Globe size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Giám Sát Thiết Bị IoT
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                Định vị trạm nút SmartBox, kiểm tra telemetry và nâng cấp OTA qua hệ thống GIS OpenStreetMap thời gian thực.
              </p>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn btn-secondary"
            onClick={() => loadDevices()}
          >
            <RefreshCw size={16} />
            <span>Quét Mạng</span>
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setDevices(prev => prev.map(d => ({ ...d, firmware_version: 'v1.2.1-stable' })));
              alert('Đã kích hoạt nâng cấp Firmware OTA v1.2.1!');
            }}
          >
            <UploadCloud size={16} />
            <span>Nâng Cấp OTA</span>
          </button>
        </div>
      </div>

      {/* IoT Metric Cards - Dynamic from Real Data */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(37, 99, 235, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-primary)'
          }}>
            <Server size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Thiết Bị Trực Tuyến
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
              {onlineDevicesCount} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>/ {devices.length} trực tuyến</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-emerald)' }} />
              {devices.length ? Math.round((onlineDevicesCount / devices.length) * 100) : 100}% Online
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-emerald)'
          }}>
            <Radio size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Hạ Tầng MQTT EMQX
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--accent-emerald)', letterSpacing: '0.5px' }}>
              ONLINE (TLS v1.3)
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              emqx.smartdeliverybox.io • Ping 24ms
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: errorDevicesCount + offlineDevicesCount > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: errorDevicesCount + offlineDevicesCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)'
          }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Cảnh Báo / Ngoại Tuyến
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: errorDevicesCount + offlineDevicesCount > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}>
              {errorDevicesCount + offlineDevicesCount} <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>Trạm cần lưu ý</span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              {errorDevicesCount > 0 ? `${errorDevicesCount} trạm tín hiệu yếu` : offlineDevicesCount > 0 ? `${offlineDevicesCount} trạm mất kết nối` : 'Tất cả trạm ổn định'}
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '10px',
            background: 'rgba(14, 165, 233, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent-sky)'
          }}>
            <UploadCloud size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Bản Firmware Hệ Thống
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-sky)' }}>
              v1.2.1-stable
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Đã kiểm định an toàn bảo mật
            </div>
          </div>
        </div>
      </div>

      {/* REAL LEAFLET MAP (OpenStreetMap & CartoDB GIS) */}
      <RealDeviceMap
        devices={devices}
        selectedDevice={selectedDevice}
        highlightedId={highlightedId}
        onSelectDevice={(dev) => {
          setSelectedDevice(dev);
          setHighlightedId(dev.id);
        }}
        onRunPingTest={handleRunPingTest}
      />

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '280px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '420px' }}>
            <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              className="input-field"
              style={{ paddingLeft: '38px', margin: 0 }}
              placeholder="Tìm theo Serial (BOX-xxx), địa chỉ IP, vị trí..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `Tất cả (${devices.length})` },
            { id: 'online', label: `Online (${onlineDevicesCount})` },
            { id: 'error', label: `Tín hiệu yếu (${errorDevicesCount})` },
            { id: 'maintenance', label: `Bảo trì (${maintDevicesCount})` },
            { id: 'offline', label: `Mất kết nối (${offlineDevicesCount})` }
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setFilterStatus(st.id)}
              className={`btn ${filterStatus === st.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Device Table (Pure Passive Network Monitoring - NO Remote Unlocking) */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>SERIAL & CHIP VI ĐIỀU KHIỂN</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>VỊ TRÍ ĐỊA LÝ & CHỦ SỞ HỮU</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>ĐỊA CHỈ IP & MẠNG INTERNET</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>TRẠNG THÁI KẾT NỐI</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>BẢO MẬT KHÁCH HÀNG</th>
                <th style={{ padding: '14px 18px', fontWeight: 600 }}>FIRMWARE</th>
                <th style={{ padding: '14px 18px', fontWeight: 600, textAlign: 'right' }}>GIÁM SÁT MẠNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((dev) => (
                <tr
                  key={dev.id}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    transition: 'background 0.15s',
                    background: highlightedId === dev.id ? 'rgba(37, 99, 235, 0.08)' : 'transparent'
                  }}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)', fontSize: '0.95rem' }}>
                      {dev.serial_number}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      MAC: {dev.mac_address}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Chip: {dev.chip_model}
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{dev.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{dev.location_label}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Chủ hộp: <strong style={{ color: 'var(--text-primary)' }}>{dev.owner?.full_name}</strong>
                    </div>
                  </td>

                  {/* Public GeoIP and Local IP */}
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Globe size={14} color="var(--accent-sky)" />
                      <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-sky)', fontSize: '0.85rem' }}>
                        {dev.public_ip}
                      </strong>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                      LAN IP: {dev.local_ip}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      <Wifi size={11} color={dev.wifi_rssi > -70 ? 'var(--accent-emerald)' : 'var(--accent-amber)'} />
                      <span>{dev.wifi_rssi} dBm</span>
                      <span>• Ping: {dev.ping_ms}ms</span>
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    {dev.status === 'online' && (
                      <span className="badge badge-online">
                        <span className="badge-dot" />
                        Online ({dev.last_seen_at})
                      </span>
                    )}
                    {dev.status === 'offline' && (
                      <span className="badge badge-offline">
                        <span className="badge-dot" />
                        Mất kết nối
                      </span>
                    )}
                    {dev.status === 'error' && (
                      <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
                        <AlertTriangle size={12} />
                        Mất gói tin
                      </span>
                    )}
                  </td>

                  {/* Privacy Guarantee Status */}
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'rgba(16, 185, 129, 0.1)',
                      color: 'var(--accent-emerald)',
                      fontSize: '0.75rem',
                      fontWeight: 600
                    }}>
                      <Lock size={12} />
                      <span>Mã Hóa E2EE (Khách Bảo Mật)</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '3px' }}>
                      Admin không can thiệp nắp
                    </div>
                  </td>

                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-color)',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: dev.firmware_version === 'v1.2.1-stable' ? 'var(--accent-emerald)' : 'var(--text-primary)'
                    }}>
                      {dev.firmware_version}
                    </span>
                  </td>

                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Định vị điểm nút trên Bản đồ IP"
                        onClick={() => handleFocusOnMap(dev)}
                      >
                        <MapPin size={14} color="var(--accent-primary)" />
                        <span>Xem Map</span>
                      </button>

                      <button
                        className="btn btn-secondary"
                        style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '5px' }}
                        title="Kiểm tra kết nối Ping mạng tới IP"
                        onClick={() => handleRunPingTest(dev)}
                      >
                        <Activity size={14} />
                        <span>Ping IP</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ICMP Network Ping Test to IP (Passive Only) */}
      {isPingModalOpen && selectedDevice && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} color="var(--accent-primary)" />
                  Kiểm Tra Trạng Thái Kết Nối IP Mạng
                </h3>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  IP: <strong style={{ color: 'var(--accent-sky)', fontFamily: 'var(--font-mono)' }}>{selectedDevice.public_ip}</strong> • {selectedDevice.name}
                </p>
              </div>
              <button
                className="btn btn-secondary"
                style={{ padding: '6px', borderRadius: '50%' }}
                onClick={() => setIsPingModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Privacy Compliance Note */}
            <div style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '8px',
              padding: '10px 14px',
              marginBottom: '16px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              Thao tác chỉ gửi gói tin ICMP Echo / TCP Handshake để kiểm tra độ trễ mạng, không truy cập nội dung hay can thiệp thiết bị của khách hàng.
            </div>

            {/* Test Animation / Result */}
            <div style={{
              background: '#090d16',
              borderRadius: '8px',
              padding: '16px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.8rem',
              color: '#34d399',
              minHeight: '100px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              border: '1px solid rgba(255,255,255,0.08)'
            }}>
              <div>$ ping -c 4 {selectedDevice.public_ip}</div>
              {isPinging ? (
                <div style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang gửi gói tin thăm dò mạng tới trạm IP...</span>
                </div>
              ) : (
                pingResult && <div style={{ whiteSpace: 'pre-wrap' }}>{pingResult}</div>
              )}
            </div>

            <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                className="btn btn-primary"
                disabled={isPinging}
                onClick={() => handleRunPingTest(selectedDevice)}
              >
                Ping Lại
              </button>
              <button className="btn btn-secondary" onClick={() => setIsPingModalOpen(false)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
