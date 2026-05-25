import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/api/index.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(() => {
    try { return JSON.parse(localStorage.getItem("ims_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ims_token");
    if (!token) { setLoading(false); return; }
    authApi.me()
      .then(({ data }) => { setUser(data); localStorage.setItem("ims_user", JSON.stringify(data)); })
      .catch(() => {
        localStorage.removeItem("ims_token");
        localStorage.removeItem("ims_user");
        localStorage.removeItem("ims_role");
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await authApi.login({ email, password });
    localStorage.setItem("ims_token", data.token);
    localStorage.setItem("ims_user",  JSON.stringify(data.user));
    localStorage.setItem("ims_role",  data.user.role);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ims_token");
    localStorage.removeItem("ims_user");
    localStorage.removeItem("ims_role");
    setUser(null);
  }, []);

  const isAdmin   = user?.role === "ADMIN";
  const isManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isManager }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
};
