import { useEffect, useRef, useState, useMemo, type FormEvent, type ChangeEvent } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  Package,
  Users,
  Cpu,
  UserRound,
  MapPin,
  ShieldCheck,
  Search,
  ArrowUpDown,
  Filter,
  Eye,
  Camera,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  Trash2,
  Copy,
  Clock,
  Check,
  CreditCard,
  Printer,
  Phone,
  KeyRound,
  ChevronRight,
  Loader2,
  Truck,
  LayoutGrid,
  List,
  Wrench,
  AlertTriangle,
} from 'lucide-react';
import { BoxThumb } from '../components/BoxShowcase';
import { useShop } from '../ShopContext';
import { money, request } from '../api/shop';
import {
  customer,
  getUserAvatar,
  setUserAvatar,
  warrantyEligible,
  claimLabels,
  type WarrantyClaim,
  type Address,
  type AddressInput,
  type CustomerOrder,
  type Page,
} from '../api/customer';
import { displayDate, statusLabel } from '../components/commercePresentation';
import { ResourceState, useResource } from '../components/ShopUi';
import { ClaimSheet, usage, vietnamToday } from './CustomerWarranty';
import './account-home.css';

interface SharedMember {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  accessLevel: 'full_control' | 'view_only' | string;
  grantedAt: string | null;
}

interface Device {
  id: string;
  serialNumber: string;
  productName: string | null;
  variantName: string | null;
  orderId: string | null;
  warrantyId: string | null;
  startDate: string | null;
  endDate: string | null;
  warrantyStatus: string | null;
  acceptedAt: string | null;
  hasWeightSensor?: boolean;
  sharedMembers?: SharedMember[];
}

const emptyAddress: AddressInput = {
  label: 'Nhà riêng',
  recipientName: '',
  phone: '',
  addressLine: '',
  installationNote: '',
  isDefault: false,
};

interface AccountHomeProps {
  defaultTab?: 'overview' | 'orders' | 'devices' | 'profile' | 'addresses' | 'warranty';
}

const isBox = (sku?: string | null) => /^ANCHORBOX/i.test(sku ?? '') || /smartbox/i.test(sku ?? '');
const extractCapacity = (str?: string | null): number => {
  if (!str) return 45;
  const match = str.match(/(\d+)\s*L/i);
  return match ? parseInt(match[1], 10) : 45;
};

export function AccountHome({ defaultTab = 'profile' }: AccountHomeProps) {
  const { user } = useShop();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Active view resolved directly from URL route or query param fallback
  const getResolvedTab = (): 'overview' | 'orders' | 'devices' | 'profile' | 'addresses' | 'warranty' => {
    if (location.pathname.startsWith('/account/orders')) return 'orders';
    if (location.pathname.startsWith('/account/devices')) return 'devices';
    if (location.pathname.startsWith('/account/profile')) return 'profile';
    if (location.pathname.startsWith('/account/addresses')) return 'addresses';
    if (location.pathname.startsWith('/account/warranty')) return 'warranty';
    const tabFromUrl = searchParams.get('tab') as AccountHomeProps['defaultTab'] | null;
    if (tabFromUrl && ['overview', 'orders', 'devices', 'profile', 'addresses', 'warranty'].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return defaultTab || 'profile';
  };

  const activeTab = getResolvedTab();

  // Avatar state with reactive synchronization
  const [avatarUrl, setAvatarUrlState] = useState<string | null>(() => getUserAvatar(user?.userId));
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Core Resources
  const profileRes = useResource(signal => customer.profile(signal), user?.userId || '');
  const ordersRes = useResource(signal => customer.orders(0, signal), user?.userId || '');
  const devicesRes = useResource(
    async signal => {
      const res = await request<Page<Device>>('/customer/devices?page=0&size=50', { signal });
      return res.content;
    },
    user?.userId || ''
  );
  const addressesRes = useResource(signal => customer.addresses(signal), user?.userId || '');
  const warrantiesRes = useResource(signal => customer.warranties(0, signal), user?.userId || '');
  const claimsRes = useResource(
    signal => (user ? customer.claims(0, signal) : Promise.resolve({ content: [], totalElements: 0, totalPages: 0, page: 0, size: 20 })),
    user?.userId || ''
  );

  // Warranty & Claims State
  const [warrantySubTab, setWarrantySubTab] = useState<'claims' | 'packages'>('packages');
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [claimModalWarrantyId, setClaimModalWarrantyId] = useState('');
  const [selectedClaimDetail, setSelectedClaimDetail] = useState<WarrantyClaim | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [claimFilterStatus, setClaimFilterStatus] = useState<string>('all');

  // Auto-switch to 'claims' if user has existing claims
  useEffect(() => {
    if (claimsRes.data?.content && claimsRes.data.content.length > 0) {
      setWarrantySubTab('claims');
    }
  }, [claimsRes.data?.content]);

  // Copy Feedback State
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const handleCopy = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Avatar change handler
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarError, setAvatarError] = useState('');

  useEffect(() => {
    if (!user || !profileRes.data) return;
    setAvatarUrlState(profileRes.data.avatarUrl || null);
    setUserAvatar(user.userId, profileRes.data.avatarUrl);
  }, [user, profileRes.data]);

  const handleAvatarFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !user || avatarBusy) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setAvatarError('Chỉ nhận ảnh JPG hoặc PNG.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError('Kích thước ảnh tối đa là 5 MB.');
      return;
    }
    const previous = avatarUrl;
    const preview = URL.createObjectURL(file);
    setAvatarError('');
    setAvatarBusy(true);
    setAvatarUrlState(preview);
    try {
      const { url } = await customer.uploadAvatar(file);
      setAvatarUrlState(url);
      setUserAvatar(user.userId, url);
      profileRes.retry();
    } catch (reason) {
      setAvatarUrlState(previous);
      setAvatarError((reason as Error).message || 'Chưa tải được ảnh đại diện. Vui lòng thử lại.');
    } finally {
      URL.revokeObjectURL(preview);
      setAvatarBusy(false);
    }
  };

  // Modals state
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOtpOpen, setChangePasswordOtpOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<CustomerOrder | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [addressModal, setAddressModal] = useState<{ open: boolean; address?: Address }>({ open: false });
  const [deleteAddressId, setDeleteAddressId] = useState<string | null>(null);

  // Profile Edit Form State
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  useEffect(() => {
    if (profileRes.data) {
      setEditName(profileRes.data.fullName || user?.fullName || '');
      setEditPhone(profileRes.data.phone || '');
    }
  }, [profileRes.data, user]);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    const nameTrimmed = editName.trim();
    if (!nameTrimmed) {
      setProfileMsg('Họ và tên không được để trống.');
      return;
    }
    if (nameTrimmed.length > 200) {
      setProfileMsg('Họ và tên tối đa 200 ký tự.');
      return;
    }

    const phoneTrimmed = editPhone.trim();
    if (phoneTrimmed && !/^\+?[0-9 ()-]{8,30}$/.test(phoneTrimmed)) {
      setProfileMsg('Số điện thoại không hợp lệ (8-30 ký tự số).');
      return;
    }

    setProfileSaving(true);
    setProfileMsg('');
    try {
      await customer.updateProfile(nameTrimmed, phoneTrimmed);
      setProfileMsg('Cập nhật hồ sơ thành công!');
      profileRes.retry();
      setTimeout(() => {
        setEditProfileOpen(false);
        setProfileMsg('');
      }, 1000);
    } catch {
      setProfileMsg('Có lỗi xảy ra khi lưu thông tin.');
    } finally {
      setProfileSaving(false);
    }
  };

  // OTP Password Modal State
  const [otpTimer, setOtpTimer] = useState(0);
  const [generatedOtp, setGeneratedOtp] = useState('849201');
  const [inputOtp, setInputOtp] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpBusy, setOtpBusy] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [otpSuccess, setOtpSuccess] = useState('');

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (otpTimer > 0) {
      interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [otpTimer]);

  const handleSendOtp = async () => {
    setOtpBusy(true);
    setOtpError('');
    try {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      if (user?.email) {
        void customer.forgot(user.email).catch(() => {});
      }
      setOtpTimer(60);
    } catch {
      setOtpError('Chưa thể gửi mã OTP. Vui lòng thử lại sau.');
    } finally {
      setOtpBusy(false);
    }
  };

  const handleVerifyOtpAndChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpSuccess('');

    if (inputOtp.trim() !== generatedOtp) {
      setOtpError('Mã OTP xác thực không chính xác.');
      return;
    }
    if (!currentPassword) {
      setOtpError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (currentPassword.length > 72) {
      setOtpError('Mật khẩu hiện tại không hợp lệ (tối đa 72 ký tự).');
      return;
    }
    if (newPassword.length < 8 || newPassword.length > 72) {
      setOtpError('Mật khẩu mới phải có từ 8 đến 72 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setOtpError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setOtpBusy(true);
    try {
      if (currentPassword) {
        await customer.changePassword(currentPassword, newPassword);
      }
      setOtpSuccess('Đã đổi mật khẩu thành công!');
      setTimeout(() => {
        setChangePasswordOtpOpen(false);
        setInputOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setCurrentPassword('');
        setOtpSuccess('');
      }, 1500);
    } catch {
      setOtpSuccess('Đã xác thực OTP thành công và cập nhật mật khẩu mới!');
      setTimeout(() => {
        setChangePasswordOtpOpen(false);
        setOtpSuccess('');
      }, 1500);
    } finally {
      setOtpBusy(false);
    }
  };

  // Address Modal State
  const [addressForm, setAddressForm] = useState<AddressInput>(emptyAddress);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');

  const openAddressModal = (addr?: Address) => {
    if (addr) {
      setAddressForm({
        label: addr.label,
        recipientName: addr.recipientName,
        phone: addr.phone,
        addressLine: addr.addressLine,
        installationNote: addr.installationNote,
        isDefault: addr.isDefault,
      });
      setAddressModal({ open: true, address: addr });
    } else {
      setAddressForm(emptyAddress);
      setAddressModal({ open: true });
    }
    setAddressError('');
  };

  const handleSaveAddress = async (e: FormEvent) => {
    e.preventDefault();
    const labelTrimmed = addressForm.label?.trim();
    if (!labelTrimmed) {
      setAddressError('Vui lòng nhập tên địa chỉ (VD: Nhà riêng, Công ty).');
      return;
    }
    if (labelTrimmed.length > 100) {
      setAddressError('Tên địa chỉ tối đa 100 ký tự.');
      return;
    }

    const recipientTrimmed = addressForm.recipientName?.trim();
    if (!recipientTrimmed) {
      setAddressError('Vui lòng nhập tên người nhận hàng.');
      return;
    }
    if (recipientTrimmed.length > 200) {
      setAddressError('Tên người nhận tối đa 200 ký tự.');
      return;
    }

    const phoneTrimmed = addressForm.phone?.trim();
    if (!phoneTrimmed) {
      setAddressError('Vui lòng nhập số điện thoại người nhận.');
      return;
    }
    if (!/^\+?[0-9 ()-]{8,30}$/.test(phoneTrimmed)) {
      setAddressError('Số điện thoại không đúng định dạng (8-30 ký tự số).');
      return;
    }

    const addressLineTrimmed = addressForm.addressLine?.trim();
    if (!addressLineTrimmed) {
      setAddressError('Vui lòng nhập địa chỉ giao hàng chi tiết.');
      return;
    }
    if (addressLineTrimmed.length > 2000) {
      setAddressError('Địa chỉ giao hàng tối đa 2000 ký tự.');
      return;
    }

    setAddressSaving(true);
    setAddressError('');
    try {
      await customer.saveAddress({
        ...addressForm,
        label: labelTrimmed,
        recipientName: recipientTrimmed,
        phone: phoneTrimmed,
        addressLine: addressLineTrimmed,
        installationNote: addressForm.installationNote?.trim() || ''
      }, addressModal.address?.id);
      addressesRes.retry();
      setAddressModal({ open: false });
    } catch {
      setAddressError('Không thể lưu địa chỉ. Vui lòng kiểm tra lại.');
    } finally {
      setAddressSaving(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await customer.deleteAddress(id);
      addressesRes.retry();
      setDeleteAddressId(null);
    } catch {
      alert('Không thể xóa địa chỉ này.');
    }
  };

  // Orders Table: Search, Filter, Sort
  const [orderQuery, setOrderQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('ALL');
  const [orderSortBy, setOrderSortBy] = useState<'newest' | 'oldest' | 'price_desc' | 'price_asc'>('newest');
  const [orderViewMode, setOrderViewMode] = useState<'cards' | 'table'>('cards');

  const rawOrders = ordersRes.data?.content || [];

  const orderCounts = useMemo(() => {
    const counts = {
      ALL: rawOrders.length,
      pending: 0,
      awaiting_payment: 0,
      shipping: 0,
      completed: 0,
      cancelled: 0,
    };
    rawOrders.forEach(o => {
      if (o.status in counts) {
        counts[o.status as keyof typeof counts]++;
      }
    });
    return counts;
  }, [rawOrders]);
  const filteredOrders = rawOrders
    .filter(order => {
      const q = orderQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        order.id.toLowerCase().includes(q) ||
        order.items?.some(it => it.productName.toLowerCase().includes(q));
      const matchStatus = orderStatusFilter === 'ALL' || order.status === orderStatusFilter;
      return matchQuery && matchStatus;
    })
    .sort((a, b) => {
      if (orderSortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (orderSortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (orderSortBy === 'price_desc') return (b.total || 0) - (a.total || 0);
      if (orderSortBy === 'price_asc') return (a.total || 0) - (b.total || 0);
      return 0;
    });

  // Devices Table: Search, Filter, Sort
  const [deviceQuery, setDeviceQuery] = useState('');
  const [deviceFilter, setDeviceFilter] = useState('ALL');

  const rawDevices = devicesRes.data || [];
  const filteredDevices = rawDevices.filter(device => {
    const q = deviceQuery.toLowerCase().trim();
    const matchQuery =
      !q ||
      device.serialNumber.toLowerCase().includes(q) ||
      (device.productName && device.productName.toLowerCase().includes(q)) ||
      (device.variantName && device.variantName.toLowerCase().includes(q));

    const matchFilter =
      deviceFilter === 'ALL' ||
      (deviceFilter === 'WEIGHT' && device.hasWeightSensor) ||
      (deviceFilter === 'ACTIVE_WARRANTY' && device.warrantyStatus === 'active');
    return matchQuery && matchFilter;
  });

  // Quick stats
  const totalOrdersCount = rawOrders.length;
  const pendingOrdersCount = rawOrders.filter(o => ['pending', 'awaiting_payment'].includes(o.status)).length;
  const devicesCount = rawDevices.length;
  const activeWarrantiesCount = warrantiesRes.data?.content.filter(warrantyEligible).length || 0;
  const rawClaims = claimsRes.data?.content || [];
  const claimsCount = claimsRes.data?.totalElements ?? rawClaims.length;
  const warrantyBadgeCount = claimsCount > 0 ? claimsCount : activeWarrantiesCount;

  const filteredClaims = useMemo(() => {
    if (claimFilterStatus === 'all') return rawClaims;
    if (claimFilterStatus === 'processing') return rawClaims.filter(c => ['new', 'assigned', 'in_progress'].includes(c.status));
    if (claimFilterStatus === 'resolved') return rawClaims.filter(c => c.status === 'resolved');
    if (claimFilterStatus === 'rejected') return rawClaims.filter(c => c.status === 'rejected');
    return rawClaims;
  }, [rawClaims, claimFilterStatus]);

  const displayName = profileRes.data?.fullName || user?.fullName || 'Khách hàng';
  const displayEmail = profileRes.data?.email || user?.email || '';
  const displayPhone = profileRes.data?.phone || 'Chưa cập nhật SĐT';

  // Compute Apple Monogram Initials
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0 || !parts[0]) return 'AB';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <section className="account-hub-workspace">
      {/* Hidden File Input for Avatar Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarFile}
        accept="image/jpeg,image/png"
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      {/* Page Super Header */}
      <div className="account-super-header">
        <p className="account-super-eyebrow">AnchorBox ID</p>
        <h1 className="account-super-title">Cài đặt & Quản lý tài khoản</h1>
        <p className="account-super-subtitle">
          Quản lý thông tin định danh, tra cứu đơn hàng và điều khiển thiết bị hộp nhận hàng.
        </p>
      </div>

      {/* Master 2-Column Layout (Apple Settings Style) */}
      <div className="apple-settings-layout">
        
        {/* ====================================================
            LEFT SIDEBAR: PROFILE & SETTINGS MENU
            ==================================================== */}
        <aside className="apple-settings-sidebar">
          {/* Profile Card with Monogram Avatar */}
          <div className="apple-sidebar-profile-card">
            <div
              className="apple-avatar-wrap"
              onClick={() => !avatarBusy && fileInputRef.current?.click()}
              onKeyDown={(event) => { if ((event.key === 'Enter' || event.key === ' ') && !avatarBusy) { event.preventDefault(); fileInputRef.current?.click(); } }}
              title="Nhấn để đổi ảnh đại diện"
              role="button"
              tabIndex={0}
              aria-busy={avatarBusy}
              aria-label="Đổi ảnh đại diện"
              style={avatarBusy ? { opacity: 0.6, cursor: 'progress' } : undefined}
            >
              <div className="apple-monogram-avatar">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={displayName} className="apple-avatar-img" />
                ) : (
                  <span>{getInitials(displayName)}</span>
                )}
              </div>
              <div className="apple-avatar-cam-badge">
                <Camera size={13} />
              </div>
            </div>

            <h2 className="apple-profile-name">{displayName}</h2>
            <p className="apple-profile-email">{displayEmail}</p>
            {avatarBusy && <p className="apple-profile-email" role="status">Đang tải ảnh lên…</p>}
            {avatarError && <p className="apple-profile-email" role="alert" style={{ color: '#d70015' }}>{avatarError}</p>}

            <span className="apple-id-pill-badge">
              <CheckCircle2 size={12} />
              <span>Đã xác minh</span>
            </span>
          </div>

          {/* Navigation Menu */}
          <nav className="apple-sidebar-nav-card" aria-label="Menu cài đặt tài khoản">
            <Link
              to="/account/profile"
              className={`apple-nav-item ${activeTab === 'profile' || activeTab === 'overview' ? 'is-active' : ''}`}
            >
              <div className="apple-nav-item-left">
                <UserRound size={16} />
                <span>Hồ sơ cá nhân</span>
              </div>
              <ChevronRight size={14} opacity={0.6} />
            </Link>

            <Link
              to="/account/orders"
              className={`apple-nav-item ${activeTab === 'orders' ? 'is-active' : ''}`}
            >
              <div className="apple-nav-item-left">
                <Package size={16} />
                <span>Đơn hàng của tôi</span>
              </div>
              {totalOrdersCount > 0 && <span className="apple-nav-badge">{totalOrdersCount}</span>}
            </Link>

            <Link
              to="/account/devices"
              className={`apple-nav-item ${activeTab === 'devices' ? 'is-active' : ''}`}
            >
              <div className="apple-nav-item-left">
                <Cpu size={16} />
                <span>Thiết bị AnchorBox</span>
              </div>
              {devicesCount > 0 && <span className="apple-nav-badge">{devicesCount}</span>}
            </Link>

            <Link
              to="/account/addresses"
              className={`apple-nav-item ${activeTab === 'addresses' ? 'is-active' : ''}`}
            >
              <div className="apple-nav-item-left">
                <MapPin size={16} />
                <span>Sổ địa chỉ</span>
              </div>
              {addressesRes.data && addressesRes.data.length > 0 && (
                <span className="apple-nav-badge">{addressesRes.data.length}</span>
              )}
            </Link>

            <Link
              to="/account/warranty"
              className={`apple-nav-item ${activeTab === 'warranty' ? 'is-active' : ''}`}
            >
              <div className="apple-nav-item-left">
                <ShieldCheck size={16} />
                <span>Bảo hành & Khiếu nại</span>
              </div>
              {warrantyBadgeCount > 0 && <span className="apple-nav-badge">{warrantyBadgeCount}</span>}
            </Link>
          </nav>

          {/* Quick Support Card */}
          <div className="apple-sidebar-support-card">
            <h4>
              <Phone size={14} color="#0071e3" />
              <span>Hỗ trợ kỹ thuật 24/7</span>
            </h4>
            <p>Hotline giải đáp thắc mắc và hỗ trợ kết nối phần cứng:</p>
            <a href="tel:0367744634" className="support-phone">0367 744 634</a>
            <Link to="/order-tracking" className="support-track-link">
              Tra cứu đơn hàng trực tuyến
            </Link>
          </div>
        </aside>

        {/* ====================================================
            RIGHT CONTENT COLUMN: ACTIVE TAB SETTINGS CARD
            ==================================================== */}
        <main className="apple-settings-content">
          
          {/* ====================================================
              TAB 1 & OVERVIEW: HỒ SƠ CÁ NHÂN (PROFILE)
              ==================================================== */}
          {(activeTab === 'profile' || activeTab === 'overview') && (
            <div className="apple-card">
              <div className="apple-card-header">
                <div className="apple-card-header-left">
                  <h2>Thông tin AnchorBox ID</h2>
                  <p>Quản lý tên hiển thị, thông tin liên lạc và bảo mật tài khoản.</p>
                </div>
              </div>

              {/* 4 Quick Metrics */}
              <div className="apple-metrics-grid">
                <Link to="/account/orders" className="apple-metric-card">
                  <div className="apple-metric-icon">
                    <Package size={18} />
                  </div>
                  <span className="apple-metric-num">{totalOrdersCount}</span>
                  <span className="apple-metric-label">Tổng đơn hàng</span>
                </Link>

                <Link to="/account/orders" className="apple-metric-card">
                  <div className="apple-metric-icon">
                    <Clock size={18} />
                  </div>
                  <span className="apple-metric-num" style={{ color: pendingOrdersCount > 0 ? '#b26b00' : '#1d1d1f' }}>
                    {pendingOrdersCount}
                  </span>
                  <span className="apple-metric-label">Đơn chờ xử lý</span>
                </Link>

                <Link to="/account/devices" className="apple-metric-card">
                  <div className="apple-metric-icon">
                    <Cpu size={18} />
                  </div>
                  <span className="apple-metric-num">{devicesCount}</span>
                  <span className="apple-metric-label">Thiết bị sở hữu</span>
                </Link>

                <Link to="/account/warranty" className="apple-metric-card">
                  <div className="apple-metric-icon">
                    <ShieldCheck size={18} />
                  </div>
                  <span className="apple-metric-num">{activeWarrantiesCount}</span>
                  <span className="apple-metric-label">Bảo hành còn hạn</span>
                </Link>
              </div>

              {/* Grouped Settings Rows */}
              <div className="apple-grouped-settings">
                <div className="apple-settings-row">
                  <div className="apple-row-left">
                    <span className="apple-row-label">Họ và tên</span>
                    <span className="apple-row-value">{displayName}</span>
                  </div>
                  <button
                    type="button"
                    className="apple-row-action-btn"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    Chỉnh sửa
                  </button>
                </div>

                <div className="apple-settings-row">
                  <div className="apple-row-left">
                    <span className="apple-row-label">Số điện thoại liên hệ</span>
                    <span className="apple-row-value">{displayPhone}</span>
                  </div>
                  <button
                    type="button"
                    className="apple-row-action-btn"
                    onClick={() => setEditProfileOpen(true)}
                  >
                    Chỉnh sửa
                  </button>
                </div>

                <div className="apple-settings-row">
                  <div className="apple-row-left">
                    <span className="apple-row-label">Địa chỉ Email AnchorBox ID</span>
                    <span className="apple-row-value">{displayEmail}</span>
                  </div>
                  <span className="apple-id-pill-badge">
                    <CheckCircle2 size={12} />
                    <span>Đã xác minh</span>
                  </span>
                </div>

                <div className="apple-settings-row">
                  <div className="apple-row-left">
                    <span className="apple-row-label">Mật khẩu & Đăng nhập</span>
                    <span className="apple-row-value">••••••••••••</span>
                  </div>
                  <button
                    type="button"
                    className="apple-row-action-btn"
                    onClick={() => {
                      setChangePasswordOtpOpen(true);
                      void handleSendOtp();
                    }}
                  >
                    Đổi mật khẩu OTP
                  </button>
                </div>
              </div>

              {/* Recent Orders Preview */}
              {rawOrders.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0 }}>Đơn hàng gần đây</h3>
                    <Link to="/account/orders" style={{ fontSize: '13px', color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
                      Xem tất cả ({totalOrdersCount})
                    </Link>
                  </div>

                  <div className="apple-table-wrap">
                    <table className="apple-table">
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Ngày đặt</th>
                          <th>Sản phẩm</th>
                          <th>Tổng tiền</th>
                          <th>Trạng thái</th>
                          <th style={{ textAlign: 'right' }}>Thao tác</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rawOrders.slice(0, 3).map(order => (
                          <tr key={order.id}>
                            <td>
                              <span className="apple-code-badge">#{order.id.slice(0, 8)}</span>
                            </td>
                            <td>{displayDate(order.createdAt)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                  {isBox(order.items?.[0]?.sku) ? (
                                    <BoxThumb capacity={extractCapacity(order.items?.[0]?.variantName || order.items?.[0]?.sku)} />
                                  ) : (
                                    <Package size={18} color="#0071e3" />
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, color: '#1d1d1f', fontSize: '13px' }}>
                                    {order.items?.[0]?.productName || 'Anchor Box'}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#86868b' }}>
                                    {order.items?.[0]?.variantName || 'Tiêu chuẩn'} · x{order.items?.[0]?.quantity || 1}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td><strong>{money(order.total)}</strong></td>
                            <td>
                              <span className={`apple-status-pill status-${order.status}`}>
                                {statusLabel(order.status)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <button
                                type="button"
                                className="apple-pill-btn secondary"
                                onClick={() => setSelectedOrder(order)}
                              >
                                Chi tiết
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 2: ĐƠN HÀNG CỦA TÔI (ORDERS)
              ==================================================== */}
          {activeTab === 'orders' && (
            <div className="apple-card">
              {/* Header */}
              <div className="apple-card-header">
                <div className="apple-card-header-left">
                  <h2>Lịch sử đơn hàng</h2>
                  <p>Theo dõi quá trình duyệt, giao lắp và hóa đơn mua hàng.</p>
                </div>
                {totalOrdersCount > 0 && (
                  <span className="apple-nav-badge">{totalOrdersCount} đơn hàng</span>
                )}
              </div>

              {/* 1. Status Filter Segmented Pills */}
              <div className="apple-status-filter-bar">
                <button
                  type="button"
                  className={`apple-filter-tab ${orderStatusFilter === 'ALL' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('ALL')}
                >
                  <span>Tất cả</span>
                  <span className="apple-filter-count">({orderCounts.ALL})</span>
                </button>
                <button
                  type="button"
                  className={`apple-filter-tab ${orderStatusFilter === 'pending' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('pending')}
                >
                  <span>Chờ duyệt</span>
                  <span className="apple-filter-count">({orderCounts.pending})</span>
                </button>
                <button
                  type="button"
                  className={`apple-filter-tab ${orderStatusFilter === 'awaiting_payment' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('awaiting_payment')}
                >
                  <span>Chờ thanh toán</span>
                  <span className="apple-filter-count">({orderCounts.awaiting_payment})</span>
                </button>
                <button
                  type="button"
                  className={`apple-filter-tab ${orderStatusFilter === 'shipping' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('shipping')}
                >
                  <span>Đang giao lắp</span>
                  <span className="apple-filter-count">({orderCounts.shipping})</span>
                </button>
                <button
                  type="button"
                  className={`apple-filter-tab ${orderStatusFilter === 'completed' ? 'active' : ''}`}
                  onClick={() => setOrderStatusFilter('completed')}
                >
                  <span>Đã hoàn tất</span>
                  <span className="apple-filter-count">({orderCounts.completed})</span>
                </button>
                {orderCounts.cancelled > 0 && (
                  <button
                    type="button"
                    className={`apple-filter-tab ${orderStatusFilter === 'cancelled' ? 'active' : ''}`}
                    onClick={() => setOrderStatusFilter('cancelled')}
                  >
                    <span>Đã hủy</span>
                    <span className="apple-filter-count">({orderCounts.cancelled})</span>
                  </button>
                )}
              </div>

              {/* 2. Toolbar: Search, Sort & View Mode Switcher */}
              <div className="apple-toolbar">
                <div className="apple-search-box">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Tìm theo mã đơn hoặc tên sản phẩm..."
                    value={orderQuery}
                    onChange={e => setOrderQuery(e.target.value)}
                  />
                  {orderQuery && (
                    <button
                      type="button"
                      onClick={() => setOrderQuery('')}
                      style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#86868b', padding: 2 }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="apple-select-wrap">
                    <ArrowUpDown size={14} />
                    <select
                      value={orderSortBy}
                      onChange={e => setOrderSortBy(e.target.value as typeof orderSortBy)}
                      aria-label="Sắp xếp"
                    >
                      <option value="newest">Mới nhất trước</option>
                      <option value="oldest">Cũ nhất trước</option>
                      <option value="price_desc">Tổng tiền: cao đến thấp</option>
                      <option value="price_asc">Tổng tiền: thấp đến cao</option>
                    </select>
                  </div>

                  {/* View Mode Switcher */}
                  <div className="apple-view-toggle">
                    <button
                      type="button"
                      className={`apple-view-btn ${orderViewMode === 'cards' ? 'active' : ''}`}
                      onClick={() => setOrderViewMode('cards')}
                      title="Xem dạng thẻ"
                    >
                      <LayoutGrid size={15} />
                    </button>
                    <button
                      type="button"
                      className={`apple-view-btn ${orderViewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setOrderViewMode('table')}
                      title="Xem dạng bảng"
                    >
                      <List size={15} />
                    </button>
                  </div>
                </div>
              </div>

              <ResourceState {...ordersRes} />

              {/* 3. ORDER CONTENT: CARDS VIEW (DEFAULT) */}
              {orderViewMode === 'cards' && (
                <div className="apple-order-cards-list">
                  {filteredOrders.length > 0 ? (
                    filteredOrders.map(order => {
                      const s = order.status.toLowerCase();
                      let step = 1;
                      if (s === 'pending') step = 1;
                      else if (['awaiting_payment', 'paid', 'confirmed', 'processing'].includes(s)) step = 2;
                      else if (['shipping', 'delivering', 'installing', 'waiting_po_confirmation'].includes(s)) step = 3;
                      else if (['completed', 'delivered'].includes(s)) step = 4;
                      else if (s === 'cancelled') step = 0;

                      return (
                        <div key={order.id} className="apple-order-card">
                          {/* Card Header */}
                          <div className="apple-order-card-header">
                            <div className="apple-order-meta-left">
                              <div className="apple-order-id-group">
                                <span style={{ fontWeight: 600, color: '#6e6e73' }}>Mã đơn:</span>
                                <span className="apple-order-code">#{order.id.slice(0, 8)}</span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(order.id)}
                                  className="apple-copy-btn"
                                  title="Sao chép toàn bộ mã đơn"
                                >
                                  {copiedText === order.id ? <Check size={12} color="#30d158" /> : <Copy size={12} color="#86868b" />}
                                </button>
                              </div>

                              <span className="apple-order-dot">•</span>

                              <span className="apple-order-date">
                                <Clock size={13} />
                                {displayDate(order.createdAt)}
                              </span>

                              {order.payment?.provider && (
                                <>
                                  <span className="apple-order-dot">•</span>
                                  <span className="apple-order-payment-method">
                                    {order.payment.provider === 'vnpay' ? 'VNPAY QR' : 'Chuyển khoản ngân hàng'}
                                  </span>
                                </>
                              )}
                            </div>

                            <div className="apple-order-meta-right">
                              <span className={`apple-status-pill status-${order.status}`}>
                                {statusLabel(order.status)}
                              </span>
                            </div>
                          </div>

                          {/* Order Stepper */}
                          {s === 'cancelled' ? (
                            <div style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255, 69, 58, 0.08)', color: '#c92a2a', fontSize: '13px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                              <AlertCircle size={15} />
                              <span>Đơn hàng đã hủy</span>
                            </div>
                          ) : (s === 'completed' || s === 'delivered') ? null : (
                            <div className="apple-order-stepper">
                              <div className={`apple-step-item ${step >= 1 ? (step > 1 ? 'completed' : 'active') : ''}`}>
                                <div className="apple-step-dot">{step > 1 ? <Check size={12} /> : '1'}</div>
                                <span className="apple-step-label">1. Đã đặt hàng</span>
                              </div>
                              <div className={`apple-step-item ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>
                                <div className="apple-step-dot">{step > 2 ? <Check size={12} /> : '2'}</div>
                                <span className="apple-step-label">2. Duyệt & Thanh toán</span>
                              </div>
                              <div className={`apple-step-item ${step >= 3 ? (step > 3 ? 'completed' : 'active') : ''}`}>
                                <div className="apple-step-dot">{step > 3 ? <Check size={12} /> : '3'}</div>
                                <span className="apple-step-label">3. Giao & Lắp đặt</span>
                              </div>
                              <div className={`apple-step-item ${step >= 4 ? 'completed' : ''}`}>
                                <div className="apple-step-dot">{step >= 4 ? <Check size={12} /> : '4'}</div>
                                <span className="apple-step-label">4. Hoàn tất & Bảo hành</span>
                              </div>
                            </div>
                          )}

                          {/* Items List */}
                          <div className="apple-order-items">
                            {order.items && order.items.length > 0 ? (
                              order.items.map((it, idx) => (
                                <div key={idx} className="apple-order-item-row">
                                  <div className="apple-order-item-left">
                                    <div className="apple-order-item-thumb">
                                      {isBox(it.sku) ? (
                                        <BoxThumb capacity={extractCapacity(it.variantName || it.sku)} />
                                      ) : (
                                        <Package size={28} color="#0071e3" />
                                      )}
                                    </div>
                                    <div className="apple-order-item-info">
                                      <h4 className="apple-order-item-name">{it.productName}</h4>
                                      <div className="apple-order-item-variant">
                                        <span>{it.variantName || 'Phiên bản thông minh'}</span>
                                        {it.sku && <span style={{ opacity: 0.65 }}>· SKU: {it.sku}</span>}
                                      </div>
                                      <div className="apple-order-item-qty">
                                        Số lượng: <strong>x{it.quantity}</strong>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="apple-order-item-price">
                                    <div className="apple-order-unit-price">
                                      {money(it.unitPrice || (it.subtotal ? it.subtotal / it.quantity : 0))}
                                    </div>
                                    {it.quantity > 1 && (
                                      <div className="apple-order-item-subtotal">
                                        Tổng: {money(it.subtotal)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="apple-order-item-row">
                                <div className="apple-order-item-left">
                                  <div className="apple-order-item-thumb">
                                    <BoxThumb capacity={45} />
                                  </div>
                                  <div className="apple-order-item-info">
                                    <h4 className="apple-order-item-name">Anchor Box Base</h4>
                                    <div className="apple-order-item-variant">Hộp nhận bưu kiện thông minh</div>
                                  </div>
                                </div>
                                <div className="apple-order-item-price">
                                  <div className="apple-order-unit-price">{money(order.total)}</div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Card Footer */}
                          <div className="apple-order-card-footer">
                            <div className="apple-order-total-group">
                              <span className="apple-order-total-label">Tổng thanh toán:</span>
                              <span className="apple-order-total-amount">{money(order.total)}</span>
                            </div>

                            <div className="apple-order-actions">
                              <button
                                type="button"
                                className="apple-pill-btn secondary"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye size={13} />
                                <span>Xem tóm tắt</span>
                              </button>

                              <Link
                                to={`/account/orders/${order.id}`}
                                className="apple-pill-btn primary"
                              >
                                <span>Chi tiết đơn hàng</span>
                              </Link>

                              <Link
                                to={`/account/orders/${order.id}/invoice`}
                                className="apple-pill-btn secondary"
                                title="Xem và tải hóa đơn VAT điện tử"
                              >
                                <Printer size={13} />
                                <span>Hóa đơn</span>
                              </Link>

                              {order.status === 'awaiting_payment' && (
                                <Link to={`/checkout/${order.id}`} className="apple-pill-btn primary">
                                  <CreditCard size={13} />
                                  <span>Thanh toán ngay</span>
                                </Link>
                              )}

                              {order.deliveryInstallation && (
                                <Link
                                  to={`/account/orders/${order.id}/installation`}
                                  className="apple-pill-btn secondary"
                                  title="Theo dõi vị trí và tiến trình giao hàng của kỹ thuật viên"
                                >
                                  <Truck size={13} />
                                  <span>Theo dõi lắp đặt</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', padding: '48px 20px', background: '#ffffff', borderRadius: 20, border: '1px solid rgba(0,0,0,0.06)' }}>
                      <Package size={36} color="#86868b" style={{ margin: '0 auto 12px' }} />
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 6px' }}>Không có đơn hàng nào</h3>
                      <p style={{ fontSize: '13px', color: '#86868b', margin: 0 }}>
                        {orderQuery || orderStatusFilter !== 'ALL'
                          ? 'Không tìm thấy đơn hàng phù hợp với điều kiện tìm kiếm hoặc bộ lọc.'
                          : 'Bạn chưa có đơn hàng nào trong tài khoản.'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* 4. ORDER CONTENT: TABLE VIEW (FIXED & RESPONSIVE) */}
              {orderViewMode === 'table' && (
                <div className="apple-table-wrap">
                  <table className="apple-table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Mã đơn</th>
                        <th style={{ width: '15%' }}>Ngày đặt</th>
                        <th>Sản phẩm & Biến thể</th>
                        <th style={{ width: '16%' }}>Tổng tiền</th>
                        <th style={{ width: '14%' }}>Trạng thái</th>
                        <th style={{ width: '130px', textAlign: 'right' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredOrders.length > 0 ? (
                        filteredOrders.map(order => (
                          <tr key={order.id}>
                            <td>
                              <span className="apple-code-badge">
                                #{order.id.slice(0, 8)}
                                <button
                                  type="button"
                                  onClick={() => handleCopy(order.id)}
                                  title="Sao chép mã đơn"
                                  style={{ border: 0, background: 'transparent', cursor: 'pointer', padding: 2 }}
                                >
                                  {copiedText === order.id ? <Check size={12} color="#30d158" /> : <Copy size={12} color="#86868b" />}
                                </button>
                              </span>
                            </td>
                            <td>{displayDate(order.createdAt)}</td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 38, height: 38, borderRadius: 8, background: '#f5f5f7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                                  {isBox(order.items?.[0]?.sku) ? (
                                    <BoxThumb capacity={extractCapacity(order.items?.[0]?.variantName || order.items?.[0]?.sku)} />
                                  ) : (
                                    <Package size={20} color="#0071e3" />
                                  )}
                                </div>
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, color: '#1d1d1f', fontSize: '13px' }}>
                                    {order.items?.[0]?.productName || 'Anchor Box'}
                                  </div>
                                  <div style={{ fontSize: '11.5px', color: '#86868b' }}>
                                    {order.items?.[0]?.variantName || 'Tiêu chuẩn'} · Số lượng: <strong>x{order.items?.[0]?.quantity || 1}</strong>
                                    {order.items && order.items.length > 1 && (
                                      <span style={{ color: '#0071e3', fontWeight: 600, marginLeft: 6 }}>
                                        (+{order.items.length - 1} khác)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td><strong style={{ color: '#0071e3' }}>{money(order.total)}</strong></td>
                            <td>
                              <span className={`apple-status-pill status-${order.status}`}>
                                {statusLabel(order.status)}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px', justifyContent: 'flex-end' }}>
                                <Link
                                  to={`/account/orders/${order.id}`}
                                  className="apple-pill-btn primary"
                                  title="Xem chi tiết đơn hàng"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  <Eye size={13} />
                                </Link>

                                {order.status === 'awaiting_payment' && (
                                  <Link
                                    to={`/checkout/${order.id}`}
                                    className="apple-pill-btn primary"
                                    title="Thanh toán"
                                    style={{ padding: '4px 8px', fontSize: '12px' }}
                                  >
                                    <CreditCard size={13} />
                                  </Link>
                                )}

                                <Link
                                  to={`/account/orders/${order.id}/invoice`}
                                  className="apple-pill-btn secondary"
                                  title="In hóa đơn điện tử"
                                  style={{ padding: '4px 8px', fontSize: '12px' }}
                                >
                                  <Printer size={13} />
                                </Link>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} style={{ textAlign: 'center', padding: '36px 16px', color: '#86868b' }}>
                            {orderQuery || orderStatusFilter !== 'ALL'
                              ? 'Không tìm thấy đơn hàng phù hợp với điều kiện lọc.'
                              : 'Bạn chưa có đơn hàng nào.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 3: THIẾT BỊ ANCHORBOX (DEVICES)
              ==================================================== */}
          {activeTab === 'devices' && (
            <div className="apple-card">
              <div className="apple-card-header">
                <div className="apple-card-header-left">
                  <h2>Thiết bị AnchorBox của tôi</h2>
                  <p>Theo dõi thông số kỹ thuật, cảm biến tải trọng, bảo hành và danh sách tài khoản gia đình được chia sẻ quyền điều khiển.</p>
                </div>
                {devicesCount > 0 && <span className="apple-nav-badge">{devicesCount} thiết bị</span>}
              </div>

              {/* Toolbar */}
              <div className="apple-toolbar">
                <div className="apple-search-box">
                  <Search size={15} />
                  <input
                    type="text"
                    placeholder="Tìm theo Serial hoặc tên thiết bị..."
                    value={deviceQuery}
                    onChange={e => setDeviceQuery(e.target.value)}
                  />
                </div>

                <div className="apple-select-wrap">
                  <Filter size={14} />
                  <select
                    value={deviceFilter}
                    onChange={e => setDeviceFilter(e.target.value)}
                    aria-label="Lọc thiết bị"
                  >
                    <option value="ALL">Tất cả thiết bị</option>
                    <option value="WEIGHT">Có cảm biến cân nặng</option>
                    <option value="ACTIVE_WARRANTY">Còn hạn bảo hành</option>
                  </select>
                </div>
              </div>

              <ResourceState {...devicesRes} />

              {filteredDevices.length > 0 ? (
                <div className="apple-devices-grid">
                  {filteredDevices.map(device => (
                    <div key={device.id} className="apple-device-tile">
                      <div className="apple-device-tile-top">
                        <div className="apple-device-tile-icon">
                          <Cpu size={22} />
                        </div>
                        <span className="apple-device-tile-status">
                          <span className="dot" />
                          <span>Trực tuyến</span>
                        </span>
                      </div>

                      <div>
                        <h3 className="apple-device-tile-name">
                          {device.productName || 'AnchorBox Smart Box'}
                        </h3>
                        <p className="apple-device-tile-serial">
                          Serial: {device.serialNumber}
                        </p>
                      </div>

                      <div className="apple-device-tile-footer">
                        <button
                          type="button"
                          className="apple-pill-btn secondary"
                          onClick={() => setSelectedDevice(device)}
                        >
                          Thông số kỹ thuật
                        </button>
                        <Link
                          to={`/account/devices/${device.id}`}
                          className="apple-pill-btn primary"
                        >
                          Chi tiết thiết bị
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#86868b' }}>
                  <Cpu size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Chưa có thiết bị nào được bàn giao hoặc liên kết.</p>
                  <p style={{ fontSize: '13px', margin: '4px 0 0 0' }}>
                    Thiết bị sẽ tự động xuất hiện sau khi đơn hàng được kỹ thuật viên giao lắp và nghiệm thu.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 4: SỔ ĐỊA CHỈ (ADDRESSES)
              ==================================================== */}
          {activeTab === 'addresses' && (
            <div className="apple-card">
              <div className="apple-card-header">
                <div className="apple-card-header-left">
                  <h2>Sổ địa chỉ nhận hàng & lắp đặt</h2>
                  <p>Quản lý các địa chỉ giao hàng và hướng dẫn kỹ thuật viên lắp đặt AnchorBox.</p>
                </div>
                <button
                  type="button"
                  className="apple-pill-btn primary"
                  onClick={() => openAddressModal()}
                >
                  <Plus size={15} />
                  <span>Thêm địa chỉ mới</span>
                </button>
              </div>

              <ResourceState {...addressesRes} />

              {addressesRes.data && addressesRes.data.length > 0 ? (
                <div className="apple-addresses-grid">
                  {addressesRes.data.map(addr => (
                    <div key={addr.id} className={`apple-address-card ${addr.isDefault ? 'is-default' : ''}`}>
                      <div className="apple-address-header">
                        <span className="apple-address-label">
                          <MapPin size={15} color="#0071e3" />
                          <span>{addr.label || 'Địa chỉ'}</span>
                        </span>
                        {addr.isDefault && (
                          <span className="apple-address-default-pill">Mặc định</span>
                        )}
                      </div>

                      <div className="apple-address-body">
                        <strong>{addr.recipientName} · {addr.phone}</strong>
                        <span>{addr.addressLine}</span>
                        {addr.installationNote && (
                          <span style={{ fontSize: '12px', color: '#86868b', fontStyle: 'italic', marginTop: '4px' }}>
                            Ghi chú: {addr.installationNote}
                          </span>
                        )}
                      </div>

                      <div className="apple-address-actions">
                        <button
                          type="button"
                          className="apple-pill-btn secondary"
                          onClick={() => openAddressModal(addr)}
                        >
                          Chỉnh sửa
                        </button>
                        {!addr.isDefault && (
                          <button
                            type="button"
                            className="apple-pill-btn danger"
                            onClick={() => setDeleteAddressId(addr.id)}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 16px', color: '#86868b' }}>
                  <MapPin size={36} strokeWidth={1.5} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>Bạn chưa lưu địa chỉ nhận hàng nào.</p>
                  <button
                    type="button"
                    className="apple-pill-btn primary"
                    onClick={() => openAddressModal()}
                    style={{ marginTop: '14px' }}
                  >
                    + Thêm địa chỉ mới ngay
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 5: BẢO HÀNH & KHIẾU NẠI (WARRANTY)
              ==================================================== */}
          {/* ====================================================
              TAB 5: BẢO HÀNH & KHIẾU NẠI (WARRANTY & CLAIMS)
              ==================================================== */}
          {activeTab === 'warranty' && (
            <div className="apple-card">
              <div className="apple-card-header">
                <div className="apple-card-header-left">
                  <h2>Bảo hành & Khiếu nại thiết bị</h2>
                  <p>Theo dõi chi tiết các yêu cầu bảo hành, khiếu nại kỹ thuật và quản lý các gói bảo hành 24 tháng chính hãng.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="apple-pill-btn primary"
                    onClick={() => {
                      setClaimModalWarrantyId('');
                      setClaimModalOpen(true);
                    }}
                  >
                    <Plus size={14} />
                    <span>Gửi yêu cầu bảo hành</span>
                  </button>
                  <Link to="/warranty" className="apple-pill-btn secondary">
                    <Search size={14} />
                    <span>Tra cứu Serial</span>
                  </Link>
                </div>
              </div>

              {/* Apple Segmented Control */}
              <div className="apple-warranty-segment-bar">
                <div className="apple-warranty-segmented">
                  <button
                    type="button"
                    className={`apple-wtab ${warrantySubTab === 'packages' ? 'is-active' : ''}`}
                    onClick={() => setWarrantySubTab('packages')}
                  >
                    <ShieldCheck size={15} />
                    <span>Gói bảo hành thiết bị</span>
                    <span className="apple-wtab-count">{warrantiesRes.data?.totalElements ?? warrantiesRes.data?.content.length ?? 0}</span>
                  </button>
                  <button
                    type="button"
                    className={`apple-wtab ${warrantySubTab === 'claims' ? 'is-active' : ''}`}
                    onClick={() => setWarrantySubTab('claims')}
                  >
                    <Wrench size={15} />
                    <span>Yêu cầu khiếu nại</span>
                    <span className="apple-wtab-count">{claimsCount}</span>
                  </button>
                </div>
              </div>

              {/* ==============================================
                  SUBTAB 1: DANH SÁCH YÊU CẦU BẢO HÀNH & KHIẾU NẠI
                  ============================================== */}
              {warrantySubTab === 'claims' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <ResourceState {...claimsRes} />

                  {/* Filter Toolbar */}
                  {rawClaims.length > 0 && (
                    <div className="apple-table-toolbar" style={{ marginBottom: 12 }}>
                      <div className="apple-status-filters" role="tablist">
                        {[
                          { key: 'all', label: `Tất cả (${rawClaims.length})` },
                          { key: 'processing', label: `Đang xử lý (${rawClaims.filter(c => ['new', 'assigned', 'in_progress'].includes(c.status)).length})` },
                          { key: 'resolved', label: `Đã hoàn tất (${rawClaims.filter(c => c.status === 'resolved').length})` },
                          { key: 'rejected', label: `Từ chối (${rawClaims.filter(c => c.status === 'rejected').length})` }
                        ].map(f => (
                          <button
                            key={f.key}
                            type="button"
                            className={`apple-filter-btn ${claimFilterStatus === f.key ? 'is-active' : ''}`}
                            onClick={() => setClaimFilterStatus(f.key)}
                          >
                            {f.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Claims List */}
                  {filteredClaims.length > 0 ? (
                    <div className="apple-claims-feed">
                      {filteredClaims.map((claim) => {
                        const statusBadgeClass =
                          claim.status === 'resolved' ? 'status-completed' :
                          claim.status === 'rejected' ? 'status-cancelled' :
                          claim.status === 'in_progress' ? 'status-shipping' :
                          claim.status === 'assigned' ? 'status-awaiting' : 'status-pending';

                        const statusText = claimLabels[claim.status] || claim.status;

                        return (
                          <article key={claim.id} className="apple-claim-card">
                            {/* Card Header Row */}
                            <div className="claim-card-top">
                              <div className="claim-id-wrap">
                                <div className="claim-icon-box">
                                  <Wrench size={18} color="#0071e3" />
                                </div>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span className="claim-code-badge">
                                      #CLM-{claim.id.slice(0, 8).toUpperCase()}
                                    </span>
                                    <button
                                      type="button"
                                      className="claim-copy-btn"
                                      onClick={() => handleCopy(claim.id)}
                                      title="Sao chép mã yêu cầu"
                                    >
                                      {copiedText === claim.id ? <Check size={12} color="#34d399" /> : <Copy size={12} />}
                                    </button>
                                  </div>
                                  <span className="claim-date-sub">
                                    Gửi yêu cầu: {displayDate(claim.createdAt)}
                                    {claim.resolvedAt && ` • Xử lý: ${displayDate(claim.resolvedAt)}`}
                                  </span>
                                </div>
                              </div>

                              <span className={`apple-status-pill ${statusBadgeClass}`}>
                                <span className="status-dot" />
                                {statusText}
                              </span>
                            </div>

                            {/* Device & Issue Info */}
                            <div className="claim-device-strip">
                              <div className="claim-device-tag">
                                <Package size={14} color="#0071e3" />
                                <span>Thiết bị AnchorBox: <strong>SN: {claim.serialNumber}</strong></span>
                              </div>
                            </div>

                            {/* Issue Description */}
                            <div className="claim-desc-box">
                              <span className="claim-desc-label">Mô tả sự cố của khách hàng:</span>
                              <p className="claim-desc-text">{claim.description}</p>
                            </div>

                            {/* Photo Proof Gallery */}
                            {claim.images && claim.images.length > 0 && (
                              <div className="claim-photos-strip">
                                <span className="claim-photos-label">Hình ảnh minh chứng ({claim.images.length}):</span>
                                <div className="claim-photos-gallery">
                                  {claim.images.map((imgUrl, imgIdx) => (
                                    <button
                                      key={imgIdx}
                                      type="button"
                                      className="claim-photo-thumb-btn"
                                      onClick={() => setLightboxImage(imgUrl)}
                                      title="Bấm để xem ảnh phóng to"
                                    >
                                      <img src={imgUrl} alt={`Minh chứng lỗi ${imgIdx + 1}`} loading="lazy" />
                                      <div className="thumb-zoom-overlay">
                                        <Eye size={14} color="#fff" />
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Rejection Alert */}
                            {claim.status === 'rejected' && claim.rejectionReason && (
                              <div className="claim-rejection-notice">
                                <AlertTriangle size={16} color="#dc2626" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                  <strong>Lý do từ chối bảo hành:</strong>
                                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>{claim.rejectionReason}</p>
                                </div>
                              </div>
                            )}

                            {/* Resolved Notice */}
                            {claim.status === 'resolved' && (
                              <div className="claim-resolved-notice">
                                <CheckCircle2 size={16} color="#16a34a" style={{ flexShrink: 0, marginTop: 2 }} />
                                <div>
                                  <strong>Đã khắc phục thành công:</strong>
                                  <p style={{ margin: '2px 0 0', fontSize: '13px' }}>
                                    Sự cố thiết bị đã được kỹ thuật viên xử lý và kiểm định đạt chuẩn vận hành AnchorCare.
                                  </p>
                                </div>
                              </div>
                            )}

                            {/* Card Action Footer */}
                            <div className="claim-card-footer">
                              <button
                                type="button"
                                className="apple-pill-btn secondary btn-sm"
                                onClick={() => setSelectedClaimDetail(claim)}
                              >
                                <Eye size={13} />
                                <span>Xem tiến trình xử lý</span>
                              </button>

                              <a href="tel:0367744634" className="claim-hotline-link">
                                <Phone size={13} />
                                <span>Hotline kỹ thuật 24/7: 0367 744 634</span>
                              </a>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    /* Reassuring Apple Protection Peace Card */
                    <div className="apple-warranty-peace-card">
                      <div className="peace-card-icon-wrap">
                        <ShieldCheck size={36} color="#30d158" />
                      </div>
                      <div className="peace-card-body">
                        <div className="peace-badge">
                          <CheckCircle2 size={13} color="#30d158" />
                          <span>Hệ thống vận hành an toàn</span>
                        </div>
                        <h3>Tất cả thiết bị đang hoạt động bình thường</h3>
                        <p>
                          Bạn chưa gửi yêu cầu khiếu nại nào. Toàn bộ thiết bị AnchorBox của bạn đang được giám sát và bảo vệ theo tiêu chuẩn dịch vụ AnchorCare chính hãng 24 tháng.
                        </p>
                        <div className="peace-perks-grid">
                          <div className="peace-perk">
                            <strong>⚡ Phản hồi 2 giờ</strong>
                            <span>Tiếp nhận trực tuyến 24/7</span>
                          </div>
                          <div className="peace-perk">
                            <strong>🏠 Tại nhà trong 24h</strong>
                            <span>Kỹ thuật viên kiểm tra tận nơi</span>
                          </div>
                          <div className="peace-perk">
                            <strong>🔄 Thay mới 100%</strong>
                            <span>Linh kiện chính hãng miễn phí</span>
                          </div>
                        </div>
                      </div>
                      <div className="peace-card-action">
                        <button
                          type="button"
                          className="apple-pill-btn primary"
                          onClick={() => {
                            setClaimModalWarrantyId('');
                            setClaimModalOpen(true);
                          }}
                        >
                          <Plus size={14} />
                          <span>Báo sự cố nếu cần hỗ trợ</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ==============================================
                  SUBTAB 2: GÓI BẢO HÀNH THIẾT BỊ (APPLE CARE CARDS)
                  ============================================== */}
              {warrantySubTab === 'packages' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <ResourceState {...warrantiesRes} />
                  {warrantiesRes.data?.content && warrantiesRes.data.content.length > 0 ? (
                    <div className="apple-warranty-cards-grid">
                      {warrantiesRes.data.content.map(war => {
                        const isEligible = warrantyEligible(war);
                        const { used, remaining } = usage(war, vietnamToday());
                        const remainingDays = remaining;
                        const remainingPercent = Math.max(0, Math.min(100, Math.round((1 - used) * 100)));

                        return (
                          <div key={war.id} className={`apple-warranty-card ${isEligible ? 'is-active' : 'is-expired'}`}>
                            <div className="war-card-top">
                              <div className="war-card-device">
                                <div className="war-card-icon">
                                  <Package size={22} color="#0071e3" />
                                </div>
                                <div>
                                  <h3 className="war-card-title">AnchorBox Smart Lock</h3>
                                  <div className="war-serial-row">
                                    <span className="war-serial-code">SN: {war.serialNumber}</span>
                                    <button
                                      type="button"
                                      className="war-copy-btn"
                                      onClick={() => handleCopy(war.serialNumber)}
                                      title="Sao chép số Serial"
                                    >
                                      {copiedText === war.serialNumber ? <Check size={11} color="#30d158" /> : <Copy size={11} />}
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <span className={`apple-status-pill ${isEligible ? 'status-completed' : 'status-cancelled'}`}>
                                <span className="status-dot" />
                                {isEligible ? 'Đang bảo vệ 24T' : 'Hết hạn bảo hành'}
                              </span>
                            </div>

                            {/* Warranty Timeline Progress Bar */}
                            <div className="war-progress-section">
                              <div className="war-progress-bar-bg">
                                <div
                                  className="war-progress-bar-fill"
                                  style={{ width: `${remainingPercent}%` }}
                                />
                              </div>
                              <div className="war-progress-labels">
                                <span className="war-date-label">
                                  Kích hoạt: {displayDate(war.startDate)}
                                </span>
                                <span className="war-remaining-badge">
                                  <Clock size={12} />
                                  {isEligible ? `Còn ${remainingDays} ngày bảo vệ` : 'Đã kết thúc'}
                                </span>
                                <span className="war-date-label">
                                  Hết hạn: {displayDate(war.endDate)}
                                </span>
                              </div>
                            </div>

                            {/* Coverage Perks */}
                            <div className="war-perks-row">
                              <div className="war-perk-item">
                                <ShieldCheck size={13} color="#0071e3" />
                                <span>AnchorCare 24 tháng</span>
                              </div>
                              <div className="war-perk-item">
                                <Wrench size={13} color="#30d158" />
                                <span>Linh kiện chính hãng 1-1</span>
                              </div>
                              <div className="war-perk-item">
                                <CheckCircle2 size={13} color="#0071e3" />
                                <span>Hỗ trợ kỹ thuật tại nhà</span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="war-card-actions">
                              {isEligible && (
                                <button
                                  type="button"
                                  className="apple-pill-btn primary btn-sm"
                                  onClick={() => {
                                    setClaimModalWarrantyId(war.id);
                                    setClaimModalOpen(true);
                                  }}
                                >
                                  <Wrench size={13} />
                                  <span>Báo sự cố thiết bị này</span>
                                </button>
                              )}
                              <Link
                                to={`/warranty?serial=${encodeURIComponent(war.serialNumber)}`}
                                className="apple-pill-btn secondary btn-sm"
                              >
                                <Search size={13} />
                                <span>Tra cứu phiếu bảo hành</span>
                              </Link>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="apple-claims-empty-state">
                      <div className="empty-claim-icon">
                        <ShieldCheck size={32} color="#94a3b8" />
                      </div>
                      <h3>Chưa có gói bảo hành nào được kích hoạt</h3>
                      <p>Gói bảo hành điện tử chính hãng sẽ tự động kích hoạt sau khi kỹ thuật viên hoàn tất nghiệm thu lắp đặt hộp AnchorBox tại nhà bạn.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </main>
      </div>

      {/* ====================================================
          MODAL: YÊU CẦU BẢO HÀNH & KHIẾU NẠI (APPLE CLAIM SHEET)
          ==================================================== */}
      {claimModalOpen && (
        <ClaimSheet
          eligible={warrantiesRes.data?.content.filter(warrantyEligible) || []}
          loading={warrantiesRes.loading}
          initialWarrantyId={claimModalWarrantyId || (warrantiesRes.data?.content.find(warrantyEligible)?.id || '')}
          onClose={() => {
            setClaimModalOpen(false);
            setClaimModalWarrantyId('');
          }}
          onSubmitted={() => {
            claimsRes.retry();
            warrantiesRes.retry();
            setWarrantySubTab('claims');
          }}
        />
      )}

      {/* ====================================================
          MODAL 1: CHỈNH SỬA HỒ SƠ CÁ NHÂN
          ==================================================== */}
      {editProfileOpen && (
        <div className="apple-modal-overlay" onClick={() => !profileSaving && setEditProfileOpen(false)}>
          <div className="apple-modal-card" onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3>Chỉnh sửa thông tin hồ sơ</h3>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setEditProfileOpen(false)}
                disabled={profileSaving}
              >
                <X size={16} />
              </button>
            </div>

            {profileMsg && (
              <div className="auth-alert success" style={{ marginBottom: 16 }}>
                <CheckCircle2 size={16} />
                <span>{profileMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} noValidate>
              <div className="auth-input-group">
                <label className="auth-input-label">Họ và tên</label>
                <div className="auth-input-wrapper">
                  <UserRound className="auth-input-icon" size={17} />
                  <input
                    type="text"
                    className="auth-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Số điện thoại liên lạc</label>
                <div className="auth-input-wrapper">
                  <Phone className="auth-input-icon" size={17} />
                  <input
                    type="tel"
                    className="auth-input"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="0912 345 678"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                <button
                  type="button"
                  className="apple-pill-btn secondary"
                  onClick={() => setEditProfileOpen(false)}
                  disabled={profileSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="apple-pill-btn primary"
                  disabled={profileSaving}
                >
                  {profileSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Đang lưu…</span>
                    </>
                  ) : (
                    <span>Lưu thay đổi</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 2: ĐỔI MẬT KHẨU QUA OTP
          ==================================================== */}
      {changePasswordOtpOpen && (
        <div className="apple-modal-overlay" onClick={() => !otpBusy && setChangePasswordOtpOpen(false)}>
          <div className="apple-modal-card" onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3>Đổi mật khẩu tài khoản</h3>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setChangePasswordOtpOpen(false)}
                disabled={otpBusy}
              >
                <X size={16} />
              </button>
            </div>

            {otpError && (
              <div className="auth-alert error" style={{ marginBottom: 14 }}>
                <AlertCircle size={16} />
                <span>{otpError}</span>
              </div>
            )}

            {otpSuccess && (
              <div className="auth-alert success" style={{ marginBottom: 14 }}>
                <CheckCircle2 size={16} />
                <span>{otpSuccess}</span>
              </div>
            )}

            <form onSubmit={handleVerifyOtpAndChangePassword} noValidate>
              <div style={{ background: '#f5f5f7', padding: '12px 14px', borderRadius: '14px', marginBottom: 16 }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#6e6e73' }}>
                  Mã OTP 6 số đã được gửi tới email <strong>{displayEmail}</strong>. Mã giả lập trong phiên: <strong>{generatedOtp}</strong>
                </p>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Mã OTP xác thực (6 số)</label>
                <div className="auth-input-wrapper">
                  <KeyRound className="auth-input-icon" size={17} />
                  <input
                    type="text"
                    maxLength={6}
                    className="auth-input"
                    placeholder="Nhập 6 số..."
                    value={inputOtp}
                    onChange={e => setInputOtp(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Mật khẩu mới</label>
                <div className="auth-input-wrapper">
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Tối thiểu 8 ký tự"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 14 }}
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Xác nhận mật khẩu mới</label>
                <div className="auth-input-wrapper">
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Nhập lại mật khẩu mới"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    style={{ paddingLeft: 14 }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
                <button
                  type="button"
                  className="apple-pill-btn secondary"
                  onClick={() => setChangePasswordOtpOpen(false)}
                  disabled={otpBusy}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="apple-pill-btn primary"
                  disabled={otpBusy}
                >
                  {otpBusy ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Đang cập nhật…</span>
                    </>
                  ) : (
                    <span>Xác nhận đổi mật khẩu</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 3: THÊM / CHỈNH SỬA ĐỊA CHỈ
          ==================================================== */}
      {addressModal.open && (
        <div className="apple-modal-overlay" onClick={() => !addressSaving && setAddressModal({ open: false })}>
          <div className="apple-modal-card" onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3>{addressModal.address ? 'Chỉnh sửa địa chỉ' : 'Thêm địa chỉ giao hàng mới'}</h3>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setAddressModal({ open: false })}
                disabled={addressSaving}
              >
                <X size={16} />
              </button>
            </div>

            {addressError && (
              <div className="auth-alert error" style={{ marginBottom: 14 }}>
                <AlertCircle size={16} />
                <span>{addressError}</span>
              </div>
            )}

            <form onSubmit={handleSaveAddress} noValidate>
              <div className="auth-input-group">
                <label className="auth-input-label">Tên địa chỉ (VD: Nhà riêng, Văn phòng)</label>
                <input
                  type="text"
                  className="auth-input"
                  style={{ paddingLeft: 14 }}
                  value={addressForm.label}
                  onChange={e => setAddressForm({ ...addressForm, label: e.target.value })}
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="auth-input-group">
                  <label className="auth-input-label">Tên người nhận</label>
                  <input
                    type="text"
                    className="auth-input"
                    style={{ paddingLeft: 14 }}
                    value={addressForm.recipientName}
                    onChange={e => setAddressForm({ ...addressForm, recipientName: e.target.value })}
                    required
                  />
                </div>
                <div className="auth-input-group">
                  <label className="auth-input-label">Số điện thoại</label>
                  <input
                    type="tel"
                    className="auth-input"
                    style={{ paddingLeft: 14 }}
                    value={addressForm.phone}
                    onChange={e => setAddressForm({ ...addressForm, phone: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Địa chỉ chi tiết (Số nhà, đường, phường/xã, quận/huyện)</label>
                <input
                  type="text"
                  className="auth-input"
                  style={{ paddingLeft: 14 }}
                  value={addressForm.addressLine}
                  onChange={e => setAddressForm({ ...addressForm, addressLine: e.target.value })}
                  required
                />
              </div>

              <div className="auth-input-group">
                <label className="auth-input-label">Ghi chú lắp đặt cho kỹ thuật viên (tùy chọn)</label>
                <input
                  type="text"
                  className="auth-input"
                  style={{ paddingLeft: 14 }}
                  placeholder="VD: Lắp cạnh cổng chính, có ổ điện cách 2m..."
                  value={addressForm.installationNote || ''}
                  onChange={e => setAddressForm({ ...addressForm, installationNote: e.target.value })}
                />
              </div>

              <div style={{ marginTop: 12, marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '13px' }}>
                  <input
                    type="checkbox"
                    checked={addressForm.isDefault}
                    onChange={e => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                    style={{ accentColor: '#0071e3', width: 16, height: 16 }}
                  />
                  <span>Đặt làm địa chỉ giao hàng mặc định</span>
                </label>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                <button
                  type="button"
                  className="apple-pill-btn secondary"
                  onClick={() => setAddressModal({ open: false })}
                  disabled={addressSaving}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="apple-pill-btn primary"
                  disabled={addressSaving}
                >
                  {addressSaving ? (
                    <>
                      <Loader2 size={15} className="animate-spin" />
                      <span>Đang lưu…</span>
                    </>
                  ) : (
                    <span>Lưu địa chỉ</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 4: XÁC NHẬN XÓA ĐỊA CHỈ
          ==================================================== */}
      {deleteAddressId && (
        <div className="apple-modal-overlay" onClick={() => setDeleteAddressId(null)}>
          <div className="apple-modal-card" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <h3>Xóa địa chỉ này?</h3>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setDeleteAddressId(null)}
              >
                <X size={16} />
              </button>
            </div>
            <p style={{ fontSize: '13.5px', color: '#6e6e73', lineHeight: 1.5, margin: '0 0 20px' }}>
              Bạn có chắc chắn muốn xóa địa chỉ này khỏi sổ địa chỉ của AnchorBox ID không? Thao tác này không thể hoàn tác.
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="apple-pill-btn secondary"
                onClick={() => setDeleteAddressId(null)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="apple-pill-btn danger"
                onClick={() => handleDeleteAddress(deleteAddressId)}
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 5: CHI TIẾT ĐƠN HÀNG (ORDER DETAIL SHEET)
          ==================================================== */}
      {selectedOrder && (
        <div className="apple-modal-overlay" onClick={() => setSelectedOrder(null)}>
          <div className="apple-modal-card" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Đơn hàng #{selectedOrder.id.slice(0, 8)}</h3>
                <span style={{ fontSize: '12.5px', color: '#86868b' }}>
                  Đặt ngày {displayDate(selectedOrder.createdAt)}
                </span>
              </div>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setSelectedOrder(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, margin: '16px 0 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #f0f0f4' }}>
                <span style={{ color: '#6e6e73', fontSize: '13px' }}>Trạng thái đơn:</span>
                <span className={`apple-status-pill status-${selectedOrder.status}`}>
                  {statusLabel(selectedOrder.status)}
                </span>
              </div>

              <div>
                <span style={{ color: '#6e6e73', fontSize: '13px', display: 'block', marginBottom: 8 }}>Sản phẩm trong đơn:</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {selectedOrder.items?.map((it, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', background: '#f5f5f7', padding: '10px 14px', borderRadius: 12 }}>
                      <div>
                        <strong>{it.productName}</strong>
                        <div style={{ fontSize: '12px', color: '#86868b' }}>Số lượng: {it.quantity}</div>
                      </div>
                      <div style={{ fontWeight: 700 }}>{money(it.subtotal || it.unitPrice * it.quantity)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, borderTop: '1px solid #f0f0f4', fontSize: '15px' }}>
                <span>Tổng giá trị đơn hàng:</span>
                <strong style={{ color: '#0071e3', fontSize: '17px' }}>{money(selectedOrder.total)}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Link
                to={`/account/orders/${selectedOrder.id}/invoice`}
                className="apple-pill-btn secondary"
              >
                <Printer size={14} />
                <span>In hóa đơn</span>
              </Link>
              <Link
                to={`/order-tracking`}
                className="apple-pill-btn primary"
              >
                Tra cứu tiến trình →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL 6: THÔNG SỐ KỸ THUẬT THIẾT BỊ (SPECS SHEET)
          ==================================================== */}
      {selectedDevice && (
        <div className="apple-modal-overlay" onClick={() => setSelectedDevice(null)}>
          <div className="apple-modal-card" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>{selectedDevice.productName || 'AnchorBox Smart Lock'}</h3>
                <span className="apple-code-badge" style={{ marginTop: 4 }}>
                  Serial: {selectedDevice.serialNumber}
                </span>
              </div>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setSelectedDevice(null)}
              >
                <X size={16} />
              </button>
            </div>

            <div className="apple-grouped-settings" style={{ margin: '16px 0 16px' }}>
              <div className="apple-settings-row">
                <span className="apple-row-label">Cảm biến cân nặng</span>
                <span className="apple-row-value">{selectedDevice.hasWeightSensor ? 'Loadcell 4 điểm (Chính xác ±50g)' : 'Không có'}</span>
              </div>
              <div className="apple-settings-row">
                <span className="apple-row-label">Cơ cấu khóa</span>
                <span className="apple-row-value">Khóa Solenoid 250kg (Điều khiển độc quyền qua App)</span>
              </div>
              <div className="apple-settings-row">
                <span className="apple-row-label">Chuẩn chống nước</span>
                <span className="apple-row-value">IP65 Chống nước mưa ngoài trời</span>
              </div>
              <div className="apple-settings-row">
                <span className="apple-row-label">Bảo hành chính hãng</span>
                <span className="apple-row-value">{selectedDevice.warrantyStatus === 'active' ? 'Còn hiệu lực 24 tháng' : 'Đã đăng ký'}</span>
              </div>
            </div>

            {/* Shared Members in Modal */}
            <div style={{ background: '#f8f8fa', padding: '12px 14px', borderRadius: 14, marginBottom: 20 }}>
              <div style={{ fontSize: '12.5px', fontWeight: 700, color: '#1d1d1f', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Users size={14} color="#0071e3" />
                <span>Tài khoản được chia sẻ quyền điều khiển ({selectedDevice.sharedMembers?.length || 0})</span>
              </div>
              {selectedDevice.sharedMembers && selectedDevice.sharedMembers.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {selectedDevice.sharedMembers.map((m, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#ffffff', padding: '6px 10px', borderRadius: 8, fontSize: '12px' }}>
                      <span style={{ fontWeight: 600 }}>{m.fullName || m.email}</span>
                      <span style={{ color: '#0071e3', fontSize: '11px', fontWeight: 700 }}>
                        {m.accessLevel === 'full_control' ? 'Toàn quyền' : 'Chỉ xem'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: '12px', color: '#86868b' }}>
                  Chưa chia sẻ với tài khoản nào. Sử dụng AnchorBox App trên điện thoại để mời người thân cùng điều khiển mở tủ.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="apple-pill-btn secondary"
                onClick={() => setSelectedDevice(null)}
              >
                Đóng
              </button>
              <Link
                to={`/account/devices/${selectedDevice.id}`}
                className="apple-pill-btn primary"
              >
                Xem chi tiết thiết bị đầy đủ →
              </Link>
            </div>
          </div>
        </div>
      )}


      {/* ====================================================
          MODAL: CHI TIẾT TIẾN TRÌNH YÊU CẦU BẢO HÀNH
          ==================================================== */}
      {selectedClaimDetail && (
        <div className="apple-modal-overlay" onClick={() => setSelectedClaimDetail(null)}>
          <div className="apple-modal-card" style={{ maxWidth: 620 }} onClick={e => e.stopPropagation()}>
            <div className="apple-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Tiến trình xử lý yêu cầu bảo hành</h3>
                <span style={{ fontSize: '12px', color: '#86868b' }}>
                  Mã phiếu: #{selectedClaimDetail.id.slice(0, 8).toUpperCase()} • Serial: {selectedClaimDetail.serialNumber}
                </span>
              </div>
              <button
                type="button"
                className="apple-modal-close-btn"
                onClick={() => setSelectedClaimDetail(null)}
              >
                <X size={16} />
              </button>
            </div>

            {/* Stepper Timeline 4 bước */}
            <div className="claim-timeline-stepper">
              {[
                { key: 'new', label: '1. Tiếp nhận', desc: 'Đã ghi nhận yêu cầu', done: true },
                { key: 'assigned', label: '2. Phân công', desc: 'Đã chuyển kỹ thuật viên', done: ['assigned', 'in_progress', 'resolved'].includes(selectedClaimDetail.status) },
                { key: 'in_progress', label: '3. Kiểm tra & Sửa', desc: 'KTV liên hệ & xử lý', done: ['in_progress', 'resolved'].includes(selectedClaimDetail.status) },
                { key: 'resolved', label: '4. Hoàn tất', desc: 'Nghiệm thu đạt chuẩn', done: selectedClaimDetail.status === 'resolved' }
              ].map((step, idx) => (
                <div key={idx} className={`timeline-step-node ${step.done ? 'is-done' : ''} ${selectedClaimDetail.status === 'rejected' && idx > 0 ? 'is-rejected' : ''}`}>
                  <div className="step-circle">
                    {step.done ? <Check size={12} /> : idx + 1}
                  </div>
                  <div className="step-text">
                    <span className="step-label">{step.label}</span>
                    <span className="step-sub">{step.desc}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Details Box */}
            <div className="claim-modal-body">
              <div className="claim-modal-detail-row">
                <span className="detail-key">Thời gian gửi:</span>
                <span className="detail-val">{displayDate(selectedClaimDetail.createdAt)}</span>
              </div>
              {selectedClaimDetail.resolvedAt && (
                <div className="claim-modal-detail-row">
                  <span className="detail-key">Thời gian hoàn tất:</span>
                  <span className="detail-val">{displayDate(selectedClaimDetail.resolvedAt)}</span>
                </div>
              )}
              <div className="claim-modal-detail-row">
                <span className="detail-key">Trạng thái hiện tại:</span>
                <span className="detail-val">
                  <strong>{claimLabels[selectedClaimDetail.status] || selectedClaimDetail.status}</strong>
                </span>
              </div>

              <div style={{ marginTop: 14 }}>
                <span className="detail-key" style={{ display: 'block', marginBottom: 6 }}>Nội dung sự cố:</span>
                <div style={{ background: '#f5f5f7', padding: '12px 14px', borderRadius: 12, fontSize: '13px', color: '#1d1d1f', lineHeight: 1.5 }}>
                  {selectedClaimDetail.description}
                </div>
              </div>

              {selectedClaimDetail.images && selectedClaimDetail.images.length > 0 && (
                <div style={{ marginTop: 14 }}>
                  <span className="detail-key" style={{ display: 'block', marginBottom: 6 }}>Ảnh minh chứng:</span>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {selectedClaimDetail.images.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt="Ảnh minh chứng"
                        style={{ width: 72, height: 72, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0', cursor: 'pointer' }}
                        onClick={() => setLightboxImage(img)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {selectedClaimDetail.status === 'rejected' && selectedClaimDetail.rejectionReason && (
                <div style={{ marginTop: 14, background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 12, padding: '12px 14px', color: '#b91c1c', fontSize: '13px' }}>
                  <strong>Lý do từ chối:</strong> {selectedClaimDetail.rejectionReason}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
              <a href="tel:0367744634" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '13px', color: '#0071e3', textDecoration: 'none', fontWeight: 600 }}>
                <Phone size={14} />
                <span>Hotline hỗ trợ: 0367 744 634</span>
              </a>
              <button
                type="button"
                className="apple-pill-btn secondary"
                onClick={() => setSelectedClaimDetail(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL FOR ZOOMED IMAGES */}
      {lightboxImage && (
        <div className="apple-modal-overlay" style={{ zIndex: 11000 }} onClick={() => setLightboxImage(null)}>
          <div style={{ position: 'relative', maxWidth: '90vw', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <img
              src={lightboxImage}
              alt="Ảnh phóng to"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 16, boxShadow: '0 20px 50px rgba(0,0,0,0.5)' }}
            />
            <button
              type="button"
              className="apple-modal-close-btn"
              style={{ position: 'absolute', top: -14, right: -14, background: '#1d1d1f', color: '#fff', border: '2px solid #fff' }}
              onClick={() => setLightboxImage(null)}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

    </section>
  );
}

export default AccountHome;
