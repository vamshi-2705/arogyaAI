import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [nurse, setNurse] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Restore session from localStorage
    const storedToken = localStorage.getItem('nurse_token');
    const storedNurse = localStorage.getItem('nurse_data');

    if (storedToken && storedNurse) {
      try {
        setToken(storedToken);
        setNurse(JSON.parse(storedNurse));
      } catch {
        localStorage.removeItem('nurse_token');
        localStorage.removeItem('nurse_data');
      }
    }
    setLoading(false);
  }, []);

  const login = (tokenValue, nurseData) => {
    localStorage.setItem('nurse_token', tokenValue);
    localStorage.setItem('nurse_data', JSON.stringify(nurseData));
    setToken(tokenValue);
    setNurse(nurseData);
  };

  const logout = () => {
    localStorage.removeItem('nurse_token');
    localStorage.removeItem('nurse_data');
    setToken(null);
    setNurse(null);
  };

  return (
    <AuthContext.Provider value={{ nurse, token, loading, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
