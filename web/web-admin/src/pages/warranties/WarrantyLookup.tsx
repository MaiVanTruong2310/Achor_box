import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminRequest } from '../../services/adminRequest';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  User,
  Phone,
  RefreshCw,
  ArrowLeft,
  Calendar,
  Box,
  Camera,
  X,
  Upload,
  Flashlight,
  Sparkles
} from 'lucide-react';

export const WarrantyLookupPage: React.FC = () => {
  const [serial, setSerial] = useState('');
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // QR / Barcode Scanner Modal State
  const [scannerOpen, setScannerOpen] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [cameraLoading, setCameraLoading] = useState(false);
  const [detectorSupported, setDetectorSupported] = useState(true);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const scanIntervalRef = React.useRef<any>(null);

  // Stop camera stream safely
  const stopCamera = React.useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Trigger search with given serial code
  const executeLookup = React.useCallback(async (rawSerial: string) => {
    let value = rawSerial.trim();
    try {
      const url = new URL(value);
      value = url.searchParams.get('serial') || url.pathname.split('/').pop() || value;
    } catch {
      /* Plain serial string */
    }

    if (!value) return;
    setSerial(value);
    setLoading(true);
    setData(null);
    setError('');

    try {
      const res = await adminRequest<any>(`/warranties/lookup?${new URLSearchParams({ serial: value })}`);
      setData(res);
    } catch (e: any) {
      setError(e.message || 'Không tìm thấy thông tin bảo hành.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle detected barcode/QR string
  const handleDetectedCode = React.useCallback((detectedVal: string) => {
    if (!detectedVal) return;
    try {
      if (navigator.vibrate) navigator.vibrate(80);
    } catch {
      // ignore
    }
    stopCamera();
    setScannerOpen(false);
    void executeLookup(detectedVal);
  }, [stopCamera, executeLookup]);

  // Open Scanner Modal and initialize Camera
  const handleOpenScanner = async () => {
    setScannerOpen(true);
    setCameraError('');
    setCameraLoading(true);

    const hasDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    setDetectorSupported(hasDetector);

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraLoading(false);

      // Start Barcode detection loop if supported
      if (hasDetector) {
        const formats = ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'];
        const detector = new (window as any).BarcodeDetector({ formats });

        scanIntervalRef.current = setInterval(async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) return;
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0) {
              const detected = barcodes[0].rawValue;
              if (detected) {
                handleDetectedCode(detected);
              }
            }
          } catch {
            // keep searching
          }
        }, 220);
      }
    } catch (err: any) {
      setCameraLoading(false);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Trình duyệt chưa được cấp quyền truy cập Camera. Vui lòng cho phép quyền Camera trong cài đặt trình duyệt.'
          : 'Không thể kết nối máy ảnh: ' + (err.message || 'Lỗi thiết bị')
      );
    }
  };

  // Close scanner and cleanup
  const handleCloseScanner = () => {
    stopCamera();
    setScannerOpen(false);
  };

  // Handle Photo Upload fallback for scanning
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      await img.decode();

      if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
        const formats = ['qr_code', 'code_128', 'code_39', 'ean_13', 'data_matrix'];
        const detector = new (window as any).BarcodeDetector({ formats });
        const barcodes = await detector.detect(img);
        if (barcodes && barcodes.length > 0) {
          handleDetectedCode(barcodes[0].rawValue);
          return;
        }
      }
      // If detector not available or not found in file
      setCameraError('Không tìm thấy mã Barcode hoặc QR trong ảnh vừa chọn. Vui lòng thử lại với ảnh rõ nét hơn.');
    } catch (err: any) {
      setCameraError('Lỗi đọc ảnh: ' + (err.message || 'Vui lòng thử lại'));
    }
  };

  React.useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setData(null);
    setError('');

    let value = serial.trim();
    try {
      const url = new URL(value);
      value = url.searchParams.get('serial') || value;
    } catch {
      /* Plain serial string */
    }

    try {
      const res = await adminRequest<any>(`/warranties/lookup?${new URLSearchParams({ serial: value })}`);
      setData(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. Header */}
      <div className="fpt-page-header">
        <div className="fpt-page-title">
          <div className="fpt-page-icon" style={{ background: 'var(--accent-primary)' }}>
            <QrCode size={22} />
          </div>
          <div>
            <h1>Tra cứu bảo hành thiết bị</h1>
            <p className="fpt-page-desc">
              Nhập mã số Serial trên tem nhãn hoặc dán toàn bộ đường dẫn quét từ mã QR gắn trên tủ Anchor Box.
            </p>
          </div>
        </div>

        <div>
          <Link to="/warranties" className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowLeft size={15} />
            <span>Danh sách yêu cầu</span>
          </Link>
        </div>
      </div>

      {/* 2. Lookup Box Card */}
      <div className="card" style={{ padding: '24px', borderRadius: '16px' }}>
        <form onSubmit={handleLookup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <label style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Mã Serial thiết bị hoặc Đường dẫn quét QR
          </label>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'stretch' }}>
            <div className="fpt-search-input" style={{ maxWidth: 'none', flex: '1 1 320px' }}>
              <Search size={18} className="fpt-search-icon" />
              <input
                required
                maxLength={1000}
                placeholder="Ví dụ: SB-PRO-2026-X8921 hoặc dán link quét QR..."
                value={serial}
                onChange={e => setSerial(e.target.value)}
                style={{ height: '44px', fontSize: '0.95rem' }}
              />
            </div>

            <button
              type="button"
              onClick={handleOpenScanner}
              style={{
                height: '44px',
                padding: '0 16px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '12px',
                border: '1.5px solid var(--apple-blue, var(--accent-primary))',
                color: 'var(--apple-blue, var(--accent-primary))',
                background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              title="Quét Barcode hoặc QR Code trên thiết bị bằng Camera"
            >
              <Camera size={18} />
              <span>Quét Barcode / QR</span>
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || !serial.trim()}
              style={{ height: '44px', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              {loading ? <RefreshCw size={16} className="spin" /> : <Search size={16} />}
              <span>{loading ? 'Đang tra cứu…' : 'Tra cứu ngay'}</span>
            </button>
          </div>
          <span style={{ fontSize: '0.775rem', color: 'var(--text-muted)' }}>
            Thông tin cá nhân của khách hàng sẽ được che bảo mật theo quy định bảo vệ dữ liệu.
          </span>
        </form>
      </div>

      {/* 3. Alerts */}
      {error && (
        <div className="card" style={{ padding: '14px 18px', background: 'var(--fpt-rose-soft)', borderColor: 'var(--fpt-rose)', color: 'var(--fpt-rose)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Camera QR & Barcode Scanner Modal */}
      {scannerOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0, 0, 0, 0.78)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={handleCloseScanner}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              background: '#1c1c1e',
              color: '#ffffff',
              borderRadius: '24px',
              overflow: 'hidden',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Camera size={20} style={{ color: 'var(--accent-primary)' }} />
                <span style={{ fontWeight: 700, fontSize: '15px' }}>Quét mã Barcode / QR tem thiết bị</span>
              </div>
              <button
                type="button"
                onClick={handleCloseScanner}
                style={{
                  background: 'rgba(255,255,255,0.12)',
                  border: 'none',
                  color: '#fff',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Video Viewport & Scanning Reticle */}
            <div style={{ position: 'relative', width: '100%', height: '340px', background: '#000', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                playsInline
                muted
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />

              {/* Scanning Reticle Box */}
              {!cameraError && !cameraLoading && (
                <div
                  style={{
                    position: 'absolute',
                    width: '240px',
                    height: '240px',
                    border: '2px solid color-mix(in srgb, var(--accent-primary) 80%, transparent)',
                    borderRadius: '20px',
                    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.45)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  {/* Laser line animation */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 10,
                      right: 10,
                      height: '2px',
                      background: 'var(--bg-surface)',
                      boxShadow: '0 0 10px #007aff',
                      animation: 'scanLaser 2s ease-in-out infinite'
                    }}
                  />
                  <style>{`
                    @keyframes scanLaser {
                      0% { top: 15%; opacity: 0.8; }
                      50% { top: 85%; opacity: 1; }
                      100% { top: 15%; opacity: 0.8; }
                    }
                  `}</style>
                </div>
              )}

              {/* Loading Indicator */}
              {cameraLoading && (
                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', color: '#fff' }}>
                  <RefreshCw size={28} className="spin" style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '13px' }}>Đang khởi động camera...</span>
                </div>
              )}

              {/* Camera Error Display */}
              {cameraError && (
                <div style={{ position: 'absolute', inset: '20px', background: 'color-mix(in srgb, var(--accent-rose) 15%, transparent)', border: '1px solid var(--accent-rose)', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '10px' }}>
                  <AlertCircle size={32} style={{ color: 'var(--accent-rose-text)' }} />
                  <p style={{ margin: 0, fontSize: '13px', color: '#fca5a5' }}>{cameraError}</p>
                </div>
              )}
            </div>

            {/* Modal Footer with Instructions & Alternative Upload */}
            <div style={{ padding: '16px 20px', background: '#242426', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', maxWidth: '300px' }}>
                Hướng camera vào tem mã vạch Barcode (Code-128) hoặc mã QR dán trên tủ Anchor Box.
              </div>

              {/* Fallback upload button */}
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Upload size={14} />
                <span>Tải ảnh tem</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 4. Results Display */}
      {data && (
        <div className="card" style={{ padding: '24px', borderRadius: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <span className={`fpt-badge ${data.isValid ? 'fpt-badge-success' : 'fpt-badge-danger'}`}>
                  {data.isValid ? <ShieldCheck size={14} /> : <ShieldAlert size={14} />}
                  <span>{data.statusLabel || data.status}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                  SERIAL: {data.serialNumber}
                </span>
              </div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {data.productName} · {data.variantName}
              </h2>
            </div>

            <div style={{ background: data.isValid ? 'var(--fpt-emerald-soft)' : 'var(--fpt-rose-soft)', padding: '10px 16px', borderRadius: '12px', textAlign: 'right' }}>
              <span style={{ fontSize: '0.75rem', color: data.isValid ? 'var(--fpt-emerald)' : 'var(--fpt-rose)', fontWeight: 700 }}>
                Thời hạn bảo hành
              </span>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, color: data.isValid ? 'var(--fpt-emerald)' : 'var(--fpt-rose)' }}>
                {data.isValid ? `Còn ${data.remainingDays} ngày` : 'Hết hạn bảo hành'}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {/* Cột 1: Thông số bảo hành */}
            <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--fpt-orange)', letterSpacing: '0.04em' }}>
                Thông tin thời hạn
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Ngày kích hoạt: <strong>{data.startDate || 'Chưa kích hoạt'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Clock size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Ngày hết hạn: <strong>{data.endDate || 'Chưa có'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Box size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Tình trạng: <strong style={{ color: data.isValid ? 'var(--fpt-emerald)' : 'var(--fpt-rose)' }}>{data.isValid ? 'Bảo hành chính hãng hợp lệ' : 'Đã hết hạn hoặc chưa kích hoạt'}</strong></span>
              </div>
            </div>

            {/* Cột 2: Thông tin chủ sở hữu */}
            <div style={{ background: 'var(--bg-surface)', padding: '18px', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '0.775rem', fontWeight: 700, color: 'var(--fpt-blue)', letterSpacing: '0.04em' }}>
                Chủ sở hữu & Vị trí
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <User size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Khách hàng: <strong>{data.ownerNameMasked || '—'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <Phone size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Số điện thoại: <strong>{data.ownerPhoneMasked || '—'}</strong></span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.875rem' }}>
                <MapPin size={16} style={{ color: 'var(--text-muted)' }} />
                <span>Vị trí lắp đặt: <strong>{data.locationLabel || '—'}</strong></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
