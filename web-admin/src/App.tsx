import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout } from './components/AdminLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Devices } from './pages/Devices';
import { Warranties } from './pages/Warranties';
import { Products } from './pages/Products';
import { Orders } from './pages/Orders';
import { UsersPage } from './pages/Users';
import { ContentPage } from './pages/Content';
import { AuditLogsPage } from './pages/AuditLogs';
import { SettingsPage } from './pages/Settings';
import { Forbidden403 } from './pages/Forbidden403';
import { useAuth } from './contexts/AuthContext';
import { getRoleDefaultPath } from './types/database';

const RoleDefaultRedirect: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDefaultPath(profile.role)} replace />;
};

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/403" element={<Forbidden403 />} />

            {/* Protected Admin Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<RoleDefaultRedirect />} />
              
              {/* Module 1: Dashboard (Super Admin Only) */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Module 2: Quản lý thiết bị IoT */}
              <Route
                path="devices"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'technician']}>
                    <Devices />
                  </ProtectedRoute>
                }
              />

              {/* Module 3: Quản lý bảo hành & Hỗ trợ kỹ thuật */}
              <Route
                path="warranties"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'technician', 'support_agent']}>
                    <Warranties />
                  </ProtectedRoute>
                }
              />

              {/* Module 4: Quản lý sản phẩm & tồn kho */}
              <Route
                path="products"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'product_manager']}>
                    <Products />
                  </ProtectedRoute>
                }
              />

              {/* Module 5: Quản lý đơn hàng */}
              <Route
                path="orders"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'product_manager', 'accountant', 'support_agent']}>
                    <Orders />
                  </ProtectedRoute>
                }
              />

              {/* Module 6: Quản lý người dùng */}
              <Route
                path="users"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'support_agent']}>
                    <UsersPage />
                  </ProtectedRoute>
                }
              />

              {/* Module 7: Quản lý nội dung / Marketing */}
              <Route
                path="content"
                element={
                  <ProtectedRoute allowedRoles={['super_admin', 'product_manager']}>
                    <ContentPage />
                  </ProtectedRoute>
                }
              />

              {/* Module 8: Nhật ký thao tác admin (Audit log) */}
              <Route
                path="audit-logs"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <AuditLogsPage />
                  </ProtectedRoute>
                }
              />

              {/* Module 9: Cấu hình hệ thống */}
              <Route
                path="settings"
                element={
                  <ProtectedRoute allowedRoles={['super_admin']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<RoleDefaultRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};
export default App;
