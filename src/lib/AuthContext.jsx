import { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { api } from '@/api/client';
const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);
  const checkUserAuth = useCallback(async () => {
    setIsLoadingAuth(true);
    try { setUser(await api.auth.me()); setAuthError(null); }
    catch (error) { setUser(null); setAuthError(error.status === 401 ? null : { type: 'unknown', message: error.message }); }
    finally { setAuthChecked(true); setIsLoadingAuth(false); }
  }, []);
  const checkAppState = useCallback(async () => {
    setIsLoadingPublicSettings(true);
    setIsLoadingAuth(true);
    const [settings, account] = await Promise.allSettled([api.app.getPublicSettings(), api.auth.me()]);
    if (settings.status === 'fulfilled') setAppPublicSettings(settings.value);
    if (account.status === 'fulfilled') setUser(account.value);
    else if (account.reason.status === 401) setUser(null);
    const error = settings.status === 'rejected' ? settings.reason : account.status === 'rejected' && account.reason.status !== 401 ? account.reason : null;
    setAuthError(error ? { type:'unknown', message:error.message } : null);
    setAuthChecked(true); setIsLoadingPublicSettings(false); setIsLoadingAuth(false);
  }, []);
  useEffect(() => { checkAppState(); }, [checkAppState]);
  const logout = async (shouldRedirect = true) => { await api.auth.logout(shouldRedirect ? '/' : false); setUser(null); };
  const navigateToLogin = () => api.auth.redirectToLogin(window.location.pathname);
  return <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoadingAuth, isLoadingPublicSettings, authError, authChecked, appPublicSettings, checkUserAuth, checkAppState, logout, navigateToLogin }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth richiede AuthProvider.');
  return context;
}
