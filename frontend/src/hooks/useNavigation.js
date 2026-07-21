// src/hooks/useNavigation.js
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext.jsx";

export function useNavigation() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const getBasePath = () => {
    const role = user?.role;
    if (role === "ADMIN") return "/admin";
    if (role === "MANAGER") return "/manager";
    if (role === "STAFF") return "/staff";
    return "";
  };

  const getRole = () => {
    return user?.role || "STAFF";
  };

  const isAdmin = () => {
    return user?.role === "ADMIN";
  };

  const isManager = () => {
    return user?.role === "MANAGER";
  };

  const isStaff = () => {
    return user?.role === "STAFF";
  };

  const navigateTo = (path) => {
    const basePath = getBasePath();
    // If path already starts with /admin, /manager, or /staff, use it as-is
    if (path.startsWith("/admin") || path.startsWith("/manager") || path.startsWith("/staff")) {
      return navigate(path);
    }
    // Otherwise, prepend the base path
    return navigate(`${basePath}${path}`);
  };

  const navigateToAdmin = (path) => {
    return navigate(`/admin${path}`);
  };

  const navigateToManager = (path) => {
    return navigate(`/manager${path}`);
  };

  const navigateToStaff = (path) => {
    return navigate(`/staff${path}`);
  };

  return { 
    navigateTo, 
    getBasePath, 
    getRole, 
    isAdmin, 
    isManager, 
    isStaff,
    navigateToAdmin,
    navigateToManager,
    navigateToStaff
  };
}