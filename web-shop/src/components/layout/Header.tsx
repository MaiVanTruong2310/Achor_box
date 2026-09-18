import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { ShoppingCart, User as UserIcon, Menu, X, ShieldCheck, Box, HelpCircle, Info } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';

export const Header: React.FC = () => {
  const { itemCount } = useCart();
  const { user, isAuthenticated } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleAuthClick = () => {
    if (isAuthenticated) {
      navigate('/account');
    } else {
      navigate('/login');
    }
  };

  return (
    <header className="header-wrapper">
      <div className="container header-container">
        {/* Brand */}
        <Link to="/" className="brand-logo" onClick={() => setMobileMenuOpen(false)}>
          <img src="/smartbox-icon.svg" alt="Anchor Box Logo" className="brand-icon" />
          <span>Anchor Box</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={`nav-menu ${mobileMenuOpen ? 'mobile-open' : ''}`}>
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            Trang chủ
          </NavLink>
          <NavLink
            to="/products"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Box size={15} /> Sản phẩm
            </span>
          </NavLink>
          <NavLink
            to="/how-it-works"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <HelpCircle size={15} /> Cách hoạt động
            </span>
          </NavLink>
          <NavLink
            to="/warranty"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={15} /> Bảo hành
            </span>
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
            onClick={() => setMobileMenuOpen(false)}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Info size={15} /> Giới thiệu
            </span>
          </NavLink>
        </nav>

        {/* Header Right Actions */}
        <div className="header-actions">
          {/* Cart Button */}
          <Link to="/cart" className="header-btn" title="Giỏ hàng">
            <ShoppingCart size={17} />
            <span style={{ display: 'none' }}>Giỏ hàng</span>
            {itemCount > 0 && <span className="cart-badge">{itemCount}</span>}
          </Link>

          {/* Account Button */}
          <button
            onClick={handleAuthClick}
            className="header-btn"
            title={isAuthenticated ? `Tài khoản (${user?.fullName})` : 'Đăng nhập / Đăng ký'}
          >
            <UserIcon size={17} />
            <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isAuthenticated ? (user?.fullName?.split(' ').pop() || 'Tài khoản') : 'Tài khoản'}
            </span>
          </button>

          {/* Mobile Menu Toggle Button */}
          <button
            className="header-btn"
            style={{ display: 'inline-flex' }}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle Navigation"
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>
    </header>
  );
};
