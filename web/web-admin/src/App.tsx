import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminLayout, WorkspaceGroup, PageSkeleton } from './components/AdminLayout';
import { UserRole, getRoleDefaultPath } from './types/database';

// Auth Pages
import { Login } from './pages/auth/Login';
import { Forbidden403 } from './pages/auth/Forbidden403';

// Catalog Pages
const Products = lazy(() => import('./pages/catalog/Products').then(m => ({ default: m.Products })));
const ProductDetail = lazy(() => import('./pages/catalog/ProductDetail').then(m => ({ default: m.ProductDetail })));
const VariantSpecificationsPage = lazy(() => import('./pages/catalog/VariantSpecifications').then(m => ({ default: m.VariantSpecificationsPage })));
const CategoriesPage = lazy(() => import('./pages/catalog/Categories').then(m => ({ default: m.Categories })));
const CouponsPage = lazy(() => import('./pages/coupons/Coupons').then(m => ({ default: m.CouponsPage })));

// Order & Delivery Pages
const Orders = lazy(() => import('./pages/orders/Orders').then(m => ({ default: m.Orders })));
const OrderDetail = lazy(() => import('./pages/orders/OrderDetail').then(m => ({ default: m.OrderDetail })));
const ApprovalTickets = lazy(() => import('./pages/orders/ApprovalTickets').then(m => ({ default: m.ApprovalTickets })));
const TicketDetail = lazy(() => import('./pages/orders/TicketDetail').then(m => ({ default: m.TicketDetail })));
const DeliveryInstallations = lazy(() => import('./pages/orders/DeliveryInstallations').then(m => ({ default: m.DeliveryInstallations })));
const OrderProcessingHistory = lazy(() => import('./pages/orders/OrderProcessingHistory').then(m => ({ default: m.OrderProcessingHistory })));
const TechnicianDailyTasks = lazy(() => import('./pages/technician/TechnicianDailyTasks').then(m => ({ default: m.TechnicianDailyTasks })));

// Warranty Pages
const Warranties = lazy(() => import('./pages/warranties/Warranties').then(m => ({ default: m.Warranties })));
const WarrantyLookupPage = lazy(() => import('./pages/warranties/WarrantyLookup').then(m => ({ default: m.WarrantyLookupPage })));

// Customer & Staff Pages
const CustomersPage = lazy(() => import('./pages/customers/Customers').then(m => ({ default: m.CustomersPage })));
const AccountManagement = lazy(() => import('./pages/staff/AccountManagement').then(m => ({ default: m.AccountManagement })));

// System & Operation Pages
const Dashboard = lazy(() => import('./pages/system/Dashboard').then(m => ({ default: m.Dashboard })));
const ReportsPage = lazy(() => import('./pages/system/Reports').then(m => ({ default: m.ReportsPage })));
const PoReports = lazy(() => import('./pages/reports/PoReports').then(m => ({ default: m.PoReports })));
const EmailHistoryPage = lazy(() => import('./pages/system/EmailHistory').then(m => ({ default: m.EmailHistoryPage })));
const AuditLogsPage = lazy(() => import('./pages/system/AuditLogs').then(m => ({ default: m.AuditLogsPage })));
const SettingsPage = lazy(() => import('./pages/system/Settings').then(m => ({ default: m.SettingsPage })));

const RoleDefaultRedirect: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleDefaultPath(profile.role)} replace />;
};

const RoleProductDetailRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  const prefix = profile.role === 'product_manager' ? '/po' : profile.role === 'technician' ? '/technician' : '/admin';
  return <Navigate to={`${prefix}/products/${id}`} replace />;
};

const RoleOrderDetailRedirect: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  const prefix = profile.role === 'product_manager' ? '/po' : profile.role === 'technician' ? '/technician' : '/admin';
  return <Navigate to={`${prefix}/orders/${id}`} replace />;
};

const RoleWarrantyRedirect: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  const prefix = profile.role === 'product_manager' ? '/po' : profile.role === 'technician' ? '/technician' : '/admin';
  return <Navigate to={`${prefix}/warranties`} replace />;
};

const RoleCategoryRedirect: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  if (!profile) return <Navigate to="/login" replace />;
  const prefix = profile.role === 'product_manager' ? '/po' : '/admin';
  return <Navigate to={`${prefix}/categories`} replace />;
};

const protect = (roles: UserRole[], node: React.ReactNode) => (
  <ProtectedRoute allowedRoles={roles}>{node}</ProtectedRoute>
);

const Alias: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={to + location.search + location.hash} replace />;
};

export const App: React.FC = () => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Suspense fallback={<PageSkeleton />}>
            <Routes>
              {/* Public & Auth Routes */}
              <Route path="/" element={<RoleDefaultRedirect />} />
              <Route path="/login" element={<Suspense fallback={<div className="workspace-loading" role="status">Đang tải…</div>}><Login /></Suspense>} />
              <Route path="/403" element={<Forbidden403 />} />

              {/* ============================================================== */}
              {/* 1. SUPER ADMIN WORKSPACE (/admin/*)                            */}
              {/* ============================================================== */}
              <Route element={protect(['super_admin'], <AdminLayout />)}>
                <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="/admin/dashboard" element={<Dashboard />} />

                <Route path="/admin/products" element={<WorkspaceGroup group="admin-products" />}>
                  <Route index element={<Products />} />
                  <Route path=":id" element={<ProductDetail />} />
                  <Route path="specifications" element={<VariantSpecificationsPage />} />
                  <Route path="categories" element={<Navigate to="/admin/categories" replace />} />
                </Route>

                <Route path="/admin/categories" element={<CategoriesPage />} />
                <Route path="/admin/coupons" element={<CouponsPage />} />

                <Route path="/admin/orders" element={<WorkspaceGroup group="admin-orders" />}>
                  <Route index element={<Orders />} />
                  <Route path=":id" element={<OrderDetail />} />
                  <Route path="approvals" element={<ApprovalTickets />} />
                  <Route path="approvals/:id" element={<TicketDetail />} />
                  <Route path="delivery" element={<DeliveryInstallations />} />
                  <Route path="delivery/:jobId" element={<DeliveryInstallations />} />
                  <Route path="history" element={<OrderProcessingHistory />} />
                </Route>

                <Route path="/admin/warranties" element={<WorkspaceGroup group="admin-warranties" />}>
                  <Route index element={<Warranties />} />
                  <Route path="lookup" element={<WarrantyLookupPage />} />
                  <Route path="devices" element={<Navigate to="/admin/warranties/lookup" replace />} />
                </Route>

                <Route path="/admin/customers" element={<CustomersPage />} />
                <Route path="/admin/users" element={<AccountManagement permissions />} />
                <Route path="/admin/permissions" element={<Alias to="/admin/users" />} />

                <Route path="/admin/emails" element={<EmailHistoryPage />} />
                <Route path="/admin/reports" element={<ReportsPage />} />

                <Route path="/admin/system" element={<WorkspaceGroup group="admin-system" />}>
                  <Route index element={<SettingsPage />} />
                  <Route path="audit" element={<AuditLogsPage />} />
                </Route>
              </Route>

              {/* ============================================================== */}
              {/* 2. PRODUCT MANAGER / PO WORKSPACE (/po/*)                      */}
              {/* ============================================================== */}
              <Route element={protect(['product_manager'], <AdminLayout />)}>
                <Route path="/po" element={<Navigate to="/po/dashboard" replace />} />
                <Route path="/po/dashboard" element={<Dashboard />} />

                <Route path="/po/products" element={<WorkspaceGroup group="po-products" />}>
                  <Route index element={<Products />} />
                  <Route path=":id" element={<ProductDetail />} />
                  <Route path="specifications" element={<VariantSpecificationsPage />} />
                  <Route path="categories" element={<Navigate to="/po/categories" replace />} />
                </Route>

                <Route path="/po/categories" element={<CategoriesPage />} />

                <Route path="/po/approvals" element={<ApprovalTickets />} />
                <Route path="/po/approvals/:id" element={<TicketDetail />} />
                <Route path="/po/orders" element={<ApprovalTickets />} />
                <Route path="/po/orders/:id" element={<TicketDetail />} />
                <Route path="/po/delivery" element={<DeliveryInstallations />} />
                <Route path="/po/delivery/:jobId" element={<DeliveryInstallations />} />
                <Route path="/po/warranties" element={<WorkspaceGroup group="po-warranties" />}>
                  <Route index element={<Warranties />} />
                  <Route path="lookup" element={<WarrantyLookupPage />} />
                  <Route path="claims" element={<Navigate to="/po/warranties" replace />} />
                </Route>
                <Route path="/po/coupons" element={<CouponsPage />} />
                <Route path="/po/reports" element={<PoReports />} />
              </Route>

              {/* ============================================================== */}
              {/* 3. TECHNICIAN WORKSPACE (/technician/*)                        */}
              {/* ============================================================== */}
              <Route element={protect(['technician'], <AdminLayout />)}>
                <Route path="/technician" element={<Navigate to="/technician/tasks" replace />} />
                <Route path="/technician/tasks" element={<TechnicianDailyTasks />} />
                <Route path="/technician/dashboard" element={<Dashboard />} />
                <Route path="/technician/delivery" element={<DeliveryInstallations />} />
                <Route path="/technician/delivery/:jobId" element={<DeliveryInstallations />} />
                <Route path="/technician/warranties" element={<Warranties />} />
                <Route path="/technician/lookup" element={<WarrantyLookupPage />} />
              </Route>

              {/* ============================================================== */}
              {/* 4. BACKWARD COMPATIBILITY ALIASES & GLOBAL REDIRECTS           */}
              {/* ============================================================== */}
              <Route path="/dashboard" element={<RoleDefaultRedirect />} />
              <Route path="/products" element={<RoleDefaultRedirect />} />
              <Route path="/products/:id" element={<RoleProductDetailRedirect />} />
              <Route path="/products/specifications" element={<RoleDefaultRedirect />} />
              <Route path="/categories" element={<RoleCategoryRedirect />} />
              <Route path="/products/categories" element={<RoleCategoryRedirect />} />
              <Route path="/orders" element={<RoleDefaultRedirect />} />
              <Route path="/orders/:id" element={<RoleOrderDetailRedirect />} />
              <Route path="/orders/approvals" element={<RoleDefaultRedirect />} />
              <Route path="/orders/delivery" element={<RoleDefaultRedirect />} />
              <Route path="/orders/history" element={<RoleDefaultRedirect />} />
              <Route path="/coupons" element={<RoleDefaultRedirect />} />
              <Route path="/warranties" element={<RoleWarrantyRedirect />} />
              <Route path="/warranties/*" element={<RoleWarrantyRedirect />} />
              <Route path="/warranty" element={<RoleWarrantyRedirect />} />
              <Route path="/customers" element={<Navigate to="/admin/customers" replace />} />
              <Route path="/users" element={<Navigate to="/admin/users" replace />} />
              <Route path="/permissions" element={<Navigate to="/admin/users" replace />} />
              <Route path="/emails" element={<Navigate to="/admin/emails" replace />} />
              <Route path="/reports" element={<Navigate to="/admin/reports" replace />} />
              <Route path="/system" element={<Navigate to="/admin/system" replace />} />
              <Route path="/system/*" element={<Navigate to="/admin/system" replace />} />
              <Route path="/settings" element={<Navigate to="/admin/system" replace />} />
              <Route path="/approval-tickets" element={<RoleDefaultRedirect />} />
              <Route path="/delivery-installations" element={<RoleDefaultRedirect />} />
              <Route path="/guide" element={<RoleDefaultRedirect />} />
              <Route path="/showcase" element={<RoleDefaultRedirect />} />
              <Route path="/warranty" element={<RoleDefaultRedirect />} />

              <Route path="*" element={<RoleDefaultRedirect />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);

export default App;
