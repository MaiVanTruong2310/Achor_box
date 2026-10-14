import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { HomePage } from './pages/HomePage';
import { ProductsPage } from './pages/ProductsPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import {VnpayReturnPage} from './pages/VnpayReturnPage';
import { OrderSuccessPage } from './pages/OrderSuccessPage';
import { WarrantyPage } from './pages/WarrantyPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { AboutPage } from './pages/AboutPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { AccountLayout } from './pages/account/AccountLayout';
import { ProfilePage } from './pages/account/ProfilePage';
import { PaymentModeProvider, PaymentModeNotice } from './context/PaymentModeContext';
import { AddressesPage } from './pages/account/AddressesPage';
import { PasswordPage } from './pages/PasswordPage';
import { OrdersPage } from './pages/account/OrdersPage';
import { OrderDetailPage } from './pages/account/OrderDetailPage';
import { MyWarrantiesPage } from './pages/account/MyWarrantiesPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { FloatingContactWidget } from './components/common/FloatingContactWidget';
import { useCart } from './context/CartContext';
import { CheckCircle2 } from 'lucide-react';

const ToastNotification: React.FC = () => {
  const { toastMessage, clearToast } = useCart();
  if (!toastMessage) return null;

  return (
    <div className="toast-floating" onClick={clearToast} role="alert">
      <CheckCircle2 size={18} style={{ color: '#10b981' }} />
      <span>{toastMessage}</span>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <PaymentModeProvider><div className="page-wrapper">
      <Header />
      <PaymentModeNotice />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/:id" element={<ProductDetailPage />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/payments/vnpay/return" element={<VnpayReturnPage />} />
          <Route path="/order-success/:id" element={<OrderSuccessPage />} />
          <Route path="/warranty" element={<WarrantyPage />} />
          <Route path="/how-it-works" element={<HowItWorksPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<PasswordPage mode="forgot" />} />
          <Route path="/reset-password" element={<PasswordPage mode="reset" />} />
          
          {/* Account Portal nested routes */}
          <Route path="/account" element={<AccountLayout />}>
            <Route index element={<ProfilePage />} />
            <Route path="addresses" element={<AddressesPage />} />
            <Route path="password" element={<PasswordPage mode="change" />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="warranties" element={<MyWarrantiesPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <Footer />
      <ToastNotification />
      <FloatingContactWidget />
    </div></PaymentModeProvider>
  );
};

export default App;
