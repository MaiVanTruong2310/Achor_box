import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, clearAllAuthTokens, isSessionExpired, pruneLegacyLocalStorageAuth } from '../services/supabase';
import { Profile, UserRole } from '../types/database';
import { adminRequest, setCachedAdminToken } from '../services/adminRequest';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
  updateProfile: (p: Profile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Tham chiếu bộ đếm thời gian tự động đăng xuất khi token hết hạn
  const sessionExpiryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingProfileFetch = useRef<Promise<Profile | null> | null>(null);
  const profileRef = useRef<Profile | null>(null);

  const updateProfile = (p: Profile | null) => {
    profileRef.current = p;
    setProfile(p);
  };

  const fetchUserProfile = async (userId: string, token?: string): Promise<Profile | null> => {
    if (profileRef.current && profileRef.current.id === userId) {
      return profileRef.current;
    }
    if (pendingProfileFetch.current) {
      return pendingProfileFetch.current;
    }
    pendingProfileFetch.current = (async () => {
      try {
        const p = await adminRequest<any>('/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        if (p.id !== userId) return null;
        const prof: Profile = {
          id: p.id,
          full_name: p.fullName,
          email: p.email,
          phone: p.phone,
          avatar_url: p.avatarUrl,
          default_address: p.defaultAddress,
          role: p.role,
          is_locked: p.isLocked,
          is_2fa_enabled: p.is2faEnabled,
          created_at: p.createdAt,
          updated_at: p.updatedAt
        };
        profileRef.current = prof;
        return prof;
      } catch {
        return null;
      } finally {
        pendingProfileFetch.current = null;
      }
    })();
    return pendingProfileFetch.current;
  };

  /**
   * Xử lý khi phiên làm việc hoặc token bị hết hạn:
   * 1. Hủy bộ đếm thời gian
   * 2. Xóa sạch mọi token trong sessionStorage và localStorage
   * 3. Reset trạng thái người dùng về null
   * 4. Chuyển hướng người dùng về trang /login?expired=true nếu đang ở trang quản trị
   */
  const handleSessionExpired = async (reason: string = 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.') => {
    if (sessionExpiryTimerRef.current) {
      clearTimeout(sessionExpiryTimerRef.current);
      sessionExpiryTimerRef.current = null;
    }

    await clearAllAuthTokens();
    profileRef.current = null;
    setUser(null);
    setProfile(null);
    setError(reason);
    setLoading(false);

    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      const isAdminRoute =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/devices') ||
        pathname.startsWith('/warranties') ||
        pathname.startsWith('/products') ||
        pathname.startsWith('/orders') ||
        pathname.startsWith('/approval-tickets') ||
        pathname.startsWith('/users') ||
        pathname.startsWith('/audit-logs') ||
        pathname.startsWith('/settings') || pathname.startsWith('/customers') || pathname.startsWith('/permissions') || pathname.startsWith('/emails') || pathname.startsWith('/reports') || pathname.startsWith('/system');

      if (isAdminRoute && !pathname.includes('/login')) {
        window.location.href = '/login?expired=true';
      }
    }
  };

  /**
   * Lên lịch tự động đăng xuất và xóa token khi đúng thời điểm expires_at
   */
  const scheduleSessionExpiry = (expiresAtSeconds: number | undefined) => {
    if (sessionExpiryTimerRef.current) {
      clearTimeout(sessionExpiryTimerRef.current);
      sessionExpiryTimerRef.current = null;
    }

    if (!expiresAtSeconds) return;

    const msRemaining = expiresAtSeconds * 1000 - Date.now();
    if (msRemaining <= 0) {
      console.warn('🕒 [Auth] Token đã quá hạn ngay khi kiểm tra. Thu hồi phiên...');
      handleSessionExpired();
      return;
    }

    sessionExpiryTimerRef.current = setTimeout(() => {
      console.warn('🕒 [Auth] Token đã hết thời hạn sử dụng. Đang tự động xóa token và đăng xuất...');
      handleSessionExpired('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }, msRemaining);
  };

  useEffect(() => {
    // 1. Dọn dẹp token cũ còn đọng trong localStorage từ các phiên trước
    pruneLegacyLocalStorageAuth();

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const { data: { session }, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr || !session || !session.user) {
          setUser(null);
          setProfile(null);
          return;
        }

        // Kiểm tra xem token hiện tại đã hết hạn chưa
        if (isSessionExpired(session)) {
          console.warn('⚠️ [Auth] Token lưu trữ đã hết hạn khi mở ứng dụng. Đang xóa sạch token...');
          await handleSessionExpired();
          return;
        }

        // Lên lịch tự động đăng xuất khi token hết hạn
        scheduleSessionExpiry(session.expires_at);

        setUser(session.user);
        const prof = await fetchUserProfile(session.user.id,session.access_token);

        if (prof?.is_locked) {
          await handleSessionExpired('Tài khoản của bạn đã bị khóa.');
        } else if (prof?.role === 'customer') {
          console.warn('⚠️ [Auth] Phát hiện tài khoản khách hàng trên trang quản trị. Đang hủy phiên...');
          await handleSessionExpired('Tài khoản Khách hàng không có quyền truy cập Cổng quản trị.');
        } else {
          updateProfile(prof);
        }
      } catch (err) {
        console.error('Initialize auth error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // 2. Lắng nghe thay đổi trạng thái xác thực từ Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        if (sessionExpiryTimerRef.current) {
          clearTimeout(sessionExpiryTimerRef.current);
          sessionExpiryTimerRef.current = null;
        }
        profileRef.current = null;
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      // Nếu session nhận được đã hết hạn
      if (isSessionExpired(session)) {
        await handleSessionExpired();
        return;
      }

      // Lên lịch đếm ngược hết hạn cho token mới
      scheduleSessionExpiry(session.expires_at);

      if (session.user) {
        setUser(session.user);
        // Tránh gọi lại /auth/me nếu hồ sơ của user hiện tại đã có sẵn trong ref
        if (profileRef.current?.id === session.user.id) {
          setLoading(false);
          return;
        }
        const prof = await fetchUserProfile(session.user.id, session.access_token);

        if (prof?.is_locked) {
          await handleSessionExpired('Tài khoản của bạn đã bị khóa.');
        } else if (prof?.role === 'customer') {
          console.warn('⚠️ [Auth] Phát hiện tài khoản khách hàng trên trang quản trị. Đang hủy phiên...');
          await handleSessionExpired('Tài khoản Khách hàng không có quyền truy cập Cổng quản trị.');
        } else {
          updateProfile(prof);
          setError(null);
        }
      }
      setLoading(false);
    });

    // 3. Lắng nghe sự kiện toàn cục khi API trả về 401 (token hết hạn hoặc không hợp lệ)
    const handleAuthExpiredEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ reason?: string }>;
      const reason = customEvent?.detail?.reason || 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
      handleSessionExpired(reason);
    };
    window.addEventListener('smartbox:auth-expired', handleAuthExpiredEvent);

    // 4. Kiểm tra lại tính hợp lệ của token khi người dùng quay lại tab (sau sleep/inactivity)
    const handleVisibilityOrFocus = async () => {
      if (document.visibilityState === 'visible') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session && isSessionExpired(session)) {
          console.warn('⚠️ [Auth] Phát hiện token hết hạn khi người dùng quay lại tab.');
          await handleSessionExpired();
        }
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      authListener.subscription.unsubscribe();
      window.removeEventListener('smartbox:auth-expired', handleAuthExpiredEvent);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (sessionExpiryTimerRef.current) {
        clearTimeout(sessionExpiryTimerRef.current);
      }
    };
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    const cleanEmail = email.trim();

    // 1. Tuyến đăng nhập tốc độ cao (High-performance fast path) qua Backend /api/auth/login:
    // Backend trực tiếp xác thực với Supabase, lưu session vào Redis và pre-cache token Auth.
    // Loại bỏ hoàn toàn nhiều lượt round-trip HTTPS xuyên biên giới và các lệnh SELECT /auth/me dư thừa.
    try {
      const backendUrl = (import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8080/api').replace(/\/+$/, '');
      const resp = await fetch(`${backendUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });

      if (resp.ok) {
        const loginData = await resp.json();
        if (loginData?.accessToken && loginData?.refreshToken) {
          // BẢO VỆ PHÂN VÙNG: Tuyệt đối không cho tài khoản khách hàng đăng nhập trang quản trị
          if (loginData.role === 'customer') {
            const customerErrMsg = 'Tài khoản Khách hàng không có quyền truy cập Cổng quản trị Anchor Box. Vui lòng đăng nhập tại Cổng Web Shop.';
            setError(customerErrMsg);
            setLoading(false);
            return { success: false, error: customerErrMsg };
          }

          const prof: Profile = {
            id: loginData.userId,
            full_name: loginData.fullName || '',
            email: loginData.email || cleanEmail,
            phone: loginData.phone || '',
            avatar_url: loginData.avatarUrl || '',
            default_address: loginData.defaultAddress || '',
            role: loginData.role,
            is_locked: false,
            is_2fa_enabled: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          // 1. Cập nhật state Profile, User và Token cache NGAY LẬP TỨC để chuyển trang tức thì (<50ms)
          updateProfile(prof);
          setUser({ id: loginData.userId, email: loginData.email, user_metadata: { full_name: loginData.fullName } } as any);
          setCachedAdminToken(loginData.accessToken, loginData.expiresIn || 3600);
          scheduleSessionExpiry(Math.floor(Date.now() / 1000) + (loginData.expiresIn || 3600));

          // 2. Đồng bộ ngầm Supabase session trong background (KHÔNG await để không làm đơ giao diện)
          supabase.auth.setSession({
            access_token: loginData.accessToken,
            refresh_token: loginData.refreshToken
          }).catch((e) => {
            console.warn('[Auth] Không thể đồng bộ session sang Supabase client:', e);
          });

          // 3. Nếu thiếu thông tin phụ (avatar, phone), tải ngầm mà không chặn UI
          if (!loginData.avatarUrl && !loginData.phone) {
            void fetchUserProfile(loginData.userId, loginData.accessToken).then((fullProf) => {
              if (fullProf) updateProfile(fullProf);
            }).catch(() => {});
          }

          setError(null);
          setLoading(false);
          return { success: true, role: prof.role };
        }
      } else if (resp.status === 401 || resp.status === 400) {
        const errJson = await resp.json().catch(() => null);
        const errMsg = errJson?.message || 'Email hoặc mật khẩu không chính xác.';
        setError(errMsg);
        setLoading(false);
        return { success: false, error: errMsg };
      }
    } catch (backendErr) {
      console.warn('[Auth] Backend /auth/login không phản hồi, thử Supabase client fallback:', backendErr);
    }

    // 2. Tuyến dự phòng (Fallback): Supabase direct sign-in
    if (!isSupabaseConfigured) {
      setLoading(false);
      const errMsg = 'Supabase chưa được cấu hình. Vui lòng cập nhật file .env.';
      setError(errMsg);
      return { success: false, error: errMsg };
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return { success: false, error: signInError.message };
      }

      if (data.user) {
        if (isSessionExpired(data.session)) {
          await handleSessionExpired();
          return { success: false, error: 'Token đăng nhập không hợp lệ hoặc đã hết hạn.' };
        }

        const prof = await fetchUserProfile(data.user.id, data.session?.access_token);

        if (!prof) {
          await handleSessionExpired('Không tìm thấy hồ sơ tài khoản. Vui lòng liên hệ hỗ trợ.');
          const roleErr = 'Không tìm thấy hồ sơ tài khoản. Vui lòng liên hệ hỗ trợ.';
          return { success: false, error: roleErr };
        }

        if (prof.is_locked) {
          await handleSessionExpired('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
          const lockErr = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
          return { success: false, error: lockErr };
        }

        if (prof.role === 'customer') {
          await supabase.auth.signOut();
          const customerErrMsg = 'Tài khoản Khách hàng không có quyền truy cập Cổng quản trị Anchor Box. Vui lòng đăng nhập tại Cổng Web Shop.';
          setError(customerErrMsg);
          setLoading(false);
          return { success: false, error: customerErrMsg };
        }

        scheduleSessionExpiry(data.session?.expires_at);

        updateProfile(prof);
        setUser(data.user);
        setError(null);
        setLoading(false);
        return { success: true, role: prof.role };
      }

      setLoading(false);
      return { success: false, error: 'Không tìm thấy thông tin tài khoản.' };
    } catch (err: any) {
      const msg = err.message || 'Lỗi đăng nhập không xác định';
      setError(msg);
      setLoading(false);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    await handleSessionExpired('');
    setError(null);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return allowedRoles.includes(profile.role);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout, hasRole, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
