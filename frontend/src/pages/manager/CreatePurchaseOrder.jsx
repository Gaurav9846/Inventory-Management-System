// src/pages/manager/CreatePurchaseOrder.jsx
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { purchaseOrdersApi, suppliersApi, rawMaterialsApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.jsx";
import { PageHeader } from "@/components/shared/PageHeader.jsx";
import { ArrowLeft, Plus, Trash2, Package, Building2, Calendar, Warehouse, Percent, Receipt, DollarSign, Save, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers.js";

export default function CreatePurchaseOrder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetSupplierId = searchParams.get("supplier");
  
  const [suppliers, setSuppliers] = useState([]);
  const [allRawMaterials, setAllRawMaterials] = useState([]);
  const [filteredRawMaterials, setFilteredRawMaterials] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  
  const [formData, setFormData] = useState({
    supplierId: presetSupplierId || "",
    expectedDeliveryDate: "",
    warehouseDestination: "Main Warehouse",
    items: [{ rawMaterialId: "", quantity: 1, unitPrice: "" }],
    discount: 0,
    tax: 0,
    notes: "",
  });

  // Fetch suppliers and raw materials on mount
  useEffect(() => {
    fetchSuppliers();
    fetchAllRawMaterials();
  }, []);

  // Filter raw materials when supplier changes
  useEffect(() => {
    if (formData.supplierId && selectedSupplier) {
      const supplierCategories = selectedSupplier.productCategories || [];
      
      if (supplierCategories.length > 0) {
        // Filter raw materials that match supplier's categories
        const filtered = allRawMaterials.filter(material => {
          const materialCategory = material.category;
          return supplierCategories.includes(materialCategory);
        });
        setFilteredRawMaterials(filtered);
        
        // Clear items that are no longer available
        const updatedItems = formData.items.map(item => {
          const stillAvailable = filtered.some(m => m.id === item.rawMaterialId);
          return stillAvailable ? item : { rawMaterialId: "", quantity: 1, unitPrice: "" };
        });
        setFormData(prev => ({ ...prev, items: updatedItems }));
      } else {
        setFilteredRawMaterials([]);
      }
    } else {
      setFilteredRawMaterials([]);
    }
  }, [formData.supplierId, selectedSupplier, allRawMaterials]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const response = await suppliersApi.getAll({ limit: 100 });
      setSuppliers(response.data.suppliers || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast.error("Failed to load suppliers");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllRawMaterials = async () => {
    try {
      const response = await rawMaterialsApi.getAll({ limit: 500 });
      // The API should return raw materials with category name included
      setAllRawMaterials(response.data.data || []);
    } catch (error) {
      console.error("Error fetching raw materials:", error);
      toast.error("Failed to load raw materials");
    }
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    
    // If raw material changes, auto-fill unit price from raw material cost
    if (field === "rawMaterialId") {
      const material = filteredRawMaterials.find(r => r.id === value);
      if (material) {
        newItems[index].unitPrice = material.unitCost || "";
      }
    }
    
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { rawMaterialId: "", quantity: 1, unitPrice: "" }]
    });
  };

  const removeItem = (index) => {
    if (formData.items.length === 1) {
      toast.error("At least one item is required");
      return;
    }
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const calculateSubtotal = () => {
    return formData.items.reduce((sum, item) => {
      return sum + ((item.unitPrice || 0) * (item.quantity || 0));
    }, 0);
  };

  const calculateDiscountAmount = () => {
    return calculateSubtotal() * (formData.discount / 100);
  };

  const calculateTaxAmount = () => {
    const afterDiscount = calculateSubtotal() - calculateDiscountAmount();
    return afterDiscount * (formData.tax / 100);
  };

  const calculateTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount() + calculateTaxAmount();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.supplierId) {
      toast.error("Please select a supplier");
      return;
    }
    
    if (formData.items.some(item => !item.rawMaterialId || !item.quantity)) {
      toast.error("Please fill all item details");
      return;
    }
    
    setSaving(true);
    try {
      const orderData = {
        supplierId: formData.supplierId,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        warehouseDestination: formData.warehouseDestination,
        items: formData.items.map(item => ({
          rawMaterialId: item.rawMaterialId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
        discount: parseFloat(formData.discount) || 0,
        tax: parseFloat(formData.tax) || 0,
        notes: formData.notes,
      };
      
      const response = await purchaseOrdersApi.create(orderData);
      toast.success("Purchase order created successfully");
      navigate(`/manager/purchase-orders/${response.data.data.id}`);
    } catch (error) {
      console.error("Error creating PO:", error);
      toast.error(error.response?.data?.message || "Failed to create purchase order");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.supplierId) {
      toast.error("Please select a supplier first");
      return;
    }
    
    const validItems = formData.items.filter(item => item.rawMaterialId);
    if (validItems.length === 0) {
      toast.error("Please add at least one item before saving draft");
      return;
    }
    
    setSaving(true);
    try {
      const orderData = {
        supplierId: formData.supplierId,
        expectedDeliveryDate: formData.expectedDeliveryDate,
        warehouseDestination: formData.warehouseDestination,
        items: validItems.map(item => ({
          rawMaterialId: item.rawMaterialId,
          quantity: parseInt(item.quantity),
          unitPrice: parseFloat(item.unitPrice) || 0,
        })),
        discount: parseFloat(formData.discount) || 0,
        tax: parseFloat(formData.tax) || 0,
        notes: formData.notes,
      };
      
      const response = await purchaseOrdersApi.create(orderData);
      toast.success("Purchase order draft saved");
      navigate(`/manager/purchase-orders/${response.data.data.id}`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const subtotal = calculateSubtotal();
  const discountAmount = calculateDiscountAmount();
  const taxAmount = calculateTaxAmount();
  const total = calculateTotal();

  // Group filtered raw materials by category
  const groupedRawMaterials = filteredRawMaterials.reduce((groups, material) => {
    const category = material.category || "Other";
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(material);
    return groups;
  }, {});

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/manager/purchase-orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PageHeader 
          title="Create Purchase Order" 
          description="Enter supplier, delivery, and item details for the new order"
        />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form - 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Purchase Order Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Purchase Order Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Supplier *</Label>
                  <Select 
                    value={formData.supplierId} 
                    onValueChange={(v) => {
                      setFormData({ ...formData, supplierId: v });
                      const supplier = suppliers.find(s => s.id === v);
                      setSelectedSupplier(supplier);
                    }}
                  >
                    <SelectTrigger className="mt-1.5">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            <span>{supplier.name}</span>
                            {supplier.paymentTerms && (
                              <span className="text-xs text-gray-400">• {supplier.paymentTerms}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedSupplier && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Receipt className="h-4 w-4" />
                        <span>Payment Terms: {selectedSupplier.paymentTerms || "Net 30"}</span>
                      </div>
                      {selectedSupplier.productCategories?.length > 0 && (
                        <div className="flex items-center gap-2 text-gray-600 mt-1">
                          <Package className="h-4 w-4" />
                          <span>Supplies: {selectedSupplier.productCategories.join(", ")}</span>
                        </div>
                      )}
                      {filteredRawMaterials.length === 0 && selectedSupplier.productCategories?.length > 0 && (
                        <div className="flex items-center gap-2 text-amber-600 mt-2 text-xs">
                          <AlertCircle className="h-3 w-3" />
                          <span>No raw materials found for this supplier's categories</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">PO Date</Label>
                    <Input 
                      type="date"
                      value={new Date().toISOString().split('T')[0]}
                      disabled
                      className="mt-1.5 bg-gray-50"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Expected Delivery Date</Label>
                    <Input 
                      type="date"
                      value={formData.expectedDeliveryDate}
                      onChange={(e) => setFormData({ ...formData, expectedDeliveryDate: e.target.value })}
                      className="mt-1.5"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Warehouse Destination</Label>
                  <Select 
                    value={formData.warehouseDestination} 
                    onValueChange={(v) => setFormData({ ...formData, warehouseDestination: v })}
                  >
                    <SelectTrigger className="mt-1.5">
                      <Warehouse className="h-4 w-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Main Warehouse">Main Warehouse</SelectItem>
                      <SelectItem value="Secondary Warehouse">Secondary Warehouse</SelectItem>
                      <SelectItem value="Distribution Center">Distribution Center</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Order Items - Only show if supplier is selected */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Order Items
                  </CardTitle>
                  {selectedSupplier && filteredRawMaterials.length > 0 && (
                    <Button type="button" size="sm" variant="outline" onClick={addItem}>
                      <Plus className="h-4 w-4 mr-1" /> Add Item
                    </Button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {selectedSupplier 
                    ? `Raw materials from ${selectedSupplier.name} (${selectedSupplier.productCategories?.join(", ") || "All categories"})`
                    : "Select a supplier first to see available raw materials"}
                </p>
              </CardHeader>
              <CardContent>
                {!selectedSupplier ? (
                  <div className="text-center py-8 text-gray-400">
                    <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Please select a supplier first</p>
                  </div>
                ) : filteredRawMaterials.length === 0 ? (
                  <div className="text-center py-8 text-amber-500">
                    <Package className="h-12 w-12 mx-auto mb-3 text-amber-300" />
                    <p>No raw materials available for this supplier</p>
                    <p className="text-xs text-gray-400 mt-1">
                      This supplier supplies: {selectedSupplier.productCategories?.join(", ") || "None"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.items.map((item, index) => {
                      const selectedMaterial = filteredRawMaterials.find(r => r.id === item.rawMaterialId);
                      return (
                        <div key={index} className="flex flex-wrap gap-3 p-4 bg-gray-50 rounded-lg border">
                          <div className="flex-1 min-w-[200px]">
                            <Label className="text-xs text-gray-500">Raw Material</Label>
                            <Select 
                              value={item.rawMaterialId} 
                              onValueChange={(v) => handleItemChange(index, "rawMaterialId", v)}
                            >
                              <SelectTrigger className="mt-1">
                                <SelectValue placeholder="Select raw material" />
                              </SelectTrigger>
                              <SelectContent className="max-h-80">
                                {Object.entries(groupedRawMaterials).map(([category, materials]) => (
                                  <div key={category}>
                                    <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 sticky top-0">
                                      {category}
                                    </div>
                                    {materials.map((material) => (
                                      <SelectItem key={material.id} value={material.id}>
                                        <div className="flex items-center justify-between w-full gap-4">
                                          <span className="flex-1">{material.name}</span>
                                          <span className="text-xs text-gray-400">{material.unit}</span>
                                          <span className="text-xs text-green-600">Stock: {material.currentStock}</span>
                                        </div>
                                      </SelectItem>
                                    ))}
                                  </div>
                                ))}
                              </SelectContent>
                            </Select>
                            {selectedMaterial && (
                              <p className="text-xs text-gray-400 mt-1">
                                Category: {selectedMaterial.category} | Stock: {selectedMaterial.currentStock} {selectedMaterial.unit}
                              </p>
                            )}
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-gray-500">Quantity</Label>
                            <Input 
                              type="number" 
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, "quantity", parseInt(e.target.value) || 1)}
                              className="mt-1"
                            />
                          </div>
                          <div className="w-32">
                            <Label className="text-xs text-gray-500">Unit Price (₹)</Label>
                            <Input 
                              type="number" 
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, "unitPrice", parseFloat(e.target.value) || 0)}
                              className="mt-1"
                              placeholder="0.00"
                            />
                          </div>
                          <div className="w-28">
                            <Label className="text-xs text-gray-500">Total</Label>
                            <p className="mt-2 text-sm font-semibold text-green-600">
                              {formatCurrency((item.unitPrice || 0) * (item.quantity || 0))}
                            </p>
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon"
                            onClick={() => removeItem(index)}
                            className="mt-5 text-red-500 hover:text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Notes / Remarks</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add delivery instructions, quality requirements, or supplier notes..."
                  rows={3}
                  className="resize-none"
                />
              </CardContent>
            </Card>
          </div>

          {/* Summary Sidebar - 1 column */}
          <div className="space-y-6">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-base">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(subtotal)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Discount</span>
                      <div className="flex items-center gap-1">
                        <Input 
                          type="number"
                          className="w-16 h-8 text-sm text-center"
                          value={formData.discount}
                          onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <span className="text-red-500">-{formatCurrency(discountAmount)}</span>
                  </div>
                  
                  <div className="flex justify-between items-center py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Tax</span>
                      <div className="flex items-center gap-1">
                        <Input 
                          type="number"
                          className="w-16 h-8 text-sm text-center"
                          value={formData.tax}
                          onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || 0 })}
                        />
                        <span className="text-sm">%</span>
                      </div>
                    </div>
                    <span className="text-blue-500">+{formatCurrency(taxAmount)}</span>
                  </div>
                  
                  <div className="pt-3 border-t-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-bold">Grand Total</span>
                      <span className="text-xl font-bold text-emerald-600">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-3 pt-4">
                  <Button 
                    type="submit" 
                    disabled={saving || !selectedSupplier || filteredRawMaterials.length === 0} 
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    {saving ? (
                      <div className="flex items-center gap-2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Creating...
                      </div>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Create Purchase Order
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleSaveDraft} 
                    disabled={saving || !selectedSupplier} 
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Save as Draft
                  </Button>
                  
                  <Button type="button" variant="ghost" onClick={() => navigate("/manager/purchase-orders")} className="w-full">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Supplier Info Summary */}
            {selectedSupplier && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Company</span>
                    <span className="font-medium">{selectedSupplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Contact</span>
                    <span>{selectedSupplier.contactPerson || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Phone</span>
                    <span>{selectedSupplier.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="truncate max-w-[150px]">{selectedSupplier.email || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Payment Terms</span>
                    <span className="font-medium">{selectedSupplier.paymentTerms || "Net 30"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Categories</span>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {selectedSupplier.productCategories?.map((cat, i) => (
                        <span key={i} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">{cat}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Available Items</span>
                    <span className="font-medium text-green-600">{filteredRawMaterials.length}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Items Count */}
            {selectedSupplier && filteredRawMaterials.length > 0 && (
              <Card>
                <CardContent className="p-4 text-center">
                  <Package className="h-6 w-6 mx-auto text-gray-400 mb-2" />
                  <p className="text-2xl font-bold">{formData.items.filter(i => i.rawMaterialId).length}</p>
                  <p className="text-xs text-gray-500">Items in this order</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}