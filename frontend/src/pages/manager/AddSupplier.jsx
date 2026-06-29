// src/pages/manager/AddSupplier.jsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { suppliersApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { ArrowLeft, Save, FileText, Building2, Phone, Mail, MapPin, CreditCard, Banknote, Package, X, Star, Truck, ClipboardList } from "lucide-react";
import { toast } from "sonner";

// Raw material categories (must match database)
const RAW_MATERIAL_CATEGORIES = [
  { value: "Plastic Materials", label: "Plastic Materials", description: "Empty bottles, jars, caps, plastic components" },
  { value: "Packaging Materials", label: "Packaging Materials", description: "Labels, shrink wrap, cartons, crates" },
  { value: "Filtration Equipment", label: "Filtration Equipment", description: "RO membranes, filter cartridges, UV lamps" },
  { value: "Chemicals", label: "Chemicals", description: "Cleaning chemicals, sanitizers, activated carbon" },
  { value: "Miscellaneous", label: "Miscellaneous", description: "Office supplies, construction materials, repair items" },
];

const PAYMENT_TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD", "Cash", "Credit 30 Days", "Credit 45 Days"];
const STATUS_OPTIONS = ["Active", "Inactive", "Blacklisted"];

export default function AddSupplier() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditing = !!id;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    productCategories: [],
    paymentTerms: "Net 30",
    status: "Active",
    performanceRating: 4.0,
    bankName: "",
    bankAccountNumber: "",
    bankAccountName: "",
    bankBranch: "",
    notes: "",
  });

  useEffect(() => {
    if (isEditing) {
      fetchSupplier();
    }
  }, [id]);

  const fetchSupplier = async () => {
    setLoading(true);
    try {
      const response = await suppliersApi.getById(id);
      const supplier = response.data.supplier;
      setFormData({
        name: supplier.name || "",
        contactPerson: supplier.contactPerson || "",
        phone: supplier.phone || "",
        email: supplier.email || "",
        address: supplier.address || "",
        productCategories: supplier.productCategories || [],
        paymentTerms: supplier.paymentTerms || "Net 30",
        status: supplier.status || "Active",
        performanceRating: supplier.performanceRating || 4.0,
        bankName: supplier.bankName || "",
        bankAccountNumber: supplier.bankAccountNumber || "",
        bankAccountName: supplier.bankAccountName || "",
        bankBranch: supplier.bankBranch || "",
        notes: supplier.notes || "",
      });
    } catch (error) {
      toast.error("Failed to load supplier");
      navigate("/manager/suppliers");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      productCategories: prev.productCategories.includes(category)
        ? prev.productCategories.filter(c => c !== category)
        : [...prev.productCategories, category]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.phone) {
      toast.error("Supplier name and phone are required");
      return;
    }
    
    if (formData.productCategories.length === 0) {
      toast.error("Please select at least one material category");
      return;
    }
    
    setSaving(true);
    try {
      if (isEditing) {
        await suppliersApi.update(id, formData);
        toast.success("Supplier updated successfully");
      } else {
        await suppliersApi.create(formData);
        toast.success("Supplier created successfully");
      }
      navigate("/manager/suppliers");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save supplier");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.name) {
      toast.error("Please enter at least supplier name to save draft");
      return;
    }
    
    setSaving(true);
    try {
      if (isEditing) {
        await suppliersApi.update(id, { ...formData, status: "Draft" });
        toast.success("Supplier draft saved");
      } else {
        await suppliersApi.create({ ...formData, status: "Draft" });
        toast.success("Supplier draft saved");
      }
      navigate("/manager/suppliers");
    } catch (error) {
      toast.error("Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const renderStarRating = () => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleChange("performanceRating", star)}
            className="focus:outline-none"
          >
            <Star
              className={`h-5 w-5 ${
                star <= formData.performanceRating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
        <span className="ml-2 text-sm text-gray-500">
          {formData.performanceRating.toFixed(1)} / 5
        </span>
      </div>
    );
  };

  if (loading) {
    return <div className="flex justify-center py-12">Loading supplier details...</div>;
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/manager/suppliers")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title={isEditing ? "Edit Supplier" : "Add New Supplier"} 
          description="Fill in the supplier details below"
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-5">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Supplier Name *</Label>
                  <Input 
                    value={formData.name} 
                    onChange={(e) => handleChange("name", e.target.value)}
                    placeholder="e.g. PlastiPack Industries"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Contact Person</Label>
                  <Input 
                    value={formData.contactPerson} 
                    onChange={(e) => handleChange("contactPerson", e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Phone Number *</Label>
                  <Input 
                    value={formData.phone} 
                    onChange={(e) => handleChange("phone", e.target.value)}
                    placeholder="+91 98765 43210"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={formData.email} 
                    onChange={(e) => handleChange("email", e.target.value)}
                    placeholder="sales@supplier.com"
                    className="mt-1"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <Textarea 
                    value={formData.address} 
                    onChange={(e) => handleChange("address", e.target.value)}
                    placeholder="Full address"
                    rows={2}
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Raw Material Categories - Important for Supplier Categorization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-4 w-4" />
                Raw Material Categories *
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">Select the raw material categories this supplier provides</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {RAW_MATERIAL_CATEGORIES.map((category) => (
                  <div
                    key={category.value}
                    onClick={() => toggleCategory(category.value)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.productCategories.includes(category.value)
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{category.label}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{category.description}</p>
                      </div>
                      {formData.productCategories.includes(category.value) && (
                        <X className="h-4 w-4 text-blue-500" onClick={(e) => {
                          e.stopPropagation();
                          toggleCategory(category.value);
                        }} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {formData.productCategories.length === 0 && (
                <p className="text-xs text-red-500 mt-2">Please select at least one category</p>
              )}
            </CardContent>
          </Card>

          {/* Payment & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Payment Terms
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formData.paymentTerms} onValueChange={(v) => handleChange("paymentTerms", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment terms" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>{term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  Supplier Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Select value={formData.status} onValueChange={(v) => handleChange("status", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((status) => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
          </div>

          {/* Performance Rating */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Star className="h-4 w-4" />
                Performance Rating
              </CardTitle>
            </CardHeader>
            <CardContent>
              {renderStarRating()}
            </CardContent>
          </Card>

          {/* Bank Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Bank Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Bank Name</Label>
                  <Input 
                    value={formData.bankName} 
                    onChange={(e) => handleChange("bankName", e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Account Number</Label>
                  <Input 
                    value={formData.bankAccountNumber} 
                    onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Account Name</Label>
                  <Input 
                    value={formData.bankAccountName} 
                    onChange={(e) => handleChange("bankAccountName", e.target.value)}
                    placeholder="e.g. PlastiPack Industries"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Branch</Label>
                  <Input 
                    value={formData.bankBranch} 
                    onChange={(e) => handleChange("bankBranch", e.target.value)}
                    placeholder="e.g. MIDC Branch"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea 
                value={formData.notes} 
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional information about the supplier..."
                rows={3}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button type="button" variant="outline" onClick={() => navigate("/manager/suppliers")}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={saving}>
              <FileText className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
            <Button type="submit" disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="h-4 w-4 mr-2" />
              {isEditing ? "Update Supplier" : "Save Supplier"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}