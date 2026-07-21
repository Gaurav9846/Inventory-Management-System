// src/context/AuthContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authApi } from "@/api/index.js";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { 
      const stored = localStorage.getItem("ims_user");
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log("📦 Initial user from localStorage:", parsed);
        return parsed;
      }
      return null;
    } catch { 
      return null; 
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ims_token");
    if (!token) { 
      setLoading(false); 
      return; 
    }
    authApi.me()
      .then(({ data }) => { 
        console.log("📥 User data from /me:", data);
        setUser(data); 
        localStorage.setItem("ims_user", JSON.stringify(data)); 
      })
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
    console.log("📥 Login response user data:", data.user);
    localStorage.setItem("ims_token", data.token);
    localStorage.setItem("ims_user", JSON.stringify(data.user));
    localStorage.setItem("ims_role", data.user.role);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("ims_token");
    localStorage.removeItem("ims_user");
    localStorage.removeItem("ims_role");
    setUser(null);
  }, []);

  // ✅ Update user function - updates both state and localStorage
  const updateUser = useCallback((updatedData) => {
    console.log("🔄 Updating user with:", updatedData);
    const updatedUser = { ...user, ...updatedData };
    console.log("🔄 New user object:", updatedUser);
    setUser(updatedUser);
    localStorage.setItem("ims_user", JSON.stringify(updatedUser));
    return updatedUser;
  }, [user]);

  const isAdmin = user?.role === "ADMIN";
  const isManager = user?.role === "ADMIN" || user?.role === "MANAGER";

  const value = {
    user,
    loading,
    login,
    logout,
    updateUser,
    isAdmin,
    isManager,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    console.warn("⚠️ useAuth must be used inside AuthProvider. Returning default values.");
    return {
      user: null,
      loading: false,
      login: async () => { throw new Error("AuthProvider not initialized"); },
      logout: () => {},
      updateUser: () => {},
      isAdmin: false,
      isManager: false,
    };
  }
  return ctx;
};