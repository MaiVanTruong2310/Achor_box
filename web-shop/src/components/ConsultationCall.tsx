import { useEffect, useId, useRef, useState } from 'react';
import { Phone, X } from 'lucide-react';
import { consultationPhone } from '../contact';

export function ConsultationCall() {
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const phoneLink = useRef<HTMLAnchorElement>(null);
  const panelId = useId();
  const headingId = useId();

  useEffect(() => {
    if (!open) return;
    phoneLink.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  function close() {
    setOpen(false);
    trigger.current?.focus();
  }

  return <div className="floating-contact" ref={container}>
    {open && <div className="floating-phone-panel" id={panelId} role="dialog" aria-labelledby={headingId}>
      <div className="floating-phone-heading">
        <h2 id={headingId}>Tư vấn AnchorBox</h2>
        <button type="button" className="floating-phone-close" aria-label="Đóng thông tin số điện thoại" onClick={close}><X size={18} aria-hidden="true"/></button>
      </div>
      <p>Liên hệ tư vấn sản phẩm và hỗ trợ mua hàng.</p>
      <a className="floating-phone-number" ref={phoneLink} href={consultationPhone.href}>{consultationPhone.display}</a>
      <a className="button floating-phone-call" href={consultationPhone.href}><Phone size={17} aria-hidden="true"/>Gọi ngay</a>
    </div>}
    <button
      ref={trigger}
      type="button"
      className="floating-consultation"
      aria-label="Xem số điện thoại tư vấn"
      aria-expanded={open}
      aria-controls={open ? panelId : undefined}
      aria-haspopup="dialog"
      onClick={() => setOpen(value => !value)}
    >
      <span className="floating-consultation-icon" aria-hidden="true"><Phone size={25} strokeWidth={2.5}/></span>
      <span className="floating-consultation-label">Gọi tư vấn</span>
    </button>
    <a
      className="floating-consultation floating-zalo"
      href={consultationPhone.zaloHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat Zalo qua số ${consultationPhone.display}`}
      title={`Chat Zalo: ${consultationPhone.display}`}
      onClick={() => setOpen(false)}
    >
      <span className="floating-zalo-icon" aria-hidden="true"><img src={`${import.meta.env.BASE_URL}images/zalo-contact.png`} alt="" width={54} height={54}/></span>
      <span className="floating-consultation-label">Chat Zalo</span>
    </a>
  </div>;
}
