import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import {
  Globe,
  Maximize2,
  Navigation,
  Radio,
  Activity,
  Wifi,
  Battery,
  ShieldCheck,
  Terminal,
  Layers,
  MapPin,
  RefreshCw
} from 'lucide-react';
import { ExtendedDevice } from '../services/api';

export interface GeoCoordinate {
  lat: number;
  lng: number;
  cityName: string;
}

export function resolveDeviceCoordinates(device: ExtendedDevice): GeoCoordinate {
  const loc = (device.location_label || device.geo_city || '').toLowerCase().trim();

  // 1. Direct coordinate format: "21.0285, 105.8542"
  const latLngMatch = loc.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
  if (latLngMatch) {
    return {
      lat: parseFloat(latLngMatch[1]),
      lng: parseFloat(latLngMatch[2]),
      cityName: device.location_label || 'Tọa độ GPS'
    };
  }

  // 2. Vietnam Region Geocoding Directory
  if (loc.includes('hà đông') || loc.includes('ha dong')) {
    return { lat: 20.9716, lng: 105.7766, cityName: 'Hà Đông, Hà Nội' };
  }
  if (loc.includes('thanh xuân') || loc.includes('thanh xuan')) {
    return { lat: 20.9984, lng: 105.8016, cityName: 'Thanh Xuân, Hà Nội' };
  }
  if (loc.includes('cầu giấy') || loc.includes('cau giay')) {
    return { lat: 21.0362, lng: 105.7906, cityName: 'Cầu Giấy, Hà Nội' };
  }
  if (loc.includes('đống đa') || loc.includes('dong da') || loc.includes('chùa bộc')) {
    return { lat: 21.0125, lng: 105.8285, cityName: 'Đống Đa, Hà Nội' };
  }
  if (loc.includes('hà nội') || loc.includes('ha noi')) {
    return { lat: 21.0285, lng: 105.8542, cityName: 'Hà Nội' };
  }
  if (loc.includes('quận 7') || loc.includes('quan 7')) {
    return { lat: 10.7340, lng: 106.7218, cityName: 'Quận 7, TP.HCM' };
  }
  if (loc.includes('bình thạnh') || loc.includes('binh thanh') || loc.includes('landmark 81')) {
    return { lat: 10.7950, lng: 106.7219, cityName: 'Bình Thạnh, TP.HCM' };
  }
  if (loc.includes('quận 1') || loc.includes('quan 1')) {
    return { lat: 10.7769, lng: 106.7009, cityName: 'Quận 1, TP.HCM' };
  }
  if (loc.includes('hồ chí minh') || loc.includes('tp.hcm') || loc.includes('tphcm') || loc.includes('sài gòn')) {
    return { lat: 10.8231, lng: 106.6297, cityName: 'TP. Hồ Chí Minh' };
  }
  if (loc.includes('hải châu') || loc.includes('hai chau') || loc.includes('đà nẵng') || loc.includes('da nang')) {
    return { lat: 16.0544, lng: 108.2208, cityName: 'Hải Châu, Đà Nẵng' };
  }
  if (loc.includes('hải phòng') || loc.includes('hai phong')) {
    return { lat: 20.8449, lng: 106.6881, cityName: 'Hải Phòng' };
  }
  if (loc.includes('cần thơ') || loc.includes('can tho')) {
    return { lat: 10.0452, lng: 105.7469, cityName: 'Cần Thơ' };
  }
  if (loc.includes('nha trang') || loc.includes('khánh hòa')) {
    return { lat: 12.2388, lng: 109.1967, cityName: 'Nha Trang' };
  }

  // Fallback hash dispersion within Vietnam
  let hash = 0;
  for (let i = 0; i < (device.serial_number || 'BOX').length; i++) {
    hash = (hash << 5) - hash + (device.serial_number || 'BOX').charCodeAt(i);
    hash |= 0;
  }
  const offsetLat = ((Math.abs(hash) % 100) - 50) * 0.005;
  const offsetLng = ((Math.abs(hash >> 3) % 100) - 50) * 0.005;

  return {
    lat: 21.0285 + offsetLat,
    lng: 105.8542 + offsetLng,
    cityName: device.location_label || 'Việt Nam'
  };
}

interface RealDeviceMapProps {
  devices: ExtendedDevice[];
  selectedDevice: ExtendedDevice | null;
  highlightedId: string | null;
  onSelectDevice: (device: ExtendedDevice) => void;
  onRunPingTest: (device: ExtendedDevice) => void;
}

export const RealDeviceMap: React.FC<RealDeviceMapProps> = ({
  devices,
  selectedDevice,
  highlightedId,
  onSelectDevice,
  onRunPingTest
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapTheme, setMapTheme] = useState<'dark' | 'streets'>('dark');
  const [activeRegion, setActiveRegion] = useState<string>('all');

  // 1. Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Vietnam Default View Center
    const map = L.map(mapContainerRef.current, {
      center: [16.047079, 108.206230], // Center of Vietnam
      zoom: 6,
      zoomControl: false,
      attributionControl: false
    });

    // Dark Matter Tiles (High performance & modern aesthetic)
    const tileUrl = mapTheme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    const tileLayer = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;

    // Add minimal custom attribution
    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://openstreetmap.org" target="_blank" style="color: #64748b">OpenStreetMap</a> • IoT GIS')
      .addTo(map);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // 2. Handle Map Theme Switch
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    tileLayerRef.current.remove();

    const tileUrl = mapTheme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

    tileLayerRef.current = L.tileLayer(tileUrl, {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(mapInstanceRef.current);
  }, [mapTheme]);

  // 3. Render Real Markers for All Devices
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const bounds = L.latLngBounds([]);

    devices.forEach((dev) => {
      const coord = resolveDeviceCoordinates(dev);
      bounds.extend([coord.lat, coord.lng]);

      const isOnline = dev.status === 'online';
      const isError = dev.status === 'error';
      const isMaint = dev.status === 'maintenance';
      const dotColor = isOnline ? '#10b981' : isError ? '#f59e0b' : isMaint ? '#0ea5e9' : '#f43f5e';
      const isSelected = highlightedId === dev.id;

      // Custom HTML Marker with glowing pulse radar
      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            ${isOnline ? `<div style="position: absolute; width: 32px; height: 32px; border-radius: 50%; background: ${dotColor}22; border: 1.5px solid ${dotColor}; animation: pulse-ring 2s infinite ease-out;"></div>` : ''}
            <div style="
              width: ${isSelected ? '16px' : '12px'};
              height: ${isSelected ? '16px' : '12px'};
              border-radius: 50%;
              background: ${dotColor};
              box-shadow: 0 0 14px ${dotColor}, 0 0 4px #ffffff;
              border: 2px solid #ffffff;
              transition: all 0.25s ease;
              z-index: 10;
            "></div>
            <div style="
              position: absolute;
              bottom: -18px;
              left: 50%;
              transform: translateX(-50%);
              background: rgba(10, 15, 29, 0.9);
              border: 1px solid ${isSelected ? dotColor : 'rgba(255, 255, 255, 0.15)'};
              padding: 1px 6px;
              border-radius: 4px;
              font-family: var(--font-mono, monospace);
              font-size: 10px;
              font-weight: 700;
              color: ${isSelected ? '#ffffff' : '#cbd5e1'};
              white-space: nowrap;
              box-shadow: 0 4px 12px rgba(0,0,0,0.5);
              pointer-events: none;
              letter-spacing: 0.3px;
            ">
              ${dev.serial_number}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });

      const marker = L.marker([coord.lat, coord.lng], { icon: customIcon }).addTo(map);

      // Popup Content Template
      const popupHtml = `
        <div style="font-family: var(--font-main, sans-serif); color: #f8fafc; padding: 4px 2px; min-width: 250px;">
          <div style="display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; margin-bottom: 8px;">
            <div>
              <span style="font-family: var(--font-mono, monospace); font-weight: 700; color: #38bdf8; font-size: 12px;">${dev.serial_number}</span>
              <div style="font-weight: 700; font-size: 13px; color: #ffffff; margin-top: 2px;">${dev.name}</div>
            </div>
            <span style="
              font-size: 10px;
              font-weight: 700;
              padding: 2px 8px;
              border-radius: 9999px;
              background: ${dotColor}22;
              color: ${dotColor};
              border: 1px solid ${dotColor}44;
              text-transform: uppercase;
            ">
              ${isOnline ? 'Online' : isError ? 'Tín hiệu yếu' : isMaint ? 'Bảo trì' : 'Mất kết nối'}
            </span>
          </div>

          <div style="font-size: 12px; color: #94a3b8; margin-bottom: 6px;">
            <strong>${coord.cityName}</strong> <span style="font-size: 10px; color: #64748b;">(${coord.lat.toFixed(4)}, ${coord.lng.toFixed(4)})</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: rgba(0,0,0,0.3); padding: 8px; border-radius: 6px; font-size: 11px; margin-bottom: 10px;">
            <div>IP: <strong style="color: #38bdf8; font-family: monospace;">${dev.public_ip}</strong></div>
            <div>Ping: <strong style="color: #10b981;">${dev.ping_ms || 24}ms</strong></div>
            <div>Wi-Fi: <strong>${dev.wifi_rssi || -60} dBm</strong></div>
            <div>Pin: <strong style="color: ${(dev.battery_level || 100) > 20 ? '#10b981' : '#f43f5e'}">${dev.battery_level || 95}%</strong></div>
          </div>

          <div style="display: flex;">
            <button id="btn-ping-${dev.id}" style="
              width: 100%;
              padding: 7px 12px;
              background: #2563eb;
              color: #ffffff;
              border: none;
              border-radius: 6px;
              font-size: 11px;
              font-weight: 700;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 6px;
              transition: background 0.15s ease;
            ">Ping Kiểm Tra Mạng Realtime</button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, {
        className: 'custom-leaflet-popup',
        closeButton: false,
        maxWidth: 300
      });

      marker.on('click', () => {
        onSelectDevice(dev);
      });

      marker.on('popupopen', () => {
        // Wire up popup action buttons
        const pingBtn = document.getElementById(`btn-ping-${dev.id}`);
        if (pingBtn) {
          pingBtn.onclick = () => onRunPingTest(dev);
        }
      });

      markersRef.current.set(dev.id, marker);
    });

    // Auto fit bounds on initial load if we have points
    if (bounds.isValid() && devices.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 13 });
    }
  }, [devices, highlightedId]);

  // 4. Reactively Fly to Selected / Highlighted Device
  useEffect(() => {
    if (!highlightedId || !mapInstanceRef.current) return;
    const targetDev = devices.find(d => d.id === highlightedId);
    if (targetDev) {
      const coord = resolveDeviceCoordinates(targetDev);
      mapInstanceRef.current.flyTo([coord.lat, coord.lng], 14, {
        animate: true,
        duration: 1.2
      });
      const marker = markersRef.current.get(highlightedId);
      if (marker) {
        setTimeout(() => marker.openPopup(), 400);
      }
    }
  }, [highlightedId, devices]);

  // Quick Region Zoom Handlers
  const handleJumpTo = (region: string) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    setActiveRegion(region);

    if (region === 'all') {
      const bounds = L.latLngBounds([]);
      devices.forEach(d => {
        const c = resolveDeviceCoordinates(d);
        bounds.extend([c.lat, c.lng]);
      });
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      } else {
        map.flyTo([16.047079, 108.206230], 6);
      }
    } else if (region === 'hanoi') {
      map.flyTo([21.0285, 105.8542], 12, { duration: 1.0 });
    } else if (region === 'danang') {
      map.flyTo([16.0544, 108.2208], 13, { duration: 1.0 });
    } else if (region === 'hcm') {
      map.flyTo([10.7769, 106.7009], 12, { duration: 1.0 });
    }
  };

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const errorCount = devices.filter(d => d.status === 'error').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;
  const maintCount = devices.filter(d => d.status === 'maintenance').length;

  return (
    <div id="iot-geoip-map" className="card" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} color="var(--accent-primary)" />
            Bản Đồ Địa Lý & Giám Sát Trạm Nút IoT (Realtime OpenStreetMap)
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Hệ thống định vị GIS thời gian thực dựa trên trạm phát IP & tọa độ thiết bị SmartBox thực tế.
          </p>
        </div>

        {/* Legend & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Quick Region Jumps */}
          <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-surface)', padding: '3px', borderRadius: 'var(--radius-md)' }}>
            {[
              { id: 'all', label: 'Toàn Quốc' },
              { id: 'hanoi', label: 'Hà Nội' },
              { id: 'danang', label: 'Đà Nẵng' },
              { id: 'hcm', label: 'TP.HCM' },
            ].map(r => (
              <button
                key={r.id}
                onClick={() => handleJumpTo(r.id)}
                style={{
                  padding: '4px 10px',
                  fontSize: '0.72rem',
                  fontWeight: activeRegion === r.id ? 700 : 500,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: 'pointer',
                  background: activeRegion === r.id ? 'var(--accent-primary)' : 'transparent',
                  color: activeRegion === r.id ? '#ffffff' : 'var(--text-secondary)',
                  transition: 'all 0.15s ease'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Theme switcher */}
          <button
            onClick={() => setMapTheme(mapTheme === 'dark' ? 'streets' : 'dark')}
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Đổi giao diện bản đồ Sáng / Tối"
          >
            <Layers size={14} />
            <span>{mapTheme === 'dark' ? 'Bản đồ Tối (GIS)' : 'Bản đồ Sáng (OSM)'}</span>
          </button>
        </div>
      </div>

      {/* Real Map Container */}
      <div style={{ position: 'relative', width: '100%', height: '420px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
        {/* Leaflet Mount Node */}
        <div ref={mapContainerRef} style={{ width: '100%', height: '100%', zIndex: 1 }} />

        {/* Floating Top-Left Status Beacon Overlay */}
        <div style={{
          position: 'absolute',
          top: '12px',
          left: '12px',
          zIndex: 10,
          background: 'rgba(14, 21, 38, 0.88)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--border-glass)',
          borderRadius: '8px',
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          fontSize: '0.75rem',
          boxShadow: 'var(--shadow-card)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            <span>Online: <strong>{onlineCount}</strong></span>
          </div>
          {maintCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#0ea5e9', boxShadow: '0 0 8px #0ea5e9' }} />
              <span>Bảo trì: <strong>{maintCount}</strong></span>
            </div>
          )}
          {errorCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 8px #f59e0b' }} />
              <span>Sự cố: <strong>{errorCount}</strong></span>
            </div>
          )}
          {offlineCount > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', boxShadow: '0 0 8px #f43f5e' }} />
              <span>Mất kết nối: <strong>{offlineCount}</strong></span>
            </div>
          )}
        </div>

        {/* Floating Map Zoom Controls (Bottom-Right) */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          <button
            onClick={() => mapInstanceRef.current?.zoomIn()}
            className="btn btn-secondary"
            style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}
            title="Phóng to"
          >
            +
          </button>
          <button
            onClick={() => mapInstanceRef.current?.zoomOut()}
            className="btn btn-secondary"
            style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '16px' }}
            title="Thu nhỏ"
          >
            -
          </button>
          <button
            onClick={() => handleJumpTo('all')}
            className="btn btn-secondary"
            style={{ width: '34px', height: '34px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Vừa vặn toàn bộ trạm"
          >
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
