// src/pages/staff/CreateOrder.jsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { TrashIcon, CreditCard, Banknote, Wallet, Clock, AlertTriangle, Upload, Search, UserPlus, X } from "lucide-react";
import { productsApi, customersApi, salesOrdersApi, creditApi } from "@/api/index.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.jsx";
import { Button } from "@/components/ui/button.jsx";
import { Input } from "@/components/ui/input.jsx";
import { Label } from "@/components/ui/label.jsx";
import { Textarea } from "@/components/ui/textarea.jsx";
import { Separator } from "@/components/ui/separator.jsx";
import { Badge } from "@/components/ui/badge.jsx";
import { toast } from "sonner";
import { formatCurrency } from "@/utils/helpers.js";

export default function CreateOrder() {
  const [products, setProducts] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [deliveryRequired, setDeliveryRequired] = useState(true);
  const [customerCreditInfo, setCustomerCreditInfo] = useState(null);
  const [checkingCredit, setCheckingCredit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cashAmountReceived, setCashAmountReceived] = useState("");
  const [cashBalanceReturned, setCashBalanceReturned] = useState(0);
  const [onlineGateway, setOnlineGateway] = useState("eSewa");
  const [onlineTransactionId, setOnlineTransactionId] = useState("");
  const [onlineScreenshot, setOnlineScreenshot] = useState(null);
  const [creditRemarks, setCreditRemarks] = useState("");
  
  // Customer search states
  const [existingCustomerId, setExistingCustomerId] = useState(null);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingCustomer, setSearchingCustomer] = useState(false);
  const [selectedExistingCustomer, setSelectedExistingCustomer] = useState(null);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      customerName: "",
      phoneNumber: "",
      address: "",
      deliveryAddress: "",
      customerType: "NEW",
      orderNotes: "",
    },
  });

  const watchPhoneNumber = watch("phoneNumber");
  const watchCustomerName = watch("customerName");
  const watchAddress = watch("address");
  const watchDeliveryAddress = watch("deliveryAddress");

  // ✅ DEFINE calculateTotal FIRST before using it
  const calculateTotal = () => {
    return selectedProducts.reduce((total, item) => {
      if (item.product && item.quantity) {
        return total + (item.product.sellingPrice || 0) * item.quantity;
      }
      return total;
    }, 0);
  };

  const totalAmount = calculateTotal();

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    if (watchPhoneNumber && watchPhoneNumber.length >= 10) {
      checkCustomerByPhone();
    } else {
      setCustomerCreditInfo(null);
      setExistingCustomerId(null);
      setSelectedExistingCustomer(null);
    }
  }, [watchPhoneNumber]);

  useEffect(() => {
    if (cashAmountReceived && totalAmount) {
      const received = parseFloat(cashAmountReceived) || 0;
      const balance = received - totalAmount;
      setCashBalanceReturned(balance > 0 ? balance : 0);
    } else {
      setCashBalanceReturned(0);
    }
  }, [cashAmountReceived, totalAmount]);

  const fetchProducts = async () => {
    try {
      const response = await productsApi.getAll();
      setProducts(response.data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
      toast.error("Failed to load products");
    }
  };

  const checkCustomerByPhone = async () => {
    if (!watchPhoneNumber || watchPhoneNumber.length < 10) return;
    
    setCheckingCredit(true);
    try {
      const customersRes = await customersApi.getAll({ search: watchPhoneNumber });
      const customers = customersRes.data?.customers || customersRes.data || [];
      
      if (customers && customers.length > 0) {
        const customer = customers[0];
        setExistingCustomerId(customer.id);
        setSelectedExistingCustomer(customer);
        
        try {
          const creditInfo = await creditApi.getCustomerInfo(customer.id);
          setCustomerCreditInfo(creditInfo.data);
        } catch (creditError) {
          setCustomerCreditInfo(null);
        }
        
        if (!watchCustomerName) {
          setValue("customerName", customer.name);
        }
        if (!watchAddress) {
          setValue("address", customer.address || "");
        }
        if (!watchDeliveryAddress) {
          setValue("deliveryAddress", customer.deliveryAddress || customer.address || "");
        }
        
        toast.success(`Existing customer found: ${customer.name}`);
      } else {
        setExistingCustomerId(null);
        setSelectedExistingCustomer(null);
        setCustomerCreditInfo(null);
      }
    } catch (error) {
      console.error("Failed to check customer:", error);
    } finally {
      setCheckingCredit(false);
    }
  };

  const searchCustomers = async (query) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setSearchingCustomer(true);
    try {
      const response = await customersApi.getAll({ search: query, limit: 5 });
      setSearchResults(response.data?.customers || response.data || []);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setSearchingCustomer(false);
    }
  };

  const selectExistingCustomer = (customer) => {
    setSelectedExistingCustomer(customer);
    setExistingCustomerId(customer.id);
    setValue("customerName", customer.name);
    setValue("phoneNumber", customer.phone);
    setValue("address", customer.address || "");
    setValue("deliveryAddress", customer.deliveryAddress || customer.address || "");
    setSearchResults([]);
    setShowCustomerSearch(false);
    
    creditApi.getCustomerInfo(customer.id).then(res => {
      setCustomerCreditInfo(res.data);
    }).catch(() => setCustomerCreditInfo(null));
    
    toast.success(`Selected: ${customer.name}`);
  };

  const clearSelectedCustomer = () => {
    setSelectedExistingCustomer(null);
    setExistingCustomerId(null);
    setCustomerCreditInfo(null);
    setValue("customerName", "");
    setValue("phoneNumber", "");
    setValue("address", "");
    setValue("deliveryAddress", "");
  };

  const addProduct = () => {
    setSelectedProducts([...selectedProducts, { productId: "", quantity: 1, product: null }]);
  };

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const updateProduct = (index, field, value) => {
    const updated = [...selectedProducts];
    updated[index][field] = value;
    if (field === "productId") {
      const product = products.find(p => p.id === value);
      updated[index].product = product;
      if (product) {
        updated[index].unitPrice = product.sellingPrice;
      }
    }
    setSelectedProducts(updated);
  };

  const validateOrder = () => {
    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product");
      return false;
    }
    
    for (const item of selectedProducts) {
      if (!item.productId) {
        toast.error("Please select a product for all rows");
        return false;
      }
      if (!item.quantity || item.quantity < 1) {
        toast.error("Please enter valid quantity for all products");
        return false;
      }
    }
    
    if (!watchCustomerName) {
      toast.error("Please enter customer name");
      return false;
    }
    
    if (!watchPhoneNumber) {
      toast.error("Please enter customer phone number");
      return false;
    }
    
    if (paymentMethod === "CASH" && cashAmountReceived) {
      const received = parseFloat(cashAmountReceived);
      if (received < totalAmount) {
        toast.error(`Amount received (₦${received}) is less than total (₦${totalAmount})`);
        return false;
      }
    }
    
    if (paymentMethod === "ONLINE" && !onlineTransactionId) {
      toast.error("Please enter transaction ID for online payment");
      return false;
    }
    
    return true;
  };

  const onSubmit = async (data) => {
    if (!validateOrder()) return;
    
    setLoading(true);
    
    const orderData = {
      customerId: existingCustomerId,
      customerName: data.customerName,
      phoneNumber: data.phoneNumber,
      address: data.address,
      deliveryAddress: deliveryRequired ? (data.deliveryAddress || data.address) : null,
      customerType: data.customerType,
      items: selectedProducts.map(item => ({
        productId: item.productId,
        quantity: parseInt(item.quantity),
        unitPrice: item.product.sellingPrice,
      })),
      paymentType: paymentMethod,
      deliveryRequired,
      orderNotes: data.orderNotes,
      totalAmount: totalAmount,
      paymentDetails: {
        cashReceived: paymentMethod === "CASH" ? parseFloat(cashAmountReceived) : null,
        cashBalance: paymentMethod === "CASH" ? cashBalanceReturned : null,
        gateway: paymentMethod === "ONLINE" ? onlineGateway : null,
        transactionId: paymentMethod === "ONLINE" ? onlineTransactionId : null,
        screenshot: paymentMethod === "ONLINE" ? onlineScreenshot : null,
        remarks: paymentMethod === "CREDIT" ? creditRemarks : null,
      },
    };

    try {
      await salesOrdersApi.create(orderData);
      toast.success("Order created successfully!");
      
      setSelectedProducts([]);
      setValue("customerName", "");
      setValue("phoneNumber", "");
      setValue("address", "");
      setValue("deliveryAddress", "");
      setValue("orderNotes", "");
      setCustomerCreditInfo(null);
      setExistingCustomerId(null);
      setSelectedExistingCustomer(null);
      setCashAmountReceived("");
      setCashBalanceReturned(0);
      setOnlineTransactionId("");
      setOnlineScreenshot(null);
      setCreditRemarks("");
      
    } catch (error) {
      console.error("Order creation error:", error);
      toast.error(error.response?.data?.message || "Failed to create order");
    } finally {
      setLoading(false);
    }
  };

  const PaymentMethodCard = ({ method, icon: Icon, title, description, value }) => (
    <div
      onClick={() => setPaymentMethod(value)}
      className={`cursor-pointer rounded-xl border-2 p-4 transition-all ${
        paymentMethod === value
          ? "border-violet-500 bg-violet-50 shadow-md"
          : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-3">
        <div className={`rounded-full p-2.5 transition-all ${
          paymentMethod === value ? "bg-violet-500" : "bg-gray-100"
        }`}>
          <Icon className={`h-5 w-5 ${
            paymentMethod === value ? "text-white" : "text-gray-500"
          }`} />
        </div>
        <div className="flex-1">
          <p className={`font-semibold ${
            paymentMethod === value ? "text-violet-700" : "text-gray-700"
          }`}>
            {title}
          </p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        {paymentMethod === value && (
          <div className="h-3 w-3 rounded-full bg-violet-500 ring-2 ring-violet-200" />
        )}
      </div>
    </div>
  );

  const showCreditWarning = paymentMethod === "CREDIT" && customerCreditInfo && customerCreditInfo.remainingBalance > 0;
  const availableCredit = (customerCreditInfo?.creditLimit || 0) - (customerCreditInfo?.remainingBalance || 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Order</h1>
        <p className="text-gray-600 mt-1">Add a new customer order in a few clicks</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">Customer Information</CardTitle>
              <p className="text-sm text-gray-500">Basic details of the customer placing the order</p>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Customer Search Section */}
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-medium text-blue-800">Find Existing Customer</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCustomerSearch(!showCustomerSearch)}
                    className="text-blue-600"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Search
                  </Button>
                </div>
                
                {showCustomerSearch && (
                  <div className="relative">
                    <Input
                      placeholder="Search by name or phone number..."
                      onChange={(e) => searchCustomers(e.target.value)}
                      className="bg-white"
                    />
                    {searchingCustomer && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
                      </div>
                    )}
                    {searchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map(customer => (
                          <div
                            key={customer.id}
                            className="p-3 hover:bg-gray-50 cursor-pointer border-b"
                            onClick={() => selectExistingCustomer(customer)}
                          >
                            <p className="font-medium text-gray-900">{customer.name}</p>
                            <p className="text-xs text-gray-500">{customer.phone}</p>
                            <p className="text-xs text-gray-400">{customer.address}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {selectedExistingCustomer && (
                  <div className="mt-3 flex items-center justify-between bg-green-50 p-2 rounded">
                    <div>
                      <p className="text-sm font-medium text-green-800">Selected Customer</p>
                      <p className="text-sm">{selectedExistingCustomer.name}</p>
                      <p className="text-xs text-gray-500">{selectedExistingCustomer.phone}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearSelectedCustomer}
                      className="text-red-500"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                
                <Separator className="my-3" />
                <p className="text-xs text-gray-500 text-center">Or fill form below for new customer</p>
              </div>
              
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Customer Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register("customerName", { required: "Customer name is required" })}
                    placeholder="Anil Thapa"
                    className="mt-1.5"
                  />
                  {errors.customerName && (
                    <p className="mt-1 text-sm text-red-600">{errors.customerName.message}</p>
                  )}
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    {...register("phoneNumber", { required: "Phone number is required" })}
                    placeholder="+977 9812345678"
                    className="mt-1.5"
                  />
                  {errors.phoneNumber && (
                    <p className="mt-1 text-sm text-red-600">{errors.phoneNumber.message}</p>
                  )}
                  {checkingCredit && (
                    <p className="mt-1 text-sm text-gray-500">Checking existing customer...</p>
                  )}
                </div>
                <div className="sm:col-span-2">
                  <Label className="text-sm font-medium text-gray-700">Address</Label>
                  <Input
                    {...register("address")}
                    placeholder="Baneshwor, Kathmandu"
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Customer Type</Label>
                  <select
                    {...register("customerType")}
                    className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="NEW">New Customer</option>
                    <option value="REGULAR">Regular Customer</option>
                    <option value="VIP">VIP Customer</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Order Information Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">Order Information</CardTitle>
              <p className="text-sm text-gray-500">Select products and delivery preferences</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <Label className="text-sm font-medium text-gray-700">Products</Label>
                
                {selectedProducts.map((item, index) => (
                  <div key={index} className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div className="flex-1 min-w-[180px]">
                      <Label className="text-xs text-gray-500">Product</Label>
                      <select
                        value={item.productId}
                        onChange={(e) => updateProduct(index, "productId", e.target.value)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      >
                        <option value="">Select Product</option>
                        {products.map(product => (
                          <option key={product.id} value={product.id}>
                            {product.name} - {formatCurrency(product.sellingPrice)} / {product.unit}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-gray-500">Quantity</Label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateProduct(index, "quantity", parseInt(e.target.value) || 1)}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
                      />
                    </div>
                    <div className="w-28">
                      <Label className="text-xs text-gray-500">Unit Price</Label>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {formatCurrency(item.product?.sellingPrice || 0)}
                      </p>
                    </div>
                    <div className="w-32">
                      <Label className="text-xs text-gray-500">Total</Label>
                      <p className="mt-1 text-sm font-semibold text-violet-600">
                        {formatCurrency((item.product?.sellingPrice || 0) * item.quantity)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeProduct(index)}
                      className="mt-5 rounded-lg p-2 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addProduct}
                  className="w-full rounded-lg border-2 border-dashed border-gray-300 py-3 text-center text-sm font-medium text-gray-600 hover:border-violet-500 hover:text-violet-600 transition-colors"
                >
                  + Add Product
                </button>
              </div>

              <Separator className="my-6" />

              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Delivery Required?</Label>
                  <div className="flex gap-6 mt-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={deliveryRequired}
                        onChange={() => setDeliveryRequired(true)}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-700">Yes</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        checked={!deliveryRequired}
                        onChange={() => setDeliveryRequired(false)}
                        className="h-4 w-4 text-violet-600 focus:ring-violet-500"
                      />
                      <span className="text-sm text-gray-700">No</span>
                    </label>
                  </div>
                </div>

                {deliveryRequired && (
                  <div>
                    <Label className="text-sm font-medium text-gray-700">Delivery Address</Label>
                    <Textarea
                      {...register("deliveryAddress")}
                      rows={2}
                      placeholder="Enter delivery address"
                      className="mt-1.5"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Leave empty to use customer's billing address
                    </p>
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium text-gray-700">Order Notes</Label>
                  <Textarea
                    {...register("orderNotes")}
                    rows={2}
                    placeholder="Add any special instructions..."
                    className="mt-1.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Payment & Summary */}
        <div className="space-y-6">
          {/* Payment Section Card */}
          <Card className="overflow-hidden">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">Payment Section</CardTitle>
              <p className="text-sm text-gray-500">Select a payment method to reveal its details</p>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                <PaymentMethodCard icon={Banknote} title="Cash" description="Pay on delivery" value="CASH" />
                <PaymentMethodCard icon={CreditCard} title="Online Payment" description="UPI / Card / Mobile Banking" value="ONLINE" />
                <PaymentMethodCard icon={Wallet} title="Credit" description="Pay later (30 days)" value="CREDIT" />
                <PaymentMethodCard icon={Clock} title="Pay later" description="Deferred payment" value="PAY_LATER" />
              </div>

              {/* Cash Payment Details */}
              {paymentMethod === "CASH" && (
                <div className="mt-6 rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-white p-5">
                  <h4 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
                    <Banknote className="h-4 w-4" />
                    Cash Payment Details
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-green-700">Amount Received</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                        <Input
                          type="number"
                          placeholder="500.00"
                          value={cashAmountReceived}
                          onChange={(e) => setCashAmountReceived(e.target.value)}
                          className="pl-8 bg-white"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-green-700">Balance Returned</Label>
                      <div className="relative mt-1.5">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₦</span>
                        <Input
                          type="text"
                          value={cashBalanceReturned.toFixed(2)}
                          disabled
                          className="pl-8 bg-gray-100 text-gray-600"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Online Payment Details */}
              {paymentMethod === "ONLINE" && (
                <div className="mt-6 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-white p-5">
                  <h4 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Online Payment Details
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-blue-700">Payment Gateway</Label>
                      <select
                        value={onlineGateway}
                        onChange={(e) => setOnlineGateway(e.target.value)}
                        className="mt-1.5 block w-full rounded-lg border border-blue-200 bg-white px-3 py-2 text-sm"
                      >
                        <option value="eSewa">eSewa</option>
                        <option value="Khalti">Khalti</option>
                        <option value="ConnectIPS">ConnectIPS</option>
                        <option value="Mobile Banking">Mobile Banking</option>
                        <option value="Card">Credit/Debit Card</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm text-blue-700">Transaction ID</Label>
                      <Input
                        placeholder="TXN 908213"
                        value={onlineTransactionId}
                        onChange={(e) => setOnlineTransactionId(e.target.value)}
                        className="mt-1.5 bg-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Credit Payment Details */}
              {paymentMethod === "CREDIT" && (
                <div className="mt-6 space-y-4">
                  {showCreditWarning && (
                    <div className="rounded-xl border border-yellow-200 bg-gradient-to-r from-yellow-50 to-white p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-semibold text-yellow-800">Outstanding Credit Warning</h4>
                          <p className="text-sm text-yellow-700 mt-1">
                            This customer already has {formatCurrency(customerCreditInfo.remainingBalance)} in unpaid credit.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="rounded-xl border border-purple-200 bg-gradient-to-r from-purple-50 to-white p-5">
                    <h4 className="font-semibold text-purple-800 mb-4 flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      Credit Payment Details
                    </h4>
                    <div className="space-y-3">
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-purple-700">Credit Due Date</span>
                        <span className="text-sm font-semibold text-purple-900">
                          {new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-sm text-purple-700">Available Credit</span>
                        <span className="text-sm font-semibold text-green-600">
                          {formatCurrency(availableCredit)}
                        </span>
                      </div>
                      <div>
                        <Label className="text-sm text-purple-700">Remarks</Label>
                        <textarea
                          value={creditRemarks}
                          onChange={(e) => setCreditRemarks(e.target.value)}
                          placeholder="Customer requested 30-day payment terms."
                          className="mt-1.5 w-full rounded-lg border border-purple-200 bg-white px-3 py-2 text-sm"
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Pay Later Details */}
              {paymentMethod === "PAY_LATER" && (
                <div className="mt-6 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-5">
                  <h4 className="font-semibold text-orange-800 mb-4 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Pay Later Details
                  </h4>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm text-orange-700">Payment Terms</Label>
                      <select className="mt-1.5 block w-full rounded-lg border border-orange-200 bg-white px-3 py-2 text-sm">
                        <option>End of Day</option>
                        <option>Next Day</option>
                        <option>Within 7 Days</option>
                        <option>Custom Date</option>
                      </select>
                    </div>
                    <div>
                      <Label className="text-sm text-orange-700">Expected Payment Date</Label>
                      <Input type="date" className="mt-1.5 bg-white" />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Summary Card */}
          <Card className="overflow-hidden sticky top-6">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="text-lg">Order Summary</CardTitle>
              <p className="text-sm text-gray-500">Review before confirming</p>
            </CardHeader>
            <CardContent className="pt-6">
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Customer Name</dt>
                  <dd className="font-medium text-gray-900 truncate ml-4">{watchCustomerName || "-"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Total Products</dt>
                  <dd className="font-medium text-gray-900">{selectedProducts.length}</dd>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between pt-2">
                  <dt className="text-lg font-semibold text-gray-900">Total Amount</dt>
                  <dd className="text-xl font-bold text-violet-600">{formatCurrency(totalAmount)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Payment Type</dt>
                  <dd className="font-medium text-gray-900">
                    {paymentMethod === "CASH" ? "Cash" : 
                     paymentMethod === "ONLINE" ? "Online Payment" :
                     paymentMethod === "CREDIT" ? "Credit" : "Pay Later"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Delivery Status</dt>
                  <dd className="font-medium text-gray-900">{deliveryRequired ? "Required" : "Not Required"}</dd>
                </div>
              </dl>

              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={loading}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5"
                >
                  {loading ? "Creating Order..." : "Confirm Order"}
                </Button>
                <Button variant="outline" className="flex-1 py-2.5">
                  Save Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}