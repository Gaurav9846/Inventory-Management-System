// src/components/layout/ProfileSidebar.jsx
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext.jsx";
import { useNavigate } from "react-router-dom";
import { 
  User, 
  Mail, 
  Phone, 
  LogOut, 
  Camera, 
  X, 
  ChevronRight,
  Settings,
  Save,
  Shield,
  Edit2,
  CheckCircle,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { usersApi } from "@/api/index.js";
import { toast } from "sonner";

export default function ProfileSidebar({ isOpen, onClose }) {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });

  // ✅ Get user role - prioritize user object from context
  const userRole = user?.role || localStorage.getItem("ims_role") || "STAFF";
  const isAdmin = userRole === "ADMIN";
  const isManager = userRole === "MANAGER";
  const isStaff = userRole === "STAFF";

  // ✅ Format role for display
  const displayRole = userRole.charAt(0).toUpperCase() + userRole.slice(1).toLowerCase();

  // ✅ Update form data when user changes
  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(" ") || [];
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // ✅ Reset form when sidebar closes
  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      setImagePreview(null);
      setProfileImage(null);
    }
  }, [isOpen]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5MB");
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast.error("Please upload an image file");
        return;
      }
      
      setProfileImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ ADMIN: Direct save (no approval needed)
  const handleDirectSave = async () => {
    if (!formData.firstName || !formData.email) {
      toast.error("First name and email are required");
      return;
    }

    setLoading(true);
    try {
      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone || "",
      };
      
      console.log("📤 Updating user with data:", updateData);
      
      // ✅ Update in database
      const response = await usersApi.update(user.id, updateData);
      console.log("📥 Response:", response.data);
      
      // ✅ Update AuthContext AND localStorage using updateUser
      updateUser({
        name: updateData.name,
        email: updateData.email,
        phone: updateData.phone,
      });
      
      // ✅ Also update formData to match
      setFormData({
        ...formData,
        phone: updateData.phone,
      });
      
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      
    } catch (error) {
      console.error("❌ Update error:", error);
      toast.error(error.response?.data?.message || "Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    logout();
    navigate("/login");
    toast.success("Logged out successfully");
  };

  const handleChangePassword = () => {
    const path = getChangePasswordPath();
    navigate(path);
    onClose();
  };

  const getChangePasswordPath = () => {
    const roleLower = (localStorage.getItem("ims_role") || user?.role || "STAFF").toLowerCase();
    if (roleLower === "admin") return "/admin/change-password";
    if (roleLower === "manager") return "/manager/change-password";
    return "/staff/change-password";
  };

  const roleColor = {
    ADMIN: "bg-red-100 text-red-700",
    MANAGER: "bg-blue-100 text-blue-700",
    STAFF: "bg-green-100 text-green-700",
  }[userRole] || "bg-gray-100 text-gray-700";

  // ✅ Get initials for avatar
  const getInitials = () => {
    if (formData.firstName) {
      return formData.firstName.charAt(0).toUpperCase();
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return "U";
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <div
        className={`fixed right-0 top-0 z-50 h-full w-full max-w-md bg-white shadow-2xl transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">My Profile</h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center mb-6">
              <div className="relative">
                <div className="h-24 w-24 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center overflow-hidden">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-3xl font-bold text-white">
                      {getInitials()}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 rounded-full bg-blue-600 p-1.5 text-white shadow-lg hover:bg-blue-700 transition-colors"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-xs text-blue-600 hover:text-blue-700"
              >
                Change Photo
              </button>
              {isAdmin ? (
                <p className="text-xs text-green-500 mt-1">✓ You can edit directly</p>
              ) : (
                <p className="text-xs text-gray-400 mt-1">Changes require admin approval</p>
              )}
            </div>

            {/* Role Badge */}
            <div className="flex justify-center mb-4">
              <span className={`text-xs font-medium px-3 py-1 rounded-full ${roleColor}`}>
                <Shield className="h-3 w-3 inline mr-1" />
                {displayRole}
              </span>
            </div>

            {/* ✅ View Mode */}
            {!isEditing && (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Personal Information</h3>
                    {/* ✅ ADMIN: Show Edit button, STAFF/MANAGER: Show Request Changes button */}
                    <button
                      onClick={() => setIsEditing(true)}
                      className={`text-sm flex items-center gap-1 ${
                        isAdmin 
                          ? "text-blue-600 hover:text-blue-700" 
                          : "text-yellow-600 hover:text-yellow-700"
                      }`}
                    >
                      {isAdmin ? (
                        <>
                          <Edit2 className="h-3 w-3" />
                          Edit Profile
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="h-3 w-3" />
                          Request Changes
                        </>
                      )}
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Full Name</p>
                        <p className="text-sm font-medium text-gray-900">{user?.name || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Email Address</p>
                        <p className="text-sm font-medium text-gray-900">{user?.email || "—"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Phone Number</p>
                        <p className="text-sm font-medium text-gray-900">{formData.phone || "—"}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Role Info */}
                <div className={`rounded-lg p-4 ${
                  isAdmin ? "bg-red-50" : 
                  isManager ? "bg-blue-50" : 
                  "bg-green-50"
                }`}>
                  <div className="flex items-center gap-2">
                    <Shield className={`h-4 w-4 ${
                      isAdmin ? "text-red-600" : 
                      isManager ? "text-blue-600" : 
                      "text-green-600"
                    }`} />
                    <span className={`text-sm font-medium ${
                      isAdmin ? "text-red-800" : 
                      isManager ? "text-blue-800" : 
                      "text-green-800"
                    }`}>
                      {displayRole} Access
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${
                    isAdmin ? "text-red-700" : 
                    isManager ? "text-blue-700" : 
                    "text-green-700"
                  }`}>
                    {isAdmin 
                      ? "Full system access with all permissions. You can edit your profile directly."
                      : isManager
                        ? "Full access to orders, customers, deliveries, reports, and staff management. Request changes need admin approval."
                        : "Access to orders, customers, deliveries, and credit accounts. Request changes need admin approval."
                    }
                  </p>
                </div>
              </div>
            )}

            {/* ✅ Edit Mode */}
            {isEditing && (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">
                      {isAdmin ? "Edit Profile" : "Request Profile Change"}
                    </h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>

                  {isAdmin ? (
                    // ✅ ADMIN: Direct Edit Form
                    <div className="space-y-3">
                      <p className="text-sm text-green-600 bg-green-50 p-2 rounded-lg flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        As Admin, you can directly edit profile information.
                      </p>
                      <div>
                        <label className="text-xs font-medium text-gray-700">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter first name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter last name"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Email</label>
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter email address"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Phone</label>
                        <input
                          type="tel"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter phone number"
                        />
                      </div>
                      <button
                        onClick={handleDirectSave}
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    // ✅ STAFF/MANAGER: Request Form
                    <div className="space-y-3">
                      <p className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded-lg flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Your request will be sent to admin for approval.
                      </p>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Field to Change *</label>
                        <select
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          <option value="">Select field...</option>
                          <option value="NAME">Full Name</option>
                          <option value="EMAIL">Email Address</option>
                          <option value="PHONE">Phone Number</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Current Value</label>
                        <input
                          type="text"
                          value={user?.name || ""}
                          disabled
                          className="mt-1 block w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">New Value *</label>
                        <input
                          type="text"
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Enter new value"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700">Reason for Change</label>
                        <textarea
                          rows={2}
                          className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                          placeholder="Why do you want to make this change?"
                        />
                      </div>
                      <button
                        disabled={loading}
                        className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="h-4 w-4" />
                            Submit Request
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons - Fixed at bottom */}
        <div className="border-t border-gray-200 p-4 shrink-0 bg-white">
          {!isEditing && (
            <div className="space-y-2">
              <button
                onClick={handleChangePassword}
                className="flex w-full items-center justify-between rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Settings className="h-4 w-4" />
                  Change Password
                </div>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </button>
              
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-between rounded-lg border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Logout
                </div>
                <ChevronRight className="h-4 w-4 text-red-400" />
              </button>
            </div>
          )}
          
          <p className="mt-3 text-center text-xs text-gray-400">
            IMS v2.0.0 • {displayRole} Panel
          </p>
        </div>
      </div>
    </>
  );
}