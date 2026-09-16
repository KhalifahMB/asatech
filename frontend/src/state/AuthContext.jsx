import { createContext, useContext, useMemo, useState } from "react";
import * as authService from "../services/authService";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => authService.getCurrentUser());

  const login = async (credentials) => {
    const { user: u } = await authService.login(credentials);
    setUser(u);
    return u;
  };

  /**
   * Register does NOT log the user in — email must be verified first.
   * Returns { requiresVerification, email } on success.
   */
  const register = async (payload) => {
    const result = await authService.register(payload);
    // Do NOT set user — no token is issued until email is verified.
    return result;
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === "admin",
      setUser,
      login,
      register,
      logout,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
