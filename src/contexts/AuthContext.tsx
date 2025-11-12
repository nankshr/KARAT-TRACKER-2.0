
import React, { createContext, useContext, useState, useEffect } from 'react';
import postgrest, { getToken, PostgRESTError, decodeJWT, isTokenExpired, getSessionId } from '@/lib/postgrestClient';

interface User {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Idle timeout: 30 minutes of inactivity
  const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
  let idleTimer: NodeJS.Timeout | null = null;
  let refreshTimer: NodeJS.Timeout | null = null;

  useEffect(() => {
    checkSession();
  }, []);

  // Setup idle timeout when user is logged in
  useEffect(() => {
    if (user) {
      setupIdleTimeout();
      setupTokenRefresh();
      return () => {
        if (idleTimer) clearTimeout(idleTimer);
        if (refreshTimer) clearTimeout(refreshTimer);
        removeActivityListeners();
      };
    }
  }, [user]);

  const checkSession = async () => {
    try {
      const token = getToken();

      if (!token) {
        setLoading(false);
        return;
      }

      // Check if token is expired
      if (isTokenExpired(token)) {
        console.warn('Token expired, logging out');
        throw new Error('Token expired');
      }

      // Decode JWT to get user_id
      const payload = decodeJWT(token);
      if (!payload || !payload.user_id) {
        console.error('Invalid token payload');
        throw new Error('Invalid token payload');
      }

      const tokenUserId = payload.user_id;
      const storedSessionId = getSessionId();

      // Verify token by fetching THE SPECIFIC user from the token
      // CRITICAL FIX: Filter by user_id from token, not just .limit(1)
      const { data, error } = await postgrest
        .from('users')
        .select('id,username,role,sessionid')
        .eq('id', tokenUserId)
        .single()
        .execute();

      if (error || !data) {
        console.error('User not found or invalid token:', error);
        throw new Error('Invalid token or user not found');
      }

      // Optional: Validate sessionid matches (extra security layer)
      if (storedSessionId && data.sessionid !== storedSessionId) {
        console.warn('Session ID mismatch - possible session hijacking attempt');
        throw new Error('Session ID mismatch');
      }

      // Check if session was invalidated (sessionid is null means logged out)
      if (!data.sessionid) {
        console.warn('Session invalidated on server');
        throw new Error('Session invalidated');
      }

      setUser({ id: data.id, username: data.username, role: data.role });
    } catch (error) {
      console.error('Session check error:', error);
      // Clear invalid token
      postgrest.setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await postgrest.login(username, password);
      setUser(response.user);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      if (error instanceof PostgRESTError) {
        console.error('PostgREST Error:', error.message);
      }
      return false;
    }
  };

  const logout = async () => {
    try {
      await postgrest.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      if (idleTimer) clearTimeout(idleTimer);
      removeActivityListeners();
    }
  };

  // Idle timeout functions
  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);

    idleTimer = setTimeout(() => {
      console.warn('Session expired due to inactivity');
      logout();
    }, IDLE_TIMEOUT);
  };

  const setupIdleTimeout = () => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer, { passive: true });
    });

    // Start the initial timer
    resetIdleTimer();
  };

  const removeActivityListeners = () => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

    events.forEach(event => {
      document.removeEventListener(event, resetIdleTimer);
    });
  };

  // Token refresh functions
  const setupTokenRefresh = () => {
    const token = getToken();
    if (!token) return;

    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return;

    const expiresAt = payload.exp * 1000; // Convert to milliseconds
    const now = Date.now();
    const timeUntilExpiry = expiresAt - now;

    // Refresh 5 minutes before expiration
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);

    // Only set timer if token hasn't expired and refresh time is positive
    if (refreshTime > 0) {
      refreshTimer = setTimeout(async () => {
        try {
          console.log('Refreshing token...');
          await postgrest.refreshToken();
          console.log('Token refreshed successfully');

          // Setup next refresh cycle
          setupTokenRefresh();
        } catch (error) {
          console.error('Token refresh failed:', error);
          // If refresh fails, log out the user
          await logout();
        }
      }, refreshTime);
    } else {
      // Token is expired or about to expire, logout
      console.warn('Token expired or expiring soon');
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
