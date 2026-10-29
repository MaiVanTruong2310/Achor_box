import { HeroBannerSlider } from '../components/HeroBannerSlider';
import { Link } from 'react-router-dom';
import { ArrowUpRight, PackageCheck, SlidersHorizontal, Truck, ShieldCheck } from 'lucide-react';
import { useCatalog } from '../CatalogContext';
import { money } from '../api/shop';
import { BoxIllustration } from '../components/ProductStory';
import { ProductViewer } from '../components/MarketingMotion';
import { Catalog, Faq, Journey } from './ShopPublic';
import { AppEcosystem } from '../components/AppEcosystem';

export function StoreHome() {
  const catalog = useCatalog();
  const featured = catalog.data?.find(p => p.variants?.some(v => v.isActive && v.stockQuantity > 0));
  const prices = featured?.variants?.filter(v => v.isActive && v.finalPrice != null).map(v => v.finalPrice!) || [];
  return <div className="store-home">
    <HeroBannerSlider fallback={<section className="store-hero container">
      <div className="store-hero-copy">
        <p className="store-kicker"><span/> ANCHORBOX / SMART DELIVERY</p>
        <h1>Nhận hàng gọn gàng.<br/><em>An tâm mỗi ngày.</em></h1>
        <p>Hộp nhận hàng thông minh cho không gian sống của bạn. Khám phá sản phẩm, chọn cấu hình và theo dõi đơn hàng tại một nơi.</p>
        <div className="store-hero-actions"><a className="button" href="#choose">Khám phá sản phẩm <ArrowUpRight size={18}/></a><Link to="/compare">So sánh cấu hình →</Link></div>
        <div className="store-hero-note"><PackageCheck size={18}/><span>Chọn sản phẩm · Xét duyệt · Giao & lắp đặt</span></div>
      </div>
      <div className="store-hero-visual">
        <div className="store-visual-top"><span>THIẾT KẾ ANCHORBOX</span><span>01 / COLLECTION</span></div>
        <BoxIllustration/>
        <div className="store-visual-bottom"><div><small>KHÁM PHÁ DÒNG SẢN PHẨM</small><strong>{featured?.name || 'AnchorBox'}</strong><span>{prices.length ? 'Từ ' + money(Math.min(...prices)) : 'Chọn cấu hình phù hợp với bạn'}</span></div><Link aria-label="Xem sản phẩm AnchorBox" to={featured ? '/products/' + featured.id : '/products'}><ArrowUpRight size={26}/></Link></div>
        <p className="store-illustration-note">Hình minh họa thiết kế, không phải ảnh sản phẩm.</p>
      </div>
    </section>}/>
    <div className="container store-service-strip">
      {[{Icon:SlidersHorizontal,title:'Cấu hình rõ ràng',detail:'Giá và thông số theo phiên bản'},{Icon:Truck,title:'Theo dõi giao & lắp',detail:'Cập nhật trong đơn hàng của bạn'},{Icon:ShieldCheck,title:'Tra cứu bảo hành',detail:'Thông tin theo thiết bị đã nghiệm thu'}].map(({Icon,title,detail}) => <div key={title}><Icon size={25} strokeWidth={1.5}/><div><strong>{title}</strong><span>{detail}</span></div></div>)}
    </div>
    <section className="container section store-catalog" id="choose"><div className="store-section-head"><div><p className="eyebrow">BỘ SƯU TẬP ANCHORBOX</p><h2>Tìm chiếc hộp của bạn.</h2><p>Cấu hình phù hợp. Thông tin rõ ràng. Lựa chọn dễ dàng.</p></div><Link className="text-link" to="/products">Xem tất cả sản phẩm <ArrowUpRight size={18}/></Link></div><Catalog embedded/></section>
    <section className="store-discovery" id="technology"><div className="container store-discovery-inner"><div><p className="eyebrow">NHÌN GẦN HƠN</p><h2>Mỗi góc nhìn.<br/>Thêm một chi tiết.</h2><p>Khám phá thiết kế hộp nhận hàng qua mô hình xoay tương tác. Thông số mua hàng được công bố riêng trên từng phiên bản.</p><Link className="button secondary" to="/technology">Khám phá công nghệ <ArrowUpRight size={18}/></Link></div><ProductViewer/></div></section>
    <AppEcosystem />
    <section className="container section" id="how"><div className="store-section-head"><div><p className="eyebrow">MUA HÀNG CÙNG ANCHORBOX</p><h2>Từ lựa chọn đến sử dụng.</h2></div><Link className="text-link" to="/account/orders">Theo dõi đơn hàng →</Link></div><Journey/></section>
    <section className="container section store-help" id="faq"><div><p className="eyebrow">TRƯỚC KHI BẠN CHỌN</p><h2>Một vài điều<br/>bạn muốn biết.</h2><Link className="text-link" to="/contact">Trung tâm hỗ trợ →</Link></div><div><Faq embedded/></div></section>
  </div>;
}
