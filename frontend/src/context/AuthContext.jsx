import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('bizpermit_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('bizpermit_access_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const verifySession = async () => {
      const currentToken = localStorage.getItem('bizpermit_access_token');
      if (currentToken) {
        try {
          const res = await authAPI.getProfile();
          if (res.data?.success && res.data?.data) {
            setUser(res.data.data);
            localStorage.setItem('bizpermit_user', JSON.stringify(res.data.data));
          }
        } catch {
          // Token is invalid/expired and refresh failed in interceptor
          setUser(null);
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    verifySession();
  }, []);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    if (response.data?.success) {
      const { user: userData, tokens } = response.data.data;
      localStorage.setItem('bizpermit_access_token', tokens.access_token);
      localStorage.setItem('bizpermit_refresh_token', tokens.refresh_token);
      localStorage.setItem('bizpermit_user', JSON.stringify(userData));
      setUser(userData);
      setToken(tokens.access_token);
      return userData;
    }
    throw new Error(response.data?.error?.message || 'Login failed');
  };

  const register = async (payload) => {
    const response = await authAPI.register(payload);
    if (response.data?.success) {
      const { user: userData, tokens } = response.data.data;
      localStorage.setItem('bizpermit_access_token', tokens.access_token);
      localStorage.setItem('bizpermit_refresh_token', tokens.refresh_token);
      localStorage.setItem('bizpermit_user', JSON.stringify(userData));
      setUser(userData);
      setToken(tokens.access_token);
      return userData;
    }
    throw new Error(response.data?.error?.message || 'Registration failed');
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('bizpermit_refresh_token');
    try {
      if (refreshToken) {
        await authAPI.logout(refreshToken);
      }
    } catch {
      // Best-effort logout
    } finally {
      localStorage.removeItem('bizpermit_access_token');
      localStorage.removeItem('bizpermit_refresh_token');
      localStorage.removeItem('bizpermit_user');
      setUser(null);
      setToken(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user && !!token,
        isLoading,
        login,
        register,
        logout,
        role: user?.role || null,
        isBusinessOwner: user?.role === 'BUSINESS_OWNER',
        isDepartmentOfficer: user?.role === 'DEPARTMENT_OFFICER',
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
