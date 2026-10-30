import { useState, useRef, useEffect } from 'react';
import {
  RotateCcw,
  Camera,
  Lock,
  Scale,
  Sun,
  ShieldCheck,
  X,
  Play,
  Pause
} from 'lucide-react';
import '../apple-home.css';

export interface Hotspot {
  id: string;
  top: string;
  left: string;
  title: string;
  chip: string;
  icon: typeof Camera;
  color: string;
  scene?: 'front' | 'lock';
  desc: string;
  specs: string;
}

const ANCHORBOX_HOTSPOTS: Hotspot[] = [
  {
    id: 'solar-roof',
    top: '14%',
    left: '50%',
    title: 'Mái Solar & Quạt đối lưu vi khí hậu',
    chip: 'NĂNG LƯỢNG & ĐỐI LƯU',
    icon: Sun,
    color: '#ff9f0a',
    scene: 'front',
    desc: 'Tấm pin Monocrystalline tự sạc năng lượng dưới ánh sáng tự nhiên, duy trì vận hành 45 ngày liên tục không cần cắm điện.',
    specs: 'Công suất 15W · Cảm biến nhiệt độ & độ ẩm tự động kích hoạt quạt đối lưu'
  },
  {
    id: 'camera-ai',
    top: '28%',
    left: '70%',
    title: 'Camera AI 1080p góc siêu rộng 155°',
    chip: 'THỊ GIÁC MÁY TÍNH AI',
    icon: Camera,
    color: '#2997ff',
    scene: 'front',
    desc: 'Nhận diện khuôn mặt bưu tá và tự động quét mã vạch bưu kiện từ khoảng cách 2 mét. Bật đèn hồng ngoại Night Vision khi trời tối.',
    specs: 'Độ phân giải Full HD 1080p · Góc rộng 155° HDR · Cảm biến tiệm cận PIR'
  },
  {
    id: 'solenoid-lock',
    top: '47%',
    left: '80%',
    title: 'Khóa điện tử bảo mật chuẩn ngân hàng',
    chip: 'BẢO MẬT AES-256',
    icon: Lock,
    color: '#30d158',
    scene: 'lock',
    desc: 'Ngàm solenoid hợp kim thép chịu lực kéo va đập 250kg, vi điều khiển mã hóa AES-256. Luôn đi kèm chìa cơ vật lý chống sao chép.',
    specs: 'Lực giữ 250kg · Mã OTP 1 lần · Chìa cơ khẩn cấp · Còi hú báo động 90dB'
  },
  {
    id: 'uvc-sanitizer',
    top: '60%',
    left: '24%',
    title: 'Hệ thống khử khuẩn UV-C tự động',
    chip: 'VỆ SINH AN TOÀN',
    icon: ShieldCheck,
    color: '#bf5af2',
    scene: 'front',
    desc: 'Tự động kích hoạt chu trình chiếu tia cực tím khử trùng 3 phút sau khi nắp khoang đóng lại, tiêu diệt 99.9% vi khuẩn và nấm mốc.',
    specs: 'Bước sóng 254nm · Tiêu diệt 99.9% vi khuẩn · Tự ngắt an toàn khi mở nắp'
  },
  {
    id: 'weight-scale',
    top: '80%',
    left: '50%',
    title: 'Cảm biến trọng lượng đa điểm chống tráo',
    chip: 'LOAD-CELL CHÍNH XÁC ±5G',
    icon: Scale,
    color: '#2997ff',
    scene: 'front',
    desc: '4 điểm cảm biến lực dưới sàn khoang bắt trọn từng gram bưu kiện, tự động đối chiếu khối lượng đơn hàng và gửi ảnh báo cáo về điện thoại.',
    specs: 'Độ nhạy ±5g · Giới hạn tải trọng 50kg · Cảnh báo bưu kiện rỗng tức thì'
  }
];

export interface AppleProductViewerProps {
  scene?: 'front' | 'lock';
  model?: 'base' | 'pro' | 'solar';
  capacity?: number;
  showHotspots?: boolean;
  className?: string;
  onHotspotClick?: (hotspot: Hotspot) => void;
}

export function AppleProductViewer({
  scene = 'front',
  model = 'base',
  capacity = 75,
  showHotspots = true,
  className = '',
  onHotspotClick
}: AppleProductViewerProps) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [activeHotspot, setActiveHotspot] = useState<Hotspot | null>(null);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [activeView, setActiveView] = useState<'front' | 'rear' | 'side' | 'top'>('front');

  // Send updates to iframe 3D canvas
  const postViewerMessage = (payload: any) => {
    try {
      frameRef.current?.contentWindow?.postMessage(payload, window.location.origin);
    } catch {
      // Ignored if cross-origin or unavailable
    }
  };

  useEffect(() => {
    postViewerMessage({
      type: 'SMARTBOX_VIEW',
      scene,
      model: model === 'pro' || model === 'solar' ? 'pro' : 'base',
      capacity
    });
  }, [scene, model, capacity]);

  // Handle preset view buttons
  const handleViewChange = (view: 'front' | 'rear' | 'side' | 'top') => {
    setActiveView(view);
    setActiveHotspot(null);
    postViewerMessage({
      type: 'SMARTBOX_VIEW',
      scene: view === 'rear' ? 'front' : 'front',
      model: model === 'pro' || model === 'solar' ? 'pro' : 'base',
      capacity
    });
  };

  const toggleAutoRotate = () => {
    setIsAutoRotating(prev => !prev);
    // Trigger auto-rotate button inside iframe if accessible
    try {
      const doc = frameRef.current?.contentDocument;
      const btn = doc?.getElementById('auto-rotate');
      if (btn) btn.click();
    } catch {
      // Handled gracefully
    }
  };

  const handleReset = () => {
    setActiveView('front');
    setActiveHotspot(null);
    setIsAutoRotating(false);
    postViewerMessage({ type: 'SMARTBOX_VIEW', scene: 'front', model, capacity });
    try {
      const doc = frameRef.current?.contentDocument;
      const btn = doc?.getElementById('reset-view');
      if (btn) btn.click();
    } catch {
      // Handled gracefully
    }
  };

  const selectHotspot = (hs: Hotspot) => {
    setActiveHotspot(prev => (prev?.id === hs.id ? null : hs));
    if (hs.scene) {
      postViewerMessage({
        type: 'SMARTBOX_VIEW',
        scene: hs.scene,
        model: model === 'pro' || model === 'solar' ? 'pro' : 'base',
        capacity
      });
    }
    if (onHotspotClick) onHotspotClick(hs);
  };

  return (
    <div className={`apple-viewer-card-wrapper ${className}`}>
      
      {/* 3D Showcase Stage with Luxury Frosted Pedestal */}
      <div className="apple-3d-pedestal-stage" role="region" aria-label="Sân khấu xoay 360 độ AnchorBox">
        
        {/* Luxury Apple Frosted Glass Pedestal & Floor Reflection */}
        <div className="apple-pedestal-reflection" />
        <div className="apple-pedestal-ellipse" />
        <div className="apple-pedestal-rim-glow" />

        {/* 3D WebGL Canvas iframe */}
        <iframe
          ref={frameRef}
          src="/viewer/index.html"
          className="apple-viewer-iframe"
          title="AnchorBox 3D Interactive Model"
        />

        {/* Interactive Sensor Hotspots */}
        {showHotspots && (
          <div className="apple-hotspots-container" aria-label="Các điểm cảm biến AnchorBox">
            {ANCHORBOX_HOTSPOTS.map(hs => {
              const IconComp = hs.icon;
              const isSelected = activeHotspot?.id === hs.id;
              return (
                <div
                  key={hs.id}
                  className={`apple-hotspot-pin ${isSelected ? 'is-active' : ''}`}
                  style={{ top: hs.top, left: hs.left }}
                  onClick={() => selectHotspot(hs)}
                  title={`Xem thông tin: ${hs.title}`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && selectHotspot(hs)}
                >
                  <span className="apple-hotspot-pulse" style={{ borderColor: hs.color }} />
                  <div className="apple-hotspot-dot" style={{ background: hs.color }}>
                    <IconComp size={12} color="#ffffff" />
                  </div>

                  {/* Hotspot Label Pill */}
                  <span className="apple-hotspot-label-pill">
                    {hs.title.split(' ')[0]} {hs.title.split(' ')[1]}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Hotspot Detail Popover Card (Glassmorphism) */}
        {activeHotspot && (
          <div className="apple-hotspot-popover" role="dialog" aria-modal="false">
            <div className="apple-hotspot-popover-header">
              <span className="apple-hotspot-chip" style={{ color: activeHotspot.color, borderColor: activeHotspot.color }}>
                {activeHotspot.chip}
              </span>
              <button
                type="button"
                className="apple-popover-close-btn"
                onClick={() => setActiveHotspot(null)}
                aria-label="Đóng bảng thông tin"
              >
                <X size={15} />
              </button>
            </div>

            <h4 className="apple-hotspot-popover-title">{activeHotspot.title}</h4>
            <p className="apple-hotspot-popover-desc">{activeHotspot.desc}</p>

            <div className="apple-hotspot-popover-specs">
              <strong>Thông số kỹ thuật:</strong>
              <span>{activeHotspot.specs}</span>
            </div>
          </div>
        )}

        {/* Interaction Hint Badge */}
        <div className="apple-viewer-hint-badge">
          <span>Kéo để xoay 360° · Bấm điểm chạm để khám phá cảm biến</span>
        </div>

      </div>

      {/* Preset View Angles Bar & Interactive Controls */}
      <div className="apple-viewer-controls-bar">
        
        <div className="apple-viewer-view-pills" role="group" aria-label="Góc nhìn 3D">
          <button
            type="button"
            className={`apple-view-pill ${activeView === 'front' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('front')}
          >
            Mặt trước
          </button>
          <button
            type="button"
            className={`apple-view-pill ${activeView === 'side' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('side')}
          >
            Góc bên
          </button>
          <button
            type="button"
            className={`apple-view-pill ${activeView === 'rear' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('rear')}
          >
            Mặt sau
          </button>
          <button
            type="button"
            className={`apple-view-pill ${activeView === 'top' ? 'is-active' : ''}`}
            onClick={() => handleViewChange('top')}
          >
            Góc trên
          </button>
        </div>

        <div className="apple-viewer-action-pills">
          <button
            type="button"
            className={`apple-action-pill ${isAutoRotating ? 'is-active' : ''}`}
            onClick={toggleAutoRotate}
            title={isAutoRotating ? 'Dừng tự xoay' : 'Bật tự xoay 360 độ'}
          >
            {isAutoRotating ? <Pause size={14} /> : <Play size={14} />}
            <span>{isAutoRotating ? 'Dừng xoay' : 'Tự xoay 360°'}</span>
          </button>

          <button
            type="button"
            className="apple-action-pill"
            onClick={handleReset}
            title="Đặt lại góc nhìn ban đầu"
          >
            <RotateCcw size={14} />
            <span>Đặt lại</span>
          </button>
        </div>

      </div>

    </div>
  );
}

export default AppleProductViewer;
