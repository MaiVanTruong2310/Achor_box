import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Search, ShoppingBag, UserRound, Menu, X, SlidersHorizontal, Truck, Phone, LogOut } from 'lucide-react';
import { useShop } from '../ShopContext';
import { shop } from '../api/shop';
import { useResource } from './ShopUi';
import { NotificationCenter } from './NotificationCenter';
import { consultationPhone } from '../contact';

export function StoreHeader() {
  const { user, lines, logout } = useShop();
  const location = useLocation();
  const navigate = useNavigate();
  const categories = useResource(shop.categories, 'catalog-categories');
  const [menu, setMenu] = useState(false);
  const [departments, setDepartments] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [logoutError, setLogoutError] = useState('');
  const headerRoot = useRef<HTMLElement>(null);
  const departmentRoot = useRef<HTMLDivElement>(null);
  const departmentButton = useRef<HTMLButtonElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const element = headerRoot.current;
    if (!element) return;
    const property = '--store-header-height';
    const previous = document.documentElement.style.getPropertyValue(property);
    const update = () => document.documentElement.style.setProperty(property, `${Math.ceil(element.getBoundingClientRect().height)}px`);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => {
      observer.disconnect();
      if (previous) document.documentElement.style.setProperty(property, previous);
      else document.documentElement.style.removeProperty(property);
    };
  }, []);
  useEffect(() => {
    setMenu(false); setDepartments(false);
    const params = new URLSearchParams(location.search);
    setQuery(params.get('q') || ''); setCategory(params.get('category') || '');
  }, [location.key, location.search]);
  useEffect(() => {
    const outside = (event: PointerEvent) => { if (!departmentRoot.current?.contains(event.target as Node)) setDepartments(false); };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (departments) { setDepartments(false); departmentButton.current?.focus(); }
      else if (menu) { setMenu(false); menuButton.current?.focus(); }
    };
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape); };
  }, [departments, menu]);
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query.trim()) params.set('q', query.trim());
    if (category) params.set('category', category);
    navigate(`/products${params.size ? `?${params}` : ''}`);
  }
  const count = lines.reduce((total, line) => total + line.quantity, 0);
  return <>
    <header className="commerce-header" ref={headerRoot}>
      <div className="container commerce-header-main">
        <Link className="brand" to="/" aria-label="AnchorBox trang chủ"><span className="brand-icon">A</span>anchorbox<span className="brand-dot">.</span></Link>
        <form className="commerce-search" role="search" aria-label="Tìm kiếm sản phẩm" onSubmit={search}>
          <label className="commerce-search-category"><span className="sr-only">Danh mục tìm kiếm</span><select value={category} onChange={event => setCategory(event.target.value)}><option value="">Tất cả</option>{categories.data?.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label className="commerce-search-query"><span className="sr-only">Từ khóa sản phẩm</span><input type="search" placeholder="Bạn đang tìm sản phẩm nào?" value={query} onChange={event => setQuery(event.target.value)} maxLength={150}/></label>
          <button type="submit" aria-label="Tìm kiếm"><Search size={19}/><span>Tìm kiếm</span></button>
        </form>
        <div className="commerce-header-actions">
          <Link className="commerce-icon-action commerce-compare" to="/compare" aria-label="So sánh sản phẩm"><SlidersHorizontal size={24}/><span>So sánh</span></Link>
          {user && <NotificationCenter key={user.userId}/>}
          <Link className="commerce-icon-action commerce-cart" to="/cart" aria-label={`Giỏ hàng (${count})`}><span className="commerce-bag"><ShoppingBag size={27}/><small>{count}</small></span><span>Giỏ hàng</span></Link>
          <div className="commerce-account"><UserRound size={28}/><div><Link to={user ? '/account' : '/login'} title={user ? user.fullName || user.email : undefined}>{user ? user.fullName || user.email : 'Đăng nhập'}</Link>{user ? <button onClick={() => { void logout().catch(() => setLogoutError('Đã xóa phiên trên thiết bị này. Chưa xác nhận thu hồi phiên tại máy chủ.')); }}><LogOut size={12}/>Đăng xuất</button> : <Link to="/register">Đăng ký</Link>}</div></div>
        </div>
      </div>
      <div className="commerce-header-bottom"><div className="container commerce-header-navrow">
        <div className="commerce-departments" ref={departmentRoot}>
          <button ref={departmentButton} type="button" aria-expanded={departments} aria-controls="department-list" onClick={() => { setDepartments(value => !value); setMenu(false); }}><Menu size={21}/><span>Danh mục sản phẩm</span><ChevronDown size={15}/></button>
          {departments && <div id="department-list" className="commerce-department-list"><Link to="/products">Tất cả sản phẩm</Link>{categories.data?.map(item => <Link key={item.id} to={`/products?category=${encodeURIComponent(item.id)}`}>{item.name}</Link>)}{categories.loading && <p role="status">Đang tải danh mục…</p>}{categories.error && <div><p>Chưa tải được danh mục.</p><button type="button" onClick={categories.retry}>Thử lại</button></div>}{!categories.loading && !categories.error && !categories.data?.length && <p>Danh mục đang được cập nhật.</p>}</div>}
        </div>
        <button ref={menuButton} id="menu-toggle" className="commerce-menu-toggle" type="button" aria-expanded={menu} aria-controls="main-nav" onClick={() => { setMenu(value => !value); setDepartments(false); }}>{menu ? <X size={19}/> : <Menu size={19}/>}Menu</button>
        <nav id="main-nav" className={`commerce-main-nav${menu ? ' open' : ''}`} aria-label="Điều hướng chính">
          <NavLink to="/" end>Trang chủ</NavLink><NavLink to="/products">Sản phẩm</NavLink><NavLink to="/technology">Công nghệ</NavLink><NavLink to="/app">Ứng dụng App</NavLink><NavLink to="/how-it-works">Giao & lắp đặt</NavLink>
        </nav>
        <div className="commerce-header-support"><Link to="/account/orders"><Truck size={16}/>Tra cứu đơn hàng</Link><a href={consultationPhone.href}><Phone size={15}/>{consultationPhone.display}</a></div>
      </div></div>
    </header>
    {logoutError && <p className="notice" role="status">{logoutError}</p>}
  </>;
}
