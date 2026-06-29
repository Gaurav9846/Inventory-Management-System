// src/pages/manager/ManagerSuppliers.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { suppliersApi } from "@/api/index.js";
import { Card, CardContent } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner.jsx";
import { Search, Plus, Edit, Eye, Star, StarHalf, ChevronLeft, ChevronRight, Filter, X, Package, Factory, Droplet, Box, FlaskConical, Wrench } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatDate } from "@/utils/helpers.js";

const STATUS_COLORS = {
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-700",
  Blacklisted: "bg-red-100 text-red-700",
  Draft: "bg-yellow-100 text-yellow-700",
};

// Raw material categories (must match the categories in your database)
const SUPPLIER_CATEGORIES = [
  { value: "all", label: "All Suppliers", icon: Factory },
  { value: "Plastic Materials", label: "Plastic Materials", icon: Package },
  { value: "Packaging Materials", label: "Packaging Materials", icon: Box },
  { value: "Filtration Equipment", label: "Filtration Equipment", icon: Droplet },
  { value: "Chemicals", label: "Chemicals", icon: FlaskConical },
  { value: "Miscellaneous", label: "Miscellaneous", icon: Wrench },
];

const getCategoryIcon = (category) => {
  const found = SUPPLIER_CATEGORIES.find(c => c.value === category);
  if (found?.icon) return found.icon;
  return Package;
};

export default function ManagerSuppliers() {
  const navigate = useNavigate();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1, limit: 10 });
  const [stats, setStats] = useState({ 
    totalSuppliers: 0, 
    activeSuppliers: 0, 
    pendingPurchaseOrders: 0, 
    outstandingPayments: 0,
    pendingApproval: 0,
    onTrack: 0,
    lowVolume: 0
  });
  const [rawMaterialCategories, setRawMaterialCategories] = useState([]);

  useEffect(() => {
    fetchSuppliers();
    fetchStats();
    fetchRawMaterialCategories();
  }, [pagination.page, search, categoryFilter, statusFilter]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      let response;
      if (categoryFilter !== "all") {
        response = await suppliersApi.getByCategory(categoryFilter);
        setSuppliers(response.data.suppliers || []);
        setPagination({ page: 1, total: response.data.suppliers?.length || 0, pages: 1, limit: 10 });
      } else {
        const params = {
          page: pagination.page,
          limit: pagination.limit,
          ...(search && { search }),
          ...(statusFilter !== "all" && { status: statusFilter }),
        };
        response = await suppliersApi.getAll(params);
        setSuppliers(response.data.suppliers || []);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await suppliersApi.getStats();
      setStats(response.data.stats);
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const fetchRawMaterialCategories = async () => {
    try {
      const response = await suppliersApi.getRawMaterialCategories();
      setRawMaterialCategories(response.data.categories || []);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />);
    }
    if (hasHalfStar) {
      stars.push(<StarHalf key="half" className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="h-3.5 w-3.5 text-gray-300" />);
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  const clearFilters = () => {
    setSearch("");
    setCategoryFilter("all");
    setStatusFilter("all");
    setPagination({ ...pagination, page: 1 });
  };

  const hasFilters = search || categoryFilter !== "all" || statusFilter !== "all";

  const renderCategoryBadges = (categories) => {
    if (!categories || categories.length === 0) return <span className="text-gray-400">—</span>;
    const mainCategory = categories[0];
    const Icon = getCategoryIcon(mainCategory);
    return (
      <div className="flex items-center gap-1">
        <Icon className="h-3.5 w-3.5 text-gray-400" />
        <span className="text-xs">{mainCategory}</span>
        {categories.length > 1 && (
          <Badge variant="secondary" className="text-xs ml-1">+{categories.length - 1}</Badge>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader 
        title="Suppliers" 
        description="Manage supplier relationships and track performance by raw material category"
        actionLabel="Add Supplier"
        actionIcon={Plus}
        onAction={() => navigate("/manager/suppliers/new")}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Suppliers</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalSuppliers || suppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Active Suppliers</p>
            <p className="text-2xl font-bold text-green-600">{stats.activeSuppliers || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Pending POs</p>
            <p className="text-2xl font-bold text-orange-600">{stats.pendingPurchaseOrders || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-gray-500">Total Outstanding</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.outstandingPayments || 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search suppliers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Material Category" />
              </SelectTrigger>
              <SelectContent>
                {SUPPLIER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      <cat.icon className="h-4 w-4 text-gray-400" />
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-red-500">
                <X className="h-4 w-4 mr-1" />
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center"><LoadingSpinner /></div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead>Supplier Name</TableHead>
                    <TableHead>Contact Person</TableHead>
                    <TableHead>Phone / Email</TableHead>
                    <TableHead>Material Categories</TableHead>
                    <TableHead>Payment Terms</TableHead>
                    <TableHead className="text-right">Total Purchases</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suppliers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={11} className="text-center py-12 text-gray-400">
                        No suppliers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    suppliers.map((supplier) => (
                      <TableRow 
                        key={supplier.id} 
                        className="hover:bg-gray-50 cursor-pointer" 
                        onClick={() => navigate(`/manager/suppliers/${supplier.id}`)}
                      >
                        <TableCell className="font-medium">{supplier.name}</TableCell>
                        <TableCell className="text-sm">{supplier.contactPerson || "—"}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="text-sm">{supplier.phone}</p>
                            <p className="text-xs text-gray-400 truncate max-w-[150px]">{supplier.email || "—"}</p>
                          </div>
                        </TableCell>
                        <TableCell>{renderCategoryBadges(supplier.productCategories)}</TableCell>
                        <TableCell className="text-sm">{supplier.paymentTerms || "Net 30"}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(supplier.totalPurchases || 0)}</TableCell>
                        <TableCell className="text-right text-green-600">{formatCurrency(supplier.totalPaid || 0)}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${(supplier.outstandingPayments || 0) > 0 ? "text-red-600" : "text-green-600"}`}>
                            {formatCurrency(supplier.outstandingPayments || 0)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_COLORS[supplier.status] || "bg-gray-100"}>
                            {supplier.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {renderStars(supplier.performanceRating || 4.0)}
                            <span className="text-xs font-medium">{(supplier.performanceRating || 4.0).toFixed(1)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate(`/manager/suppliers/${supplier.id}/edit`)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => navigate(`/manager/suppliers/${supplier.id}`)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
          
          {/* Pagination */}
          {pagination.pages > 1 && categoryFilter === "all" && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <div className="text-sm text-gray-500">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} suppliers
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })} disabled={pagination.page === 1}>
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <span className="px-3 py-1 text-sm bg-gray-100 rounded-md">Page {pagination.page} of {pagination.pages}</span>
                <Button variant="outline" size="sm" onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })} disabled={pagination.page === pagination.pages}>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}