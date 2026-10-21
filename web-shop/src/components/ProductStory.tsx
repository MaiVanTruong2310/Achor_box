import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Box, Check, CircuitBoard, LockKeyhole, Radio, Scale, Smartphone, Wifi } from 'lucide-react';

export function BoxIllustration({ pro = false }: { pro?: boolean }) {
  const id = useId().replace(/:/g, '');
  return <svg viewBox="0 0 380 330" className="box-illustration" role="img" aria-label={`Hình minh họa thiết kế AnchorBox ${pro ? 'Pro' : 'Base'}, không phải ảnh sản phẩm`}>
    <defs><linearGradient id={`${id}-front`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f4f7fc"/><stop offset=".45" stopColor="#cdd7e5"/><stop offset="1" stopColor="#91a4bc"/></linearGradient><linearGradient id={`${id}-side`}><stop stopColor="#7489a4"/><stop offset="1" stopColor="#506881"/></linearGradient><linearGradient id={`${id}-top`}><stop stopColor="#f2f7ff"/><stop offset="1" stopColor="#b4c5da"/></linearGradient><radialGradient id={`${id}-shadow`}><stop stopColor="#173f75" stopOpacity=".22"/><stop offset="1" stopColor="#173f75" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="190" cy="295" rx="135" ry="23" fill={`url(#${id}-shadow)`}/>
    <path d="M104 65 244 45 286 70 146 92Z" fill={`url(#${id}-top)`}/><path d="M244 45 286 70 286 273 244 288Z" fill={`url(#${id}-side)`}/><path d="M104 65 244 45 244 288 104 305Z" fill={`url(#${id}-front)`}/>
    <path d="M116 87 229 72 229 274 116 288Z" fill="none" stroke="#f7faff" strokeWidth="2"/><path d="M116 87 229 72" stroke="#7187a2"/>
    <path d="M128 116 213 105 213 119 128 130Z" fill="#2d435a"/><path d="M128 116 213 105" stroke="#69829f" strokeWidth="3"/>
    <path d="M204 157 222 154 222 210 204 213Z" fill="#1b324c"/><path d="M208 169 217 168" stroke="#64d9ff" strokeWidth="3"/>
    <path d="M212 188 217 187 217 202 212 203Z" fill="#7f9abc"/>
    <path d="M110 69 244 49" stroke="white" strokeOpacity=".8" strokeWidth="2"/>
    <text x="128" y="247" fill="#526b88" fontSize="10" fontFamily="system-ui" transform="rotate(-7 128 247)">anchorbox.</text>
    {pro && <path d="M135 267 182 261" stroke="#48cceb" strokeWidth="4"/>}
  </svg>;
}
export function EditionStory() {
  return <div className="edition-grid">{[false, true].map(pro => <article className={`edition-card ${pro ? 'edition-pro' : ''}`} key={String(pro)}><div className="edition-head"><span className="edition-number">{pro ? '02 / PRO' : '01 / BASE'}</span><span className="edition-label">{pro ? 'Thêm cảm biến trọng lượng' : 'Trải nghiệm thiết yếu'}</span></div><BoxIllustration pro={pro}/><div className="edition-copy"><h3>AnchorBox {pro ? 'Pro' : 'Base'}<ArrowUpRight size={24}/></h3><p>{pro ? 'Thêm một góc nhìn về bưu kiện, với loadcell / HX711 theo thiết kế.' : 'Khóa điện tử và kết nối IoT. Tập trung vào trải nghiệm nhận hàng.'}</p><ul><li><Check size={15}/>Khóa điện tử</li><li><Check size={15}/>Theo dõi trạng thái</li><li>{pro ? <Scale size={15}/> : <Wifi size={15}/>} {pro ? 'Trọng lượng theo cảm biến' : 'Kết nối IoT'}</li></ul></div></article>)}<p className="edition-caption">Hình minh họa thiết kế. Khả năng phần cứng của SKU thực tế cần được xác minh.</p></div>;
}
const steps = [
  { icon: Smartphone, title: 'Web / ứng dụng', label: 'Gửi yêu cầu', detail: 'Bạn chọn khóa hoặc mở khóa trên giao diện. Hệ thống tạo một lệnh kèm mã để theo dõi phản hồi.' },
  { icon: Radio, title: 'MQTT', label: 'Chuyển lệnh', detail: 'MQTT chuyển lệnh đến thiết bị. Việc gửi thành công chưa xác nhận khóa đã đóng hoặc mở.' },
  { icon: CircuitBoard, title: 'ESP32', label: 'Xử lý tại thiết bị', detail: 'ESP32 tiếp nhận lệnh và điều khiển khóa theo cấu hình phần cứng của thiết bị.' },
  { icon: Check, title: 'Phản hồi thiết bị', label: 'Kiểm tra kết quả', detail: 'Giao diện nhận ACK và dữ liệu cửa / khóa. Cần đối chiếu cả hai để biết trạng thái thực tế.' },
];
export function TechnologyStory() {
  const [step, setStep] = useState(0);
  return <div className="control-flow">
    <ol className="control-pipeline" aria-label="Luồng điều khiển AnchorBox">
      {steps.map(({icon: Icon, title, label}, index) => <li key={title}><button aria-pressed={step === index} onClick={() => setStep(index)}><span className="pipeline-top"><span>0{index + 1}</span><Icon size={24} strokeWidth={1.5}/></span><strong>{title}</strong><small>{label}</small></button></li>)}
    </ol>
    <div className="flow-explanation"><p key={step} className="transition-copy">{steps[step].detail}</p><Link to="/technology">Xem chi tiết kỹ thuật <ArrowUpRight size={16}/></Link></div>
    <p className="flow-caption">Sơ đồ nguyên lý. Kết quả hoạt động cần được kiểm tra trên thiết bị thực tế.</p>
  </div>;
}
export function HeroDetails() { return <div className="hero-details"><span><LockKeyhole size={18}/>Khóa điện tử</span><span><Wifi size={18}/>Kết nối IoT</span><span><Box size={18}/>Base / Pro</span></div>; }
