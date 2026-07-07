import React, { createContext, useContext, useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import type { User, EmployeeProfile, AuthContextType } from '@/types';
import { supabase } from '@/lib/supabase';
import { employeeStorage, userStorage } from '@/data/storage';
import { getCache, setCache } from '@/lib/cache';
import { 
  isAccountLocked, 
  recordFailedLogin, 
  clearLoginAttempts,
  sanitizeInput,
  isValidEmail 
} from '@/lib/security';

// Cache keys
const USER_CACHE_KEY = 'auth_user';
const PROFILE_CACHE_KEY = 'auth_profile';

// Helper to build a User from Supabase auth user (fallback when DB lookup fails)
const buildUserFromAuth = (authUser: { id: string; email?: string }): User | null => {
  if (!authUser.email) return null;
  return {
    id: 'temp-' + authUser.id,
    authUid: authUser.id,
    email: authUser.email,
    password: '',
    role: 'staff',
    profileId: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// Helper to sync auth user with database (with cache fallback)
const syncAuthUser = async (authUser: { id: string; email?: string }): Promise<User | null> => {
  if (!authUser.id) return null;
  
  // Try cache first
  const cachedUser = getCache<User>(USER_CACHE_KEY + '_' + authUser.id, 30);
  if (cachedUser) {
    return cachedUser;
  }
  
  // Quick DB lookup with short timeout
  const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> => {
    return Promise.race([
      promise.then(v => v as T).catch(() => null),
      new Promise<null>(resolve => setTimeout(() => resolve(null), ms)),
    ]);
  };
  
  const userByAuthUid = await withTimeout(userStorage.getByAuthUid(authUser.id), 1500);
  if (userByAuthUid) {
    setCache(USER_CACHE_KEY + '_' + authUser.id, userByAuthUid);
    return userByAuthUid;
  }
  
  if (authUser.email) {
    const userByEmail = await withTimeout(userStorage.getByEmail(authUser.email), 1500);
    if (userByEmail) {
      if (!userByEmail.authUid) {
        await userStorage.update(userByEmail.id, { authUid: authUser.id });
        userByEmail.authUid = authUser.id;
      }
      setCache(USER_CACHE_KEY + '_' + authUser.id, userByEmail);
      return userByEmail;
    }
  }
  
  // Fallback: build user from auth data so login doesn't fail
  console.warn('[AuthContext] DB lookup failed, using auth fallback');
  const fallbackUser = buildUserFromAuth(authUser);
  if (fallbackUser) {
    setCache(USER_CACHE_KEY + '_' + authUser.id, fallbackUser);
  }
  return fallbackUser;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitialized = useRef(false);

  const loadProfile = useCallback(async (userData: User): Promise<EmployeeProfile | null> => {
    // Try cache first
    const cachedProfile = getCache<EmployeeProfile>(PROFILE_CACHE_KEY + '_' + userData.id, 30);
    if (cachedProfile) {
      setProfile(cachedProfile);
      return cachedProfile;
    }
    
    const employeeProfile = await employeeStorage.getByUserId(userData.id);
    if (employeeProfile) {
      setProfile(employeeProfile);
      setCache(PROFILE_CACHE_KEY + '_' + userData.id, employeeProfile);
      return employeeProfile;
    }
    return null;
  }, []);

  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    const init = async () => {
      try {
        // Fast path: check cache before hitting DB
        const cachedUser = getCache<User>(USER_CACHE_KEY, 30);
        if (cachedUser) {
          setUser(cachedUser);
          await loadProfile(cachedUser);
          setIsLoading(false);
          return;
        }

        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          const mappedUser = await syncAuthUser(authUser);
          if (mappedUser) {
            setUser(mappedUser);
            setCache(USER_CACHE_KEY, mappedUser);
            const employeeProfile = await loadProfile(mappedUser);
            if (employeeProfile?.stationId) {
              localStorage.setItem('currentStationId', employeeProfile.stationId);
            }
          }
        }
      } catch (error) {
        console.error('Auth init error:', error);
      } finally {
        setIsLoading(false);
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        const mappedUser = await syncAuthUser(session.user);
        if (mappedUser) {
          setUser(mappedUser);
          setCache(USER_CACHE_KEY, mappedUser);
          const employeeProfile = await loadProfile(mappedUser);
          if (employeeProfile?.stationId) {
            localStorage.setItem('currentStationId', employeeProfile.stationId);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setCache(USER_CACHE_KEY, null);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    const sanitizedEmail = sanitizeInput(email.toLowerCase().trim());
    
    if (!isValidEmail(sanitizedEmail)) {
      return { success: false, error: 'รูปแบบอีเมลไม่ถูกต้อง' };
    }

    const lockStatus = isAccountLocked(sanitizedEmail);
    if (lockStatus.locked) {
      return { success: false, error: `บัญชีถูกล็อค กรุณารอ ${lockStatus.remainingTime} นาที` };
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: sanitizedEmail, password });

      if (error) {
        recordFailedLogin(sanitizedEmail);
        return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
      }

      if (!data.user) {
        return { success: false, error: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' };
      }

      const mappedUser = await syncAuthUser(data.user);
      if (!mappedUser) {
        return { success: false, error: 'ไม่พบข้อมูลผู้ใช้ในระบบ' };
      }

      clearLoginAttempts(sanitizedEmail);
      setUser(mappedUser);
      setCache(USER_CACHE_KEY, mappedUser);
      
      const employeeProfile = await employeeStorage.getByUserId(mappedUser.id);
      if (employeeProfile) {
        setProfile(employeeProfile);
        setCache(PROFILE_CACHE_KEY + '_' + mappedUser.id, employeeProfile);
        if (employeeProfile.stationId) {
          localStorage.setItem('currentStationId', employeeProfile.stationId);
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ' };
    }
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setCache(USER_CACHE_KEY, null);
  }, []);

  const updateProfile = useCallback((updates: Partial<EmployeeProfile>) => {
    setProfile(prev => prev ? { ...prev, ...updates } : null);
  }, []);

  const isAuthenticated = !!user;

  const value = useMemo<AuthContextType>(() => ({
    user, profile, login, logout, updateProfile, isAuthenticated, isLoading,
  }), [user, profile, login, logout, updateProfile, isAuthenticated, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
