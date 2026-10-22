import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Smartphone, Radio, CircuitBoard, BadgeCheck, ArrowRight, LockKeyhole, Scale, Activity } from 'lucide-react';
const steps = [
  { Icon: Smartphone, title: 'Gửi yêu cầu', subtitle: 'Giao diện điều khiển', heading: 'Bắt đầu từ thao tác của bạn.', body: 'Yêu cầu khóa hoặc mở khóa được gửi kèm mã theo dõi. Mã này giúp liên kết thao tác với phản hồi tương ứng của thiết bị.', status: 'Yêu cầu đã được gửi', detail: 'Chưa xác nhận khóa đã chuyển trạng thái.' },
  { Icon: Radio, title: 'Truyền lệnh', subtitle: 'Kết nối MQTT', heading: 'Chuyển yêu cầu đến thiết bị.', body: 'MQTT chuyển lệnh từ hệ thống đến bộ điều khiển của hộp nhận hàng. Khả năng tiếp nhận phụ thuộc trạng thái kết nối của thiết bị.', status: 'Đang chuyển lệnh', detail: 'Mất kết nối có thể khiến yêu cầu hết thời gian.' },
  { Icon: CircuitBoard, title: 'Xử lý tại hộp', subtitle: 'Bộ điều khiển ESP32', heading: 'Thiết bị tiếp nhận và xử lý.', body: 'ESP32 tiếp nhận lệnh và điều khiển khóa điện tử theo cấu hình phần cứng. Phản hồi ACK cho biết tiến trình xử lý lệnh.', status: 'Nhận phản hồi thiết bị', detail: 'ACK cần được đối chiếu với dữ liệu cửa và khóa.' },
  { Icon: BadgeCheck, title: 'Đối chiếu kết quả', subtitle: 'Phản hồi & trạng thái', heading: 'Kiểm tra trạng thái thực tế.', body: 'Hệ thống đối chiếu phản hồi với dữ liệu trạng thái mới từ thiết bị. Khi chưa đủ thông tin, kết quả cần tiếp tục được kiểm tra.', status: 'Đối chiếu trạng thái mới', detail: 'Không suy ra khóa đã mở chỉ từ thao tác trên giao diện.' },
];
export function TechnologyPage() {
  const [active, setActive] = useState(0);
  const step = steps[active];
  const Icon = step.Icon;
  return <section className="container section tech-page">
    <nav className="tech-breadcrumb" aria-label="Đường dẫn"><Link to="/">Trang chủ</Link><span aria-hidden="true">/</span><span>Công nghệ</span></nav>
    <header className="tech-intro"><div><p className="eyebrow">BÊN TRONG ANCHORBOX</p><h1>Kết nối rõ ràng.<br/><span>Kiểm soát an tâm.</span></h1></div><p>Từ yêu cầu trên giao diện đến phản hồi tại thiết bị. Tìm hiểu cách các thành phần phối hợp để theo dõi hoạt động của hộp nhận hàng.</p></header>
    <div className="tech-flow">
      <div className="tech-flow-heading"><div><span className="tech-label">NGUYÊN LÝ HOẠT ĐỘNG</span><h2>Một yêu cầu, bốn bước xử lý.</h2></div><span className="tech-demo-label">Sơ đồ minh họa</span></div>
      <div className="tech-steps" role="group" aria-label="Khám phá các bước xử lý">{steps.map(({Icon: StepIcon,title,subtitle}, index) => <button key={title} type="button" aria-pressed={active === index} aria-controls="tech-step-detail" onClick={() => setActive(index)}><div className="tech-step-top"><span>0{index + 1}</span><StepIcon size={25} strokeWidth={1.6}/></div><strong>{title}</strong><small>{subtitle}</small><ArrowRight className="tech-step-arrow" size={17}/></button>)}</div>
      <div className="tech-detail" id="tech-step-detail" aria-live="polite" aria-atomic="true"><div className="tech-detail-copy"><span className="tech-label">BƯỚC 0{active + 1} / 04</span><h3>{step.heading}</h3><p>{step.body}</p></div><div className="tech-state"><Icon size={28} strokeWidth={1.5}/><span>TRẠNG THÁI MINH HỌA</span><strong>{step.status}</strong><p>{step.detail}</p></div></div>
      <p className="tech-footnote"><Activity size={16}/>Sơ đồ giải thích nguyên lý; không gửi lệnh hoặc hiển thị dữ liệu thiết bị trực tiếp.</p>
    </div>
    <div className="tech-components"><div><p className="eyebrow">THÀNH PHẦN THIẾT BỊ</p><h2>Hiểu rõ cấu hình bạn chọn.</h2><p>Khả năng và thông số phần cứng được công bố theo từng phiên bản sản phẩm.</p><Link className="text-link" to="/compare">So sánh cấu hình <ArrowRight size={16}/></Link></div><article><LockKeyhole size={25}/><h3>Khóa điện tử</h3><p>Nhận điều khiển từ ESP32. Trạng thái khóa và cửa cần được kiểm tra qua phản hồi thiết bị.</p></article><article><Scale size={25}/><h3>Cảm biến trọng lượng</h3><p>Loadcell / HX711 hỗ trợ theo dõi tải trọng khi cấu hình có trang bị cảm biến.</p></article></div>
    <div className="tech-shop-link"><div><h2>Chọn AnchorBox phù hợp với bạn.</h2><p>Xem giá, tồn kho và thông số của các cấu hình đang bán.</p></div><Link className="button" to="/products">Khám phá sản phẩm <ArrowRight size={18}/></Link></div>
  </section>;
}
