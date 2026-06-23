
import { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    axios.get('/api/auth/me').then(res => {
      if (res.data.user) setUser(res.data.user);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const res = await axios.post('/api/auth/login', { email, password });
    if (res.data.user) setUser(res.data.user);
    return res.data;
  };

  const signup = async (email, password, referralCode) => {
    const res = await axios.post('/api/auth/signup', { email, password, referralCode });
    if (res.data.user) setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    await axios.post('/api/auth/logout');
    setUser(null);
    router.push('/login');
  };

  const isVip = user?.vip === true;
  const isSubscriber = user?.subscription === true || isVip;

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading, isSubscribed: isSubscriber, isVip }}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthGuard({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const publicPaths = ['/login', '/signup'];

  useEffect(() => {
    if (!loading && !user && !publicPaths.includes(router.pathname)) {
      router.push('/login');
    }
  }, [loading, user, router.pathname]);

  if (loading) return null;
  if (!user && !publicPaths.includes(router.pathname)) return null;
  return children;
}

export const useAuth = () => useContext(AuthContext);
