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
  Check,
  ChevronRight,
  Settings,
  Award,
  Clock,
  ShoppingBag,
  Save,
  UserCircle
} from "lucide-react";
import { usersApi } from "@/api/index.js";
import { toast } from "sonner";

export default function ProfileSidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
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
    username: "",
  });

  useEffect(() => {
    if (user) {
      const nameParts = user.name?.split(" ") || [];
      setFormData({
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: user.email || "",
        phone: user.phone || "",
        username: user.username || user.email?.split("@")[0] || "",
      });
    }
  }, [user]);

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

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      const updateData = {
        name: `${formData.firstName} ${formData.lastName}`.trim(),
        email: formData.email,
        phone: formData.phone,
      };
      
      await usersApi.update(user.id, updateData);
      
      const updatedUser = { ...user, ...updateData, name: updateData.name };
      localStorage.setItem("ims_user", JSON.stringify(updatedUser));
      
      toast.success("Profile updated successfully!");
      setIsEditing(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
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
    navigate("/staff/change-password");
    onClose();
  };

  const stats = [
    { label: "Total Orders", value: "156", icon: ShoppingBag, color: "bg-blue-100 text-blue-600" },
    { label: "Completion", value: "98%", icon: Award, color: "bg-green-100 text-green-600" },
    { label: "Active Days", value: "245", icon: Clock, color: "bg-purple-100 text-purple-600" },
  ];

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
        {/* Header - Fixed */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
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
                      {formData.firstName?.charAt(0) || user?.name?.charAt(0) || "U"}
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
            </div>

            {/* User Info - View Mode */}
            {!isEditing ? (
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Personal Information</h3>
                    <button
                      onClick={() => setIsEditing(true)}
                      className="text-sm text-blue-600 hover:text-blue-700"
                    >
                      Edit Profile
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
                    <div className="flex items-center gap-3">
                      <UserCircle className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">Role</p>
                        <p className="text-sm font-medium text-blue-600">Staff Member</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="rounded-lg bg-gray-50 p-4">
                  <h3 className="font-medium text-gray-900 mb-3">Activity Stats</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {stats.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className={`mx-auto w-8 h-8 rounded-full ${stat.color} flex items-center justify-center mb-2`}>
                          <stat.icon className="h-4 w-4" />
                        </div>
                        <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                        <p className="text-xs text-gray-500">{stat.label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Role Info */}
                <div className="rounded-lg bg-blue-50 p-4">
                  <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Staff Access</span>
                  </div>
                  <p className="text-xs text-blue-700 mt-1">
                    Full access to orders, customers, deliveries, and credit accounts.
                  </p>
                </div>
              </div>
            ) : (
              // Edit Mode
              <div className="space-y-4">
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-medium text-gray-900">Edit Profile</h3>
                    <button
                      onClick={() => setIsEditing(false)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-gray-700">First Name</label>
                      <input
                        type="text"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="First name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Last Name</label>
                      <input
                        type="text"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Last name"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Email Address</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-700">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="+977 9812345678"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer Buttons - Fixed at bottom */}
        <div className="border-t border-gray-200 p-4 shrink-0 bg-white">
          {isEditing ? (
            <button
              onClick={handleSaveProfile}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Changes
            </button>
          ) : (
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
            WaterFlow v2.0.0 • Staff Panel
          </p>
        </div>
      </div>
    </>
  );
}