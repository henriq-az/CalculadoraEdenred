import { createContext, useContext, useState, useCallback } from 'react';
import * as authService from '../services/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restaura a sessão do localStorage no primeiro render (sem flicker de logout).
  const [empresa, setEmpresa] = useState(() => authService.getStoredEmpresa());
  const [token, setToken]     = useState(() => authService.getToken());

  const login = useCallback(async (credenciais) => {
    const { token, empresa } = await authService.login(credenciais);
    setToken(token);
    setEmpresa(empresa);
    return empresa;
  }, []);

  const logout = useCallback(() => {
    authService.logout();
    setToken(null);
    setEmpresa(null);
  }, []);

  const value = {
    empresa,
    token,
    isAuthenticated: Boolean(token && empresa),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>');
  return ctx;
}
