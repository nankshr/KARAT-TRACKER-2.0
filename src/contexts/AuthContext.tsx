
import React, { createContext, useContext, useState, useEffect } from 'react';
import postgrest, { getToken, PostgRESTError } from '@/lib/postgrestClient';

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

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const token = getToken();

      if (token) {
        // Verify token by fetching current user
        // PostgREST will validate the JWT automatically
        const { data, error } = await postgrest.from('users').select('id,username,role').limit(1).execute();

        if (error || !data || data.length === 0) {
          throw new Error('Invalid token');
        }

        setUser(data[0]);
      }
    } catch (error) {
      console.error('Session check error:', error);
      // Clear invalid token
      postgrest.setToken(null);
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
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
