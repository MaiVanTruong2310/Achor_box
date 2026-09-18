import React, { useState, useEffect } from 'react';
import { Phone, MessageCircle, X, ChevronRight, Clock, ShieldCheck, CheckCircle2 } from 'lucide-react';

export const FloatingContactWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [showTooltip, setShowTooltip] = useState<boolean>(true);
  const [callbackPhone, setCallbackPhone] = useState<string>('');
  const [callbackSent, setCallbackSent] = useState<boolean>(false);

  // Auto-hide tooltip after 8 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTooltip(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

  const handleToggle = () => {
    setIsOpen((prev) => !prev);
    setShowTooltip(false);
  };

  const handleCallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!callbackPhone.trim() || callbackPhone.length < 9) return;
    setCallbackSent(true);
    setTimeout(() => {
      setCallbackSent(false);
      setCallbackPhone('');
      setIsOpen(false);
    }, 3500);
  };

  return (
    <div className="floating-contact-container">
      {/* Tooltip bubble when closed */}
      {!isOpen && showTooltip && (
        <div className="floating-tooltip" onClick={handleToggle}>
          <div className="floating-tooltip-text">
            👋 <strong>Cần tư vấn chọn mẫu Anchor Box?</strong>
            <span style={{ display: 'block', fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              Chat Zalo hoặc gọi Hotline kỹ thuật
            </span>
          </div>
          <button
            type="button"
            className="floating-tooltip-close"
            onClick={(e) => {
              e.stopPropagation();
              setShowTooltip(false);
            }}
            aria-label="Đóng gợi ý"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Expanded Popup Menu */}
      {isOpen && (
        <div className="floating-popup" role="dialog" aria-label="Kênh hỗ trợ & tư vấn">
          {/* Header */}
          <div className="floating-popup-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="floating-popup-avatar">
                <ShieldCheck size={20} color="#ffffff" />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                  Tư vấn Anchor Box 24/7
                </h4>
                <p style={{ margin: 0, fontSize: '11.5px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }}></span>
                  Kỹ thuật viên đang online
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="floating-close-btn"
              aria-label="Đóng"
            >
              <X size={18} />
            </button>
          </div>

          {/* Action List */}
          <div className="floating-popup-body">
            {/* Zalo Option */}
            <a
              href="https://zalo.me/0367744634"
              target="_blank"
              rel="noopener noreferrer"
              className="contact-channel-item channel-zalo"
            >
              <div className="channel-icon-wrap zalo-bg">
                <MessageCircle size={22} color="#ffffff" />
              </div>
              <div className="channel-info">
                <span className="channel-title">Chat Zalo: 0367 744 634</span>
                <span className="channel-subtitle">Gửi ảnh vị trí lắp để được khảo sát & tư vấn miễn phí</span>
              </div>
              <ChevronRight size={18} className="channel-arrow" />
            </a>

            {/* Hotline Option */}
            <a href="tel:0367744634" className="contact-channel-item channel-hotline">
              <div className="channel-icon-wrap hotline-bg">
                <Phone size={22} color="#ffffff" />
              </div>
              <div className="channel-info">
                <span className="channel-title">Hotline: 0367 744 634</span>
                <span className="channel-subtitle">Tư vấn bán hàng & Hỗ trợ kỹ thuật (8:00 - 21:00)</span>
              </div>
              <ChevronRight size={18} className="channel-arrow" />
            </a>

            {/* Quick Call-back Request */}
            <div className="callback-form-wrap">
              {callbackSent ? (
                <div className="callback-success">
                  <CheckCircle2 size={20} color="#10b981" />
                  <div>
                    <strong style={{ fontSize: '13px', color: '#0f172a' }}>Đã ghi nhận yêu cầu!</strong>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#475569' }}>
                      Chuyên viên kỹ thuật sẽ gọi lại trong 5 - 15 phút.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleCallbackSubmit}>
                  <label className="callback-label" htmlFor="callback-input">
                    <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                    Yêu cầu gọi lại tư vấn khảo sát:
                  </label>
                  <div className="callback-input-row">
                    <input
                      id="callback-input"
                      type="tel"
                      placeholder="Nhập số điện thoại của bạn..."
                      value={callbackPhone}
                      onChange={(e) => setCallbackPhone(e.target.value)}
                      className="callback-input"
                      required
                    />
                    <button type="submit" className="callback-btn">
                      Gửi
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Footer note */}
          <div className="floating-popup-footer">
            <span>🛡️ Cam kết bảo mật thông tin & Hỗ trợ tận tâm</span>
          </div>
        </div>
      )}

      {/* Main Floating Trigger Button */}
      <button
        type="button"
        className={`floating-main-btn ${isOpen ? 'active' : ''}`}
        onClick={handleToggle}
        aria-label="Mở kênh liên hệ tư vấn"
      >
        <span className="floating-pulse-ring"></span>
        <span className="floating-pulse-ring-delay"></span>
        <div className="floating-btn-inner">
          {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
        </div>
      </button>
    </div>
  );
};
