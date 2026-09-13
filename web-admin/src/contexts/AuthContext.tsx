import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabase';
import { Profile, UserRole } from '../types/database';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; role?: UserRole; error?: string }>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserProfile = async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error: profileErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileErr) return null;
      return data as Profile;
    } catch (err) {
      return null;
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          const prof = await fetchUserProfile(session.user.id);

          if (prof?.role === 'customer') {
            await supabase.auth.signOut();
            setError('Tài khoản của bạn không có quyền truy cập hệ thống.');
            setUser(null);
            setProfile(null);
          } else if (prof?.is_locked) {
            await supabase.auth.signOut();
            setError('Tài khoản của bạn đã bị khóa.');
            setUser(null);
            setProfile(null);
          } else {
            setProfile(prof);
          }
        }
      } catch (err) {
        console.error('Initialize auth error:', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const prof = await fetchUserProfile(session.user.id);

        if (prof?.role === 'customer') {
          await supabase.auth.signOut();
          setError('Tài khoản của bạn không có quyền truy cập hệ thống.');
          setUser(null);
          setProfile(null);
        } else if (prof?.is_locked) {
          await supabase.auth.signOut();
          setError('Tài khoản  của bạn đã bị khóa.');
          setUser(null);
          setProfile(null);
        } else {
          setProfile(prof);
          setError(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => authListener.subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    setLoading(true);

    if (!isSupabaseConfigured) {
      setLoading(false);
      const errMsg = 'Supabase chưa được cấu hình. Vui lòng cập nhật file .env.';
      setError(errMsg);
      return { success: false, error: errMsg };
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });

      if (signInError) {
        setError(signInError.message);
        setLoading(false);
        return { success: false, error: signInError.message };
      }

      if (data.user) {
        const prof = await fetchUserProfile(data.user.id);

        if (!prof || prof.role === 'customer') {
          await supabase.auth.signOut();
          const roleErr = 'Tài khoản khách hàng không có quyền truy cập vào hệ thống.';
          setError(roleErr);
          setLoading(false);
          return { success: false, error: roleErr };
        }

        if (prof.is_locked) {
          await supabase.auth.signOut();
          const lockErr = 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.';
          setError(lockErr);
          setLoading(false);
          return { success: false, error: lockErr };
        }

        setUser(data.user);
        setProfile(prof);
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
    if (isSupabaseConfigured) await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setError(null);
  };

  const hasRole = (allowedRoles: UserRole[]): boolean => {
    if (!profile) return false;
    if (profile.role === 'super_admin') return true;
    return allowedRoles.includes(profile.role);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};