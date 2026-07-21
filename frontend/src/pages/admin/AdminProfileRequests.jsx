// src/pages/admin/AdminProfileRequests.jsx
import { useEffect, useState } from "react";
import { profileApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  User,
  Mail,
  Phone,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  Eye,
  Check,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, formatDate } from "@/utils/helpers.js";

export default function AdminProfileRequests() {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchRequests();
  }, [filter, pagination.page, searchTerm]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(filter !== "all" && { status: filter }),
        ...(searchTerm && { search: searchTerm }),
      };
      const response = await profileApi.getAllRequests(params);
      setRequests(response.data.data || []);
      if (response.data.stats) {
        setStats(response.data.stats);
      }
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedRequest) return;
    setProcessing(true);
    try {
      await profileApi.approveRequest(selectedRequest.id, { adminNotes });
      toast.success("Request approved successfully");
      setShowModal(false);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    if (!adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setProcessing(true);
    try {
      await profileApi.rejectRequest(selectedRequest.id, { adminNotes });
      toast.success("Request rejected");
      setShowModal(false);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to reject request");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = {
      PENDING: { label: "Pending", className: "bg-yellow-100 text-yellow-800", icon: Clock },
      APPROVED: { label: "Approved", className: "bg-green-100 text-green-800", icon: CheckCircle },
      REJECTED: { label: "Rejected", className: "bg-red-100 text-red-800", icon: XCircle },
    };
    const item = config[status] || config.PENDING;
    const Icon = item.icon;
    return (
      <Badge className={`${item.className} flex items-center gap-1`}>
        <Icon className="h-3 w-3" />
        {item.label}
      </Badge>
    );
  };

  const getFieldLabel = (field) => {
    const labels = {
      NAME: "Full Name",
      EMAIL: "Email Address",
      PHONE: "Phone Number",
      PROFILE_IMAGE: "Profile Image",
    };
    return labels[field] || field;
  };

  const getFieldIcon = (field) => {
    const icons = {
      NAME: User,
      EMAIL: Mail,
      PHONE: Phone,
      PROFILE_IMAGE: User,
    };
    const Icon = icons[field] || User;
    return <Icon className="h-4 w-4 text-gray-400" />;
  };

  const tabs = [
    { id: "all", label: "All", count: stats.total },
    { id: "PENDING", label: "Pending", count: stats.pending, className: "text-yellow-600" },
    { id: "APPROVED", label: "Approved", count: stats.approved, className: "text-green-600" },
    { id: "REJECTED", label: "Rejected", count: stats.rejected, className: "text-red-600" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Change Requests</h1>
          <p className="text-gray-600 mt-1">Review and manage user profile change requests</p>
        </div>
        <Button onClick={fetchRequests} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <p className="text-xs text-blue-600 font-medium">Total Requests</p>
            <p className="text-2xl font-bold text-blue-700">{stats.total || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="p-4">
            <p className="text-xs text-yellow-600 font-medium">Pending</p>
            <p className="text-2xl font-bold text-yellow-700">{stats.pending || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <p className="text-xs text-green-600 font-medium">Approved</p>
            <p className="text-2xl font-bold text-green-700">{stats.approved || 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <p className="text-xs text-red-600 font-medium">Rejected</p>
            <p className="text-2xl font-bold text-red-700">{stats.rejected || 0}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-2 flex-wrap">
              {tabs.map((tab) => (
                <Button
                  key={tab.id}
                  variant={filter === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFilter(tab.id)}
                  className={filter === tab.id ? "" : tab.className || ""}
                >
                  {tab.label}
                  <Badge variant="secondary" className="ml-1 text-xs">
                    {tab.count}
                  </Badge>
                </Button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search requests..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 w-60"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Requests List */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-8 w-8 mx-auto mb-3 animate-spin text-gray-400" />
              <p className="text-gray-500">Loading requests...</p>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">No requests found</p>
              <p className="text-sm text-gray-400 mt-1">Try changing your filters</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {requests.map((request) => (
                <div key={request.id} className="p-5 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-sm font-medium text-gray-900">
                          {request.user.name}
                        </h3>
                        {getStatusBadge(request.status)}
                        <Badge variant="outline" className="text-xs">
                          {request.user.role}
                        </Badge>
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          {getFieldIcon(request.field)}
                          <span className="text-gray-500">Requested to change</span>
                          <span className="font-medium text-gray-700">{getFieldLabel(request.field)}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-gray-600 ml-6">
                          <span>From: <span className="text-gray-900">{request.currentValue || "—"}</span></span>
                          <span>→</span>
                          <span>To: <span className="font-medium text-blue-600">{request.requestedValue}</span></span>
                        </div>
                        {request.reason && (
                          <p className="text-sm text-gray-500 ml-6 mt-1">
                            Reason: {request.reason}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-400 ml-6 mt-1">
                          <span>Requested {formatDistanceToNow(request.createdAt)} ago</span>
                          <span>•</span>
                          <span>{formatDate(request.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4 shrink-0">
                      {request.status === "PENDING" && (
                        <>
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() => {
                              setSelectedRequest(request);
                              setAdminNotes("");
                              setShowModal(true);
                            }}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50"
                            onClick={() => {
                              setSelectedRequest(request);
                              setAdminNotes("");
                              setShowModal(true);
                            }}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {request.status === "APPROVED" && request.reviewedBy && (
                        <span className="text-xs text-gray-500 self-center">
                          Approved by {request.reviewedBy.name}
                        </span>
                      )}
                      {request.status === "REJECTED" && request.reviewedBy && (
                        <span className="text-xs text-gray-500 self-center">
                          Rejected by {request.reviewedBy.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="px-3 py-1 text-sm bg-gray-100 rounded-md">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
              disabled={pagination.page === pagination.pages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Review Change Request
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">User</p>
                <p className="font-medium">{selectedRequest.user.name}</p>
                <p className="text-sm text-gray-500">{selectedRequest.user.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Field</p>
                <p className="font-medium">{getFieldLabel(selectedRequest.field)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Current Value</p>
                  <p className="font-medium text-gray-700">{selectedRequest.currentValue || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Requested Value</p>
                  <p className="font-medium text-blue-600">{selectedRequest.requestedValue}</p>
                </div>
              </div>
              {selectedRequest.reason && (
                <div>
                  <p className="text-sm text-gray-500">Reason</p>
                  <p className="text-sm text-gray-700">{selectedRequest.reason}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-700">Admin Notes</label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Add notes about your decision..."
                  rows={3}
                  className="mt-1"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={handleApprove}
                disabled={processing}
              >
                {processing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Approve
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Reject
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}