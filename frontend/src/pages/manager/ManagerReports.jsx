// src/pages/manager/ManagerReports.jsx
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Users,
  CreditCard,
  ShoppingCart,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Eye,
  Award,
  ChevronDown,
  User,
  Truck,
  Banknote,
  Wallet,
  Building,
  X,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { reportsApi, usersApi, productsApi, suppliersApi, customersApi } from '@/api/index';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';

const DATE_RANGE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last7days', label: 'Last 7 Days' },
  { value: 'last30days', label: 'Last 30 Days' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'last3Months', label: 'Last 3 Months' },
  { value: 'last6Months', label: 'Last 6 Months' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' },
];

const PAYMENT_OPTIONS = [
  { value: 'all', label: 'All Payments' },
  { value: 'cash', label: 'Cash' },
  { value: 'online', label: 'Online' },
  { value: 'credit', label: 'Credit' },
  { value: 'pay_later', label: 'Pay Later' },
];

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316', '#6366F1', '#06B6D4'];

export default function ManagerReports() {
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [printing, setPrinting] = useState(false);

  const [dateRange, setDateRange] = useState('last30days');
  const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
  const [showCustomRange, setShowCustomRange] = useState(false);

  const [activeFilter, setActiveFilter] = useState(null);
  const [filterValue, setFilterValue] = useState('all');

  const [trendMetric, setTrendMetric] = useState('revenue');
  const [sortBy, setSortBy] = useState('revenue');
  const [paymentDisplayMode, setPaymentDisplayMode] = useState('amount');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalRecords, setTotalRecords] = useState(0);

  const [filterOptions, setFilterOptions] = useState({
    employees: [],
    products: [],
    suppliers: [],
    customers: [],
  });

  const [reportData, setReportData] = useState({
    summary: {
      totalRevenue: 0,
      monthlyRevenue: 0,
      netProfit: 0,
      ordersCompleted: 0,
      inventoryValue: 0,
      creditOutstanding: 0,
      activeCustomers: 0,
      topProduct: 'N/A',
      revenueGrowth: 0,
      revenueGenerated: 0,
      ordersProcessed: 0,
      customersServed: 0,
      paymentsCollected: 0,
      averageOrderValue: 0,
      unitsSold: 0,
      remainingStock: 0,
      averageSellingPrice: 0,
      profitGenerated: 0,
      purchaseValue: 0,
      purchaseCost: 0,
      productsPurchased: 0,
      pendingPayments: 0,
      deliveryCount: 0,
      averageDeliveryTime: 0,
      outstandingPayment: 0,
      totalDeliveries: 0,
      totalPurchases: 0,
      orders: 0,
      creditRemaining: 0,
      paymentsMade: 0,
      lastPurchase: null,
      favouriteProduct: 'N/A',
      totalOrders: 0,
      totalCashIncome: 0,
      totalOnlineIncome: 0,
      customerCreditRemaining: 0,
      supplierOutstandingPayment: 0,
      incomingCash: 0,
      outgoingCash: 0,
      netCashFlow: 0,
    },
    revenueTrend: [],
    paymentMethods: [],
    topProducts: [],
    weeklyTrend: [],
    creditSummary: { totalRemaining: 0, totalPaid: 0, overdueAccounts: 0, totalCreditAccounts: 0 },
    inventoryOverview: { totalRawMaterials: 0, totalFinishedProducts: 0, lowStockCount: 0, outOfStockCount: 0, totalValue: 0 },
    filteredOrders: [],
    supplierData: null,
    customerData: null,
    employeeData: null,
    paymentData: null,
    topSuppliers: [],
    topCustomers: [],
    lowStock: [],
    groupBy: 'day',
    pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
  });

  const debounceTimer = useRef(null);
  const reportRef = useRef(null);

  // Helper to format product quantities with arrow notation on separate lines
  const formatProductQuantities = useCallback((items) => {
    if (!items || items.length === 0) return 'N/A';
    return items.map(item => `${item.name || 'Unknown'} → ${item.quantity || 0}`).join('\n');
  }, []);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const [usersRes, productsRes, suppliersRes, customersRes] = await Promise.all([
        usersApi.getAll(),
        productsApi.getAll({ limit: 100 }),
        suppliersApi.getAll({ limit: 100 }),
        customersApi.getAll({ limit: 100 }),
      ]);

      let employees = [];
      const usersData = usersRes.data;
      if (Array.isArray(usersData)) {
        employees = usersData.filter(u => u.role === 'STAFF').map(e => ({ id: e.id, name: e.name }));
      } else if (usersData?.data && Array.isArray(usersData.data)) {
        employees = usersData.data.filter(u => u.role === 'STAFF').map(e => ({ id: e.id, name: e.name }));
      }

      let products = [];
      const productsData = productsRes.data;
      if (Array.isArray(productsData)) {
        products = productsData.map(p => ({ id: p.id, name: p.name }));
      } else if (productsData?.data && Array.isArray(productsData.data)) {
        products = productsData.data.map(p => ({ id: p.id, name: p.name }));
      }

      let suppliers = [];
      const suppliersData = suppliersRes.data;
      if (Array.isArray(suppliersData)) {
        suppliers = suppliersData.map(s => ({ id: s.id, name: s.name }));
      } else if (suppliersData?.suppliers && Array.isArray(suppliersData.suppliers)) {
        suppliers = suppliersData.suppliers.map(s => ({ id: s.id, name: s.name }));
      } else if (suppliersData?.data && Array.isArray(suppliersData.data)) {
        suppliers = suppliersData.data.map(s => ({ id: s.id, name: s.name }));
      }

      let customers = [];
      const customersData = customersRes.data;
      if (Array.isArray(customersData)) {
        customers = customersData.map(c => ({ id: c.id, name: c.name }));
      } else if (customersData?.customers && Array.isArray(customersData.customers)) {
        customers = customersData.customers.map(c => ({ id: c.id, name: c.name }));
      } else if (customersData?.data && Array.isArray(customersData.data)) {
        customers = customersData.data.map(c => ({ id: c.id, name: c.name }));
      }

      setFilterOptions({ employees, products, suppliers, customers });
    } catch (error) {
      console.error('Failed to fetch filter options:', error);
      setFilterOptions({ employees: [], products: [], suppliers: [], customers: [] });
    }
  }, []);

  const buildQueryParams = useCallback(() => {
    const params = { 
      dateRange, 
      metric: trendMetric, 
      sortBy, 
      paymentDisplayMode,
      page: currentPage,
      limit: pageSize,
    };
    if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
      params.fromDate = customDateRange.from;
      params.toDate = customDateRange.to;
    }
    if (activeFilter && filterValue !== 'all') {
      const paramMap = {
        employee: 'employeeId',
        product: 'productId',
        supplier: 'supplierId',
        customer: 'customerId',
        payment: 'paymentMethod',
      };
      params[paramMap[activeFilter]] = filterValue;
    }
    return params;
  }, [dateRange, customDateRange, activeFilter, filterValue, trendMetric, sortBy, paymentDisplayMode, currentPage, pageSize]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const params = buildQueryParams();
      const response = await reportsApi.getDashboard(params);
      const data = response.data.data;

      setReportData({
        summary: data.summary || {},
        revenueTrend: data.revenueTrend || [],
        paymentMethods: data.paymentMethods || [],
        topProducts: data.topProducts || [],
        weeklyTrend: data.weeklyTrend || [],
        creditSummary: data.creditSummary || {},
        inventoryOverview: data.inventoryOverview || {},
        filteredOrders: data.filteredOrders || [],
        supplierData: data.supplierData || null,
        customerData: data.customerData || null,
        employeeData: data.employeeData || null,
        paymentData: data.paymentData || null,
        topSuppliers: data.topSuppliers || [],
        topCustomers: data.topCustomers || [],
        lowStock: data.lowStock || [],
        groupBy: data.groupBy || 'day',
        pagination: data.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
      
      setTotalRecords(data.pagination?.total || data.filteredOrders?.length || 0);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildQueryParams]);

  useEffect(() => {
    fetchFilterOptions();
  }, [fetchFilterOptions]);

  useEffect(() => {
    if (dateRange === 'custom' && (!customDateRange.from || !customDateRange.to)) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(fetchReportData, 300);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [dateRange, customDateRange, activeFilter, filterValue, trendMetric, sortBy, paymentDisplayMode, currentPage, pageSize, fetchReportData]);

  const handleRefresh = () => { setRefreshing(true); fetchReportData(); };
  
  const setFilter = (type, value) => {
    if (value === 'all') {
      setActiveFilter(null);
      setFilterValue('all');
    } else {
      setActiveFilter(type);
      setFilterValue(value);
    }
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setActiveFilter(null);
    setFilterValue('all');
    setCurrentPage(1);
  };

  const handleDateRangeChange = (value) => { 
    setDateRange(value); 
    if (value === 'custom') setShowCustomRange(true); 
    else setShowCustomRange(false);
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (size) => {
    setPageSize(size);
    setCurrentPage(1);
  };

  const getFilterLabel = useCallback((type, value) => {
    if (!value || value === 'all') return 'All';
    switch (type) {
      case 'employee': {
        const emp = filterOptions.employees.find(e => e.id === value);
        return emp?.name || 'Selected';
      }
      case 'product': {
        const prod = filterOptions.products.find(p => p.id === value);
        return prod?.name || 'Selected';
      }
      case 'supplier': {
        const sup = filterOptions.suppliers.find(s => s.id === value);
        return sup?.name || 'Selected';
      }
      case 'customer': {
        const cust = filterOptions.customers.find(c => c.id === value);
        return cust?.name || 'Selected';
      }
      case 'payment': {
        const pay = PAYMENT_OPTIONS.find(p => p.value === value);
        return pay?.label || 'Selected';
      }
      default: return 'All';
    }
  }, [filterOptions]);

  const getDateRangeLabel = useCallback(() => {
    const option = DATE_RANGE_OPTIONS.find(o => o.value === dateRange);
    if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
      return `${customDateRange.from} to ${customDateRange.to}`;
    }
    return option?.label || 'Last 30 Days';
  }, [dateRange, customDateRange]);

  // ==================== EXCEL EXPORT ====================
  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = buildQueryParams();
      const response = await reportsApi.getDashboard(params);
      const data = response.data.data;

      const wb = XLSX.utils.book_new();

      // 1. Summary Sheet
      const s = data.summary;
      const context = getFilterContext.type;
      
      let statsRows = [];
      if (context === 'employee') {
        statsRows = [
          ['Revenue Generated', formatCurrency(s.revenueGenerated || s.totalRevenue)],
          ['Orders Processed', s.ordersProcessed || s.ordersCompleted || 0],
          ['Customers Served', s.customersServed || s.activeCustomers || 0],
          ['Payments Collected', formatCurrency(s.paymentsCollected || 0)],
        ];
      } else if (context === 'product') {
        statsRows = [
          ['Revenue Generated', formatCurrency(s.totalRevenue)],
          ['Units Sold', s.unitsSold || 0],
          ['Stock Remaining', s.remainingStock || 0],
          ['Profit Generated', formatCurrency(s.profitGenerated || s.netProfit || 0)],
        ];
      } else if (context === 'supplier') {
        statsRows = [
          ['Total Purchased', formatCurrency(s.purchaseValue || s.totalRevenue || 0)],
          ['Purchase Cost', formatCurrency(s.purchaseCost || 0)],
          ['Outstanding Payment', formatCurrency(s.outstandingPayment || s.pendingPayments || 0)],
          ['Total Deliveries', s.totalDeliveries || s.deliveryCount || 0],
        ];
      } else if (context === 'customer') {
        statsRows = [
          ['Total Orders', s.totalOrders || s.orders || 0],
          ['Total Purchases', formatCurrency(s.totalPurchases || s.totalRevenue || 0)],
          ['Credit Remaining', formatCurrency(s.creditRemaining || s.creditOutstanding || 0)],
          ['Last Purchase', s.lastPurchase ? formatDate(s.lastPurchase) : 'N/A'],
        ];
      } else if (context === 'payment') {
        statsRows = [
          ['Total Cash Income', formatCurrency(s.totalCashIncome || s.totalRevenue || 0)],
          ['Total Online Income', formatCurrency(s.totalOnlineIncome || 0)],
          ['Customer Credit', formatCurrency(s.customerCreditRemaining || s.creditOutstanding || 0)],
          ['Supplier Outstanding', formatCurrency(s.supplierOutstandingPayment || s.pendingPayments || 0)],
        ];
      } else {
        statsRows = [
          ['Total Revenue', formatCurrency(s.totalRevenue)],
          ['Monthly Revenue', formatCurrency(s.monthlyRevenue)],
          ['Net Profit', formatCurrency(s.netProfit)],
          ['Orders Completed', s.ordersCompleted || 0],
          ['Inventory Value', formatCurrency(s.inventoryValue || 0)],
          ['Credit Outstanding', formatCurrency(s.creditOutstanding || 0)],
          ['Active Customers', s.activeCustomers || 0],
          ['Top Product', s.topProduct || 'N/A'],
          ['Revenue Growth', `${(s.revenueGrowth || 0).toFixed(1)}%`],
        ];
      }

      const summaryData = [
        ['INVENTORY MANAGEMENT SYSTEM - REPORT SUMMARY'],
        [''],
        ['Generated On:', new Date().toLocaleString()],
        ['Date Range:', getDateRangeLabel()],
        [''],
        ['EXECUTIVE SUMMARY'],
        [''],
        ['Metric', 'Value'],
        ...statsRows,
        [''],
        ['FILTERS APPLIED'],
        ['Date Range:', getDateRangeLabel()],
        ['Employee:', getFilterLabel('employee', activeFilter === 'employee' ? filterValue : 'all')],
        ['Product:', getFilterLabel('product', activeFilter === 'product' ? filterValue : 'all')],
        ['Supplier:', getFilterLabel('supplier', activeFilter === 'supplier' ? filterValue : 'all')],
        ['Customer:', getFilterLabel('customer', activeFilter === 'customer' ? filterValue : 'all')],
        ['Payment Method:', getFilterLabel('payment', activeFilter === 'payment' ? filterValue : 'all')],
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
      ws1['!cols'] = [{ wch: 25 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

      // 2. Transactions Sheet
      const config = getTableConfig;
      const tableData = config.data || [];
      
      if (tableData.length > 0) {
        const headers = config.columns;
        const rows = tableData.map((order) => {
          const row = config.renderRow(order);
          return headers.map(h => {
            const value = row[h] || '-';
            if (typeof value === 'string') {
              return value.replace(/\n/g, '; ').replace(/→/g, '->');
            }
            return value;
          });
        });
        
        const transactionData = [
          [config.title],
          [''],
          headers,
          ...rows,
          [''],
          ['Total Records:', tableData.length],
        ];
        
        const ws2 = XLSX.utils.aoa_to_sheet(transactionData);
        ws2['!cols'] = headers.map((h) => {
          if (h === 'Items (Qty × Rate = Total)' || h === 'Products (Qty)' || h === 'Products Sold' || h === 'Product') {
            return { wch: 45 };
          }
          return { wch: 18 };
        });
        XLSX.utils.book_append_sheet(wb, ws2, 'Transactions');
      }

      // 3. Revenue Trend Sheet
      if (data.revenueTrend && data.revenueTrend.length > 0) {
        const trendData = [
          ['REVENUE TREND'],
          [''],
          ['Period', 'Revenue (NPR)', 'Orders', 'Customers'],
          ...data.revenueTrend.map(item => [
            item.label || '',
            item.revenue || 0,
            item.orders || 0,
            item.customers || 0,
          ]),
        ];
        const ws3 = XLSX.utils.aoa_to_sheet(trendData);
        ws3['!cols'] = [{ wch: 20 }, { wch: 18 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws3, 'Revenue Trend');
      }

      // 4. Top Products Sheet
      if (data.topProducts && data.topProducts.length > 0) {
        const productData = [
          ['TOP PRODUCTS'],
          [''],
          ['Product', 'Units Sold', 'Revenue (NPR)', 'Unit', 'Stock'],
          ...data.topProducts.map(item => [
            item.name || 'Unknown',
            item.units || 0,
            item.revenue || 0,
            item.unit || 'piece',
            item.stock || 0,
          ]),
        ];
        const ws4 = XLSX.utils.aoa_to_sheet(productData);
        ws4['!cols'] = [{ wch: 25 }, { wch: 15 }, { wch: 18 }, { wch: 12 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, ws4, 'Top Products');
      }

      // 5. Payment Methods Sheet
      if (data.paymentMethods && data.paymentMethods.length > 0 && !(data.paymentMethods.length === 1 && data.paymentMethods[0].name === 'No Data')) {
        const paymentData = [
          ['PAYMENT METHODS'],
          [''],
          ['Method', 'Amount (NPR)'],
          ...data.paymentMethods.map(item => [
            item.name || 'Unknown',
            item.value || 0,
          ]),
        ];
        const ws5 = XLSX.utils.aoa_to_sheet(paymentData);
        ws5['!cols'] = [{ wch: 20 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws5, 'Payment Methods');
      }

      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `report-${formatDate(new Date())}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Report exported as Excel');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export as Excel');
    } finally {
      setExporting(false);
    }
  };

  // ==================== PRINT / PDF ====================
  const handlePrint = async () => {
    setPrinting(true);
    
    const printWindow = window.open('', '_blank', 'width=1200,height=800');
    if (!printWindow) {
      toast.error('Please allow popups for printing');
      setPrinting(false);
      return;
    }

    try {
      const revenueChartElement = document.getElementById('revenueChart');
      const weeklyChartElement = document.getElementById('weeklyChart');
      const paymentChartElement = document.getElementById('paymentChart');

      let revenueImage = '';
      let weeklyImage = '';
      let paymentImage = '';

      if (revenueChartElement) {
        revenueImage = await toPng(revenueChartElement, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: 'white',
        });
      }

      if (weeklyChartElement) {
        weeklyImage = await toPng(weeklyChartElement, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: 'white',
        });
      }

      if (paymentChartElement) {
        paymentImage = await toPng(paymentChartElement, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: 'white',
        });
      }

      const context = getFilterContext;
      const config = getTableConfig;
      const tableData = config.data || [];
      const rows = tableData.slice(0, 20).map((order) => config.renderRow(order));
      const headers = config.columns;

      const s = reportData.summary;
      const contextType = context.type;

      let statsHTML = '';
      if (contextType === 'employee') {
        statsHTML = `
          <div class="stat-card"><div class="stat-title">Revenue Generated</div><div class="stat-value">${formatCurrency(s.revenueGenerated || s.totalRevenue)}</div></div>
          <div class="stat-card"><div class="stat-title">Orders Processed</div><div class="stat-value">${s.ordersProcessed || s.ordersCompleted || 0}</div></div>
          <div class="stat-card"><div class="stat-title">Customers Served</div><div class="stat-value">${s.customersServed || s.activeCustomers || 0}</div></div>
          <div class="stat-card"><div class="stat-title">Payments Collected</div><div class="stat-value">${formatCurrency(s.paymentsCollected || 0)}</div></div>
        `;
      } else if (contextType === 'product') {
        statsHTML = `
          <div class="stat-card"><div class="stat-title">Revenue Generated</div><div class="stat-value">${formatCurrency(s.totalRevenue)}</div></div>
          <div class="stat-card"><div class="stat-title">Units Sold</div><div class="stat-value">${s.unitsSold || 0}</div></div>
          <div class="stat-card"><div class="stat-title">Stock Remaining</div><div class="stat-value">${s.remainingStock || 0}</div></div>
          <div class="stat-card"><div class="stat-title">Profit Generated</div><div class="stat-value">${formatCurrency(s.profitGenerated || s.netProfit || 0)}</div></div>
        `;
      } else if (contextType === 'supplier') {
        statsHTML = `
          <div class="stat-card"><div class="stat-title">Total Purchased</div><div class="stat-value">${formatCurrency(s.purchaseValue || s.totalRevenue || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Purchase Cost</div><div class="stat-value">${formatCurrency(s.purchaseCost || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Outstanding Payment</div><div class="stat-value">${formatCurrency(s.outstandingPayment || s.pendingPayments || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Total Deliveries</div><div class="stat-value">${s.totalDeliveries || s.deliveryCount || 0}</div></div>
        `;
      } else if (contextType === 'customer') {
        statsHTML = `
          <div class="stat-card"><div class="stat-title">Total Orders</div><div class="stat-value">${s.totalOrders || s.orders || 0}</div></div>
          <div class="stat-card"><div class="stat-title">Total Purchases</div><div class="stat-value">${formatCurrency(s.totalPurchases || s.totalRevenue || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Credit Remaining</div><div class="stat-value">${formatCurrency(s.creditRemaining || s.creditOutstanding || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Last Purchase</div><div class="stat-value">${s.lastPurchase ? formatDate(s.lastPurchase) : 'N/A'}</div></div>
        `;
      } else if (contextType === 'payment') {
        statsHTML = `
          <div class="stat-card"><div class="stat-title">Total Cash Income</div><div class="stat-value">${formatCurrency(s.totalCashIncome || s.totalRevenue || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Total Online Income</div><div class="stat-value">${formatCurrency(s.totalOnlineIncome || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Customer Credit</div><div class="stat-value">${formatCurrency(s.customerCreditRemaining || s.creditOutstanding || 0)}</div></div>
          <div class="stat-card"><div class="stat-title">Supplier Outstanding</div><div class="stat-value">${formatCurrency(s.supplierOutstandingPayment || s.pendingPayments || 0)}</div></div>
        `;
      } else {
        statsHTML = `
          <div class="stat-card"><div class="stat-title">Total Revenue</div><div class="stat-value">${formatCurrency(s.totalRevenue)}</div></div>
          <div class="stat-card"><div class="stat-title">Monthly Revenue</div><div class="stat-value">${formatCurrency(s.monthlyRevenue)}</div></div>
          <div class="stat-card"><div class="stat-title">Net Profit</div><div class="stat-value">${formatCurrency(s.netProfit)}</div></div>
          <div class="stat-card"><div class="stat-title">Orders Completed</div><div class="stat-value">${s.ordersCompleted}</div></div>
          <div class="stat-card"><div class="stat-title">Inventory Value</div><div class="stat-value">${formatCurrency(s.inventoryValue)}</div></div>
          <div class="stat-card"><div class="stat-title">Credit Outstanding</div><div class="stat-value">${formatCurrency(s.creditOutstanding)}</div></div>
          <div class="stat-card"><div class="stat-title">Active Customers</div><div class="stat-value">${s.activeCustomers}</div></div>
          <div class="stat-card"><div class="stat-title">Top Product</div><div class="stat-value">${s.topProduct}</div></div>
        `;
      }

      const printContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Fusion Water Industries - Report</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body { 
                font-family: 'Segoe UI', Arial, sans-serif; 
                padding: 40px; 
                color: #1a1a1a;
                background: white;
              }
              .report-container { max-width: 1200px; margin: 0 auto; }
              
              .header { 
                text-align: center; 
                padding: 30px 0 20px 0;
                border-bottom: 3px double #1a1a1a;
                margin-bottom: 25px;
              }
              .header h1 { 
                font-size: 28px; 
                font-weight: 700; 
                letter-spacing: 2px;
                color: #1a1a1a;
              }
              .header h2 { 
                font-size: 18px; 
                font-weight: 500; 
                color: #4a4a4a;
                margin-top: 5px;
              }
              .header .generated-on {
                font-size: 13px;
                color: #666;
                margin-top: 8px;
              }
              
              .filters-section {
                background: #f5f7fa;
                padding: 15px 20px;
                border-radius: 8px;
                margin-bottom: 25px;
                border: 1px solid #e2e8f0;
              }
              .filters-section h3 {
                font-size: 14px;
                font-weight: 600;
                color: #4a4a4a;
                margin-bottom: 8px;
              }
              .filters-grid {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px 20px;
              }
              .filter-item {
                font-size: 13px;
                display: flex;
                justify-content: space-between;
                padding: 2px 0;
              }
              .filter-item .label { color: #666; font-weight: 500; }
              .filter-item .value { color: #1a1a1a; font-weight: 600; }
              
              .summary-section {
                margin-bottom: 25px;
              }
              .summary-section h3 {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
                margin-bottom: 12px;
              }
              .stats-grid {
                display: grid;
                grid-template-columns: repeat(4, 1fr);
                gap: 12px;
              }
              .stat-card {
                background: #f8fafc;
                padding: 12px 15px;
                border-radius: 6px;
                border: 1px solid #e2e8f0;
              }
              .stat-card .stat-title {
                font-size: 11px;
                color: #666;
                font-weight: 500;
                text-transform: uppercase;
                letter-spacing: 0.5px;
              }
              .stat-card .stat-value {
                font-size: 18px;
                font-weight: 700;
                color: #1a1a1a;
                margin-top: 2px;
              }
              
              .table-section {
                margin-bottom: 25px;
              }
              .table-section h3 {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
                margin-bottom: 12px;
              }
              .table-container {
                overflow-x: auto;
                border: 1px solid #e2e8f0;
                border-radius: 6px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
              }
              table th {
                background: #f1f4f8;
                padding: 8px 12px;
                text-align: left;
                font-weight: 600;
                border-bottom: 2px solid #d1d5db;
                white-space: nowrap;
              }
              table td {
                padding: 8px 12px;
                border-bottom: 1px solid #e5e7eb;
                vertical-align: top;
              }
              table tr:nth-child(even) { background: #f9fafb; }
              .product-list { line-height: 1.6; }
              .product-item { display: block; white-space: nowrap; }
              
              .chart-image {
                width: 100%;
                height: auto;
                max-height: 300px;
                object-fit: contain;
              }
              
              .charts-section {
                margin-bottom: 25px;
              }
              .charts-section h3 {
                font-size: 16px;
                font-weight: 600;
                color: #1a1a1a;
                padding-bottom: 8px;
                border-bottom: 2px solid #e2e8f0;
                margin-bottom: 12px;
              }
              .charts-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
              }
              .chart-box {
                border: 1px solid #e2e8f0;
                border-radius: 6px;
                padding: 15px;
                background: #fafbfc;
              }
              .chart-box h4 {
                font-size: 13px;
                font-weight: 600;
                color: #4a4a4a;
                margin-bottom: 8px;
              }
              
              .footer {
                text-align: center;
                padding-top: 20px;
                border-top: 2px solid #e2e8f0;
                margin-top: 25px;
                font-size: 12px;
                color: #888;
                font-weight: 500;
              }
              
              @media print {
                body { padding: 20px; }
                .no-print { display: none; }
                .stats-grid { grid-template-columns: repeat(4, 1fr); }
                .charts-grid { grid-template-columns: 1fr 1fr; }
                .chart-image {
                  max-height: 250px;
                }
              }
            </style>
          </head>
          <body>
            <div class="report-container">
              <!-- HEADER -->
              <div class="header">
                <h1>FUSION WATER INDUSTRIES</h1>
                <h2>INVENTORY MANAGEMENT SYSTEM</h2>
                <h2 style="font-size:16px; color:#666; font-weight:400;">REPORTS &amp; ANALYTICS</h2>
                <div class="generated-on">Generated On : ${new Date().toLocaleString('en-US', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })}</div>
              </div>

              <!-- FILTERS -->
              <div class="filters-section">
                <h3>📋 Filters</h3>
                <div class="filters-grid">
                  <div class="filter-item">
                    <span class="label">Date :</span>
                    <span class="value">${getDateRangeLabel()}</span>
                  </div>
                  <div class="filter-item">
                    <span class="label">Employee :</span>
                    <span class="value">${getFilterLabel('employee', activeFilter === 'employee' ? filterValue : 'all')}</span>
                  </div>
                  <div class="filter-item">
                    <span class="label">Product :</span>
                    <span class="value">${getFilterLabel('product', activeFilter === 'product' ? filterValue : 'all')}</span>
                  </div>
                  <div class="filter-item">
                    <span class="label">Supplier :</span>
                    <span class="value">${getFilterLabel('supplier', activeFilter === 'supplier' ? filterValue : 'all')}</span>
                  </div>
                  <div class="filter-item">
                    <span class="label">Customer :</span>
                    <span class="value">${getFilterLabel('customer', activeFilter === 'customer' ? filterValue : 'all')}</span>
                  </div>
                  <div class="filter-item">
                    <span class="label">Payment Method :</span>
                    <span class="value">${getFilterLabel('payment', activeFilter === 'payment' ? filterValue : 'all')}</span>
                  </div>
                </div>
              </div>

              <!-- SUMMARY -->
              <div class="summary-section">
                <h3>📊 Executive Summary</h3>
                <div class="stats-grid">
                  ${statsHTML}
                </div>
              </div>

              <!-- TRANSACTION TABLE -->
              <div class="table-section">
                <h3>📋 ${config.title}</h3>
                <div class="table-container">
                  <table>
                    <thead>
                      <tr>
                        ${headers.map(h => `<th>${h}</th>`).join('')}
                      </tr>
                    </thead>
                    <tbody>
                      ${rows.map(row => `
                        <tr>
                          ${headers.map(h => {
                            const value = row[h] || '-';
                            const isProductList = typeof value === 'string' && (value.includes('→') || value.includes('\n'));
                            if (isProductList) {
                              const products = value.split('\n');
                              return `<td><div class="product-list">${products.map(p => `<span class="product-item">${p}</span>`).join('')}</div></td>`;
                            }
                            return `<td>${value}</td>`;
                          }).join('')}
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
                  ${tableData.length > 20 ? `<div style="padding:8px 12px; font-size:11px; color:#666; background:#f9fafb; border-top:1px solid #e5e7eb;">Showing 20 of ${tableData.length} records</div>` : ''}
                </div>
              </div>

              <!-- CHARTS -->
              <div class="charts-section">
                <h3>📈 Trends & Analytics</h3>
                <div class="charts-grid">
                  <div class="chart-box">
                    <h4>Revenue Trend</h4>
                    ${revenueImage ? `<img src="${revenueImage}" class="chart-image" alt="Revenue Trend Chart" />` : '<div style="text-align:center;color:#999;padding:20px;">Chart not available</div>'}
                  </div>
                  <div class="chart-box">
                    <h4>Weekly Performance</h4>
                    ${weeklyImage ? `<img src="${weeklyImage}" class="chart-image" alt="Weekly Performance Chart" />` : '<div style="text-align:center;color:#999;padding:20px;">Chart not available</div>'}
                  </div>
                </div>
              </div>

              <!-- PAYMENT CHART -->
              <div class="charts-section" style="margin-top:20px;">
                <div class="charts-grid">
                  <div class="chart-box" style="grid-column: 1 / -1;">
                    <h4>Payment Distribution</h4>
                    ${paymentImage ? `<img src="${paymentImage}" class="chart-image" alt="Payment Distribution Chart" />` : '<div style="text-align:center;color:#999;padding:20px;">Chart not available</div>'}
                  </div>
                </div>
              </div>

              <!-- FOOTER -->
              <div class="footer">
                Generated by Inventory Management System &bull; ${new Date().toLocaleString()}
              </div>
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(printContent);
      printWindow.document.close();
      
    } catch (error) {
      console.error('Print error:', error);
      toast.error('Failed to capture charts for printing');
      printWindow.close();
    } finally {
      setTimeout(() => {
        setPrinting(false);
      }, 2000);
    }
  };

  const getFilterContext = useMemo(() => {
    if (!activeFilter || filterValue === 'all') {
      return { type: 'overview', label: 'Overview', hasFilters: false };
    }
    
    const getLabel = () => {
      switch (activeFilter) {
        case 'employee': {
          const emp = filterOptions.employees.find(e => e.id === filterValue);
          return `Employee: ${emp?.name || 'Selected'}`;
        }
        case 'product': {
          const prod = filterOptions.products.find(p => p.id === filterValue);
          return `Product: ${prod?.name || 'Selected'}`;
        }
        case 'supplier': {
          const sup = filterOptions.suppliers.find(s => s.id === filterValue);
          return `Supplier: ${sup?.name || 'Selected'}`;
        }
        case 'customer': {
          const cust = filterOptions.customers.find(c => c.id === filterValue);
          return `Customer: ${cust?.name || 'Selected'}`;
        }
        case 'payment': {
          const pay = PAYMENT_OPTIONS.find(p => p.value === filterValue);
          return `Payment: ${pay?.label || 'Selected'}`;
        }
        default: return 'Filtered';
      }
    };
    
    return { type: activeFilter, label: getLabel(), hasFilters: true };
  }, [activeFilter, filterValue, filterOptions]);

  const getTableConfig = useMemo(() => {
    const configs = {
      overview: {
        title: 'Recent Business Transactions',
        columns: ['Date', 'Order No', 'Customer', 'Employee', 'Products (Qty)', 'Payment', 'Total'],
        data: reportData.filteredOrders || [],
        renderRow: (order) => ({
          Date: formatDate(order.date),
          'Order No': order.orderNumber || `#${order.id?.slice(-6)}`,
          Customer: order.customer || 'N/A',
          Employee: order.createdBy || 'System',
          'Products (Qty)': order.items ? formatProductQuantities(order.items) : (order.product || 'N/A'),
          Payment: order.paymentMethod || 'N/A',
          Total: formatCurrency(order.totalAmount || 0),
        }),
      },
      employee: {
        title: 'Employee Performance Details',
        columns: ['Date', 'Invoice', 'Customer', 'Products Sold', 'Orders', 'Revenue', 'Payment Collected'],
        data: reportData.filteredOrders || [],
        renderRow: (order) => ({
          Date: formatDate(order.date),
          Invoice: order.orderNumber || `#${order.id?.slice(-6)}`,
          Customer: order.customer || 'N/A',
          'Products Sold': order.items ? formatProductQuantities(order.items) : (order.product || 'N/A'),
          Orders: 1,
          Revenue: formatCurrency(order.totalAmount || 0),
          'Payment Collected': formatCurrency(order.payment?.amount || order.totalAmount || 0),
        }),
      },
      product: {
        title: 'Product Sales History',
        columns: ['Date', 'Customer', 'Employee', 'Quantity Sold', 'Unit Price', 'Revenue', 'Remaining Stock'],
        data: reportData.filteredOrders || [],
        renderRow: (order) => {
          const item = order.items?.[0] || {};
          return {
            Date: formatDate(order.date),
            Customer: order.customer || 'N/A',
            Employee: order.createdBy || 'System',
            'Quantity Sold': item.quantity || order.quantity || 0,
            'Unit Price': formatCurrency(item.unitPrice || 0),
            Revenue: formatCurrency(order.totalAmount || 0),
            'Remaining Stock': item.product?.stock || item.product?.currentStock || 0,
          };
        },
      },
      supplier: {
        title: 'Supplier Purchase History',
        columns: ['Date', 'Purchase No', 'Supplier', 'Items (Qty × Rate = Total)', 'Total', 'Paid', 'Outstanding'],
        data: reportData.filteredOrders || [],
        renderRow: (order) => {
          if (order.isPurchaseOrder) {
            const itemsDisplay = order.items && order.items.length > 0 
              ? order.items.map(item => 
                  `${item.name} → ${item.quantity} × ${formatCurrency(item.unitPrice)} = ${formatCurrency(item.totalPrice)}`
                ).join('\n')
              : order.product || 'N/A';
            
            return {
              Date: formatDate(order.date),
              'Purchase No': order.orderNumber || `#${order.id?.slice(-6)}`,
              Supplier: order.supplier || 'N/A',
              'Items (Qty × Rate = Total)': itemsDisplay,
              Total: formatCurrency(order.totalAmount || 0),
              Paid: formatCurrency(order.totalPaid || 0),
              Outstanding: formatCurrency(order.outstanding || 0),
            };
          }
          const item = order.items?.[0] || {};
          return {
            Date: formatDate(order.date),
            'Purchase No': order.orderNumber || `#${order.id?.slice(-6)}`,
            Supplier: order.customer || 'N/A',
            'Items (Qty × Rate = Total)': item.name || order.product || 'N/A',
            Total: formatCurrency(order.totalAmount || 0),
            Paid: formatCurrency(order.payment?.amount || 0),
            Outstanding: formatCurrency((order.totalAmount || 0) - (order.payment?.amount || 0)),
          };
        },
      },
      customer: {
        title: 'Customer Purchase History',
        columns: ['Date', 'Invoice', 'Products (Qty)', 'Total', 'Paid', 'Credit Remaining'],
        data: reportData.filteredOrders || [],
        renderRow: (order) => ({
          Date: formatDate(order.date),
          Invoice: order.orderNumber || `#${order.id?.slice(-6)}`,
          'Products (Qty)': order.items ? formatProductQuantities(order.items) : (order.product || 'N/A'),
          Total: formatCurrency(order.totalAmount || 0),
          Paid: formatCurrency(order.paidAmount !== undefined && order.paidAmount !== null 
            ? order.paidAmount 
            : (order.payment?.amount || 0)),
          'Credit Remaining': formatCurrency(order.creditRemaining !== undefined && order.creditRemaining !== null
            ? order.creditRemaining
            : ((order.totalAmount || 0) - (order.payment?.amount || 0))),
        }),
      },
      payment: {
        title: 'Payment Transactions',
        columns: ['Date', 'Transaction ID', 'Customer/Supplier', 'Type', 'Method', 'Incoming', 'Outgoing', 'Balance'],
        data: reportData.filteredOrders || [],
        renderRow: (order) => {
          const isIncoming = order.paymentMethod !== 'credit' && order.paymentStatus === 'COMPLETED';
          const amount = order.totalAmount || 0;
          return {
            Date: formatDate(order.date),
            'Transaction ID': order.orderNumber || `#${order.id?.slice(-6)}`,
            'Customer/Supplier': order.customer || 'N/A',
            Type: isIncoming ? 'Customer Payment' : 'Supplier Payment',
            Method: order.paymentMethod || 'N/A',
            Incoming: isIncoming ? formatCurrency(amount) : '-',
            Outgoing: !isIncoming ? formatCurrency(amount) : '-',
            Balance: isIncoming ? formatCurrency(amount) : formatCurrency(-amount),
          };
        },
      },
    };
    return configs[getFilterContext.type] || configs.overview;
  }, [getFilterContext.type, reportData.filteredOrders, formatProductQuantities]);

  // ==================== STAT CARD COMPONENT ====================
  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'blue' }) => {
    const isPositive = trend?.startsWith('+') || (trend && !trend.startsWith('-') && trend !== '0%');
    const TrendIcon = isPositive ? TrendingUp : TrendingDown;
    const trendColor = isPositive ? 'text-green-600' : 'text-red-600';
    const colorClasses = {
      blue: 'bg-blue-100 text-blue-600',
      green: 'bg-green-100 text-green-600',
      purple: 'bg-purple-100 text-purple-600',
      orange: 'bg-orange-100 text-orange-600',
      indigo: 'bg-indigo-100 text-indigo-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      teal: 'bg-teal-100 text-teal-600',
      red: 'bg-red-100 text-red-600',
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-500">{title}</p>
              <p className="text-2xl font-bold mt-1">{value}</p>
              {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
              {trend && (
                <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
                  <TrendIcon className="h-3 w-3" />
                  <span className="text-xs font-medium">{trend}</span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl ${colorClasses[color]}`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ==================== FILTER SELECTOR ====================
  const FilterSelector = () => {
    const filterTypes = [
      { key: 'employee', label: 'Employee', icon: User, options: filterOptions.employees || [], optionKey: 'id', optionLabel: 'name', show: (filterOptions.employees || []).length > 0 },
      { key: 'product', label: 'Product', icon: Package, options: filterOptions.products || [], optionKey: 'id', optionLabel: 'name' },
      { key: 'supplier', label: 'Supplier', icon: Truck, options: filterOptions.suppliers || [], optionKey: 'id', optionLabel: 'name' },
      { key: 'customer', label: 'Customer', icon: Users, options: filterOptions.customers || [], optionKey: 'id', optionLabel: 'name' },
      { key: 'payment', label: 'Payment', icon: CreditCard, options: PAYMENT_OPTIONS, optionKey: 'value', optionLabel: 'label' },
    ];

    const visibleFilters = filterTypes.filter(f => f.show !== false);

    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Filter by:</span>
        {visibleFilters.map(({ key, label, icon: Icon, options, optionKey, optionLabel }) => {
          const safeOptions = Array.isArray(options) ? options : [];
          const isActive = activeFilter === key;
          const selectedLabel = isActive && filterValue !== 'all' 
            ? safeOptions.find(opt => opt[optionKey] === filterValue)?.[optionLabel] || 'Selected'
            : 'All';
          
          return (
            <div key={key} className={`relative min-w-[140px] ${isActive ? 'ring-2 ring-blue-500 rounded-md' : ''}`}>
              <Button 
                variant={isActive ? 'default' : 'outline'} 
                size="sm" 
                className={`gap-1 text-xs w-full justify-between ${isActive ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
              >
                <span className="flex items-center gap-1"><Icon className="h-3 w-3" />{label}</span>
                <span className={`max-w-[80px] truncate ${isActive ? 'text-white' : 'text-gray-400'}`}>{selectedLabel}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
              <select 
                value={isActive ? filterValue : 'all'} 
                onChange={(e) => setFilter(key, e.target.value)}
                className="absolute inset-0 opacity-0 cursor-pointer w-full"
              >
                <option value="all">All {label}s</option>
                {safeOptions.map((opt) => (
                  <option key={opt[optionKey]} value={opt[optionKey]}>{opt[optionLabel]}</option>
                ))}
              </select>
            </div>
          );
        })}
        
        {activeFilter && filterValue !== 'all' && (
          <Button variant="ghost" size="sm" className="gap-1 text-red-500 hover:text-red-700" onClick={clearAllFilters}>
            <X className="h-3 w-3" /> Clear Filter
          </Button>
        )}
      </div>
    );
  };

  // ==================== EXPORT / PRINT BUTTONS ====================
  const ActionButtons = () => {
    return (
      <div className="flex items-center gap-2">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2" 
          onClick={handlePrint}
          disabled={printing || loading}
        >
          <Printer className="h-4 w-4" />
          {printing ? 'Preparing...' : 'Print / PDF'}
        </Button>

        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2" 
          onClick={handleExportExcel}
          disabled={exporting}
        >
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          {exporting ? 'Exporting...' : 'Export as Excel'}
        </Button>
      </div>
    );
  };

  // ==================== RENDER FUNCTIONS ====================

  // 1. STAT CARDS
  const renderStatCards = () => {
    const s = reportData.summary;
    const context = getFilterContext.type;

    if (context === 'employee') {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Revenue Generated" value={formatCurrency(s.revenueGenerated || s.totalRevenue)} subtitle="By this employee" trend={`+${(s.revenueGrowth || 0).toFixed(1)}%`} icon={DollarSign} color="blue" />
          <StatCard title="Orders Processed" value={s.ordersProcessed || s.ordersCompleted || 0} subtitle="Total orders handled" icon={ShoppingCart} color="green" />
          <StatCard title="Customers Served" value={s.customersServed || s.activeCustomers || 0} subtitle="Unique customers" icon={Users} color="purple" />
          <StatCard title="Payments Collected" value={formatCurrency(s.paymentsCollected || 0)} subtitle="Credit collections" icon={CreditCard} color="orange" />
        </div>
      );
    }

    if (context === 'product') {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Revenue Generated" value={formatCurrency(s.totalRevenue)} subtitle="From this product" trend={`+${(s.revenueGrowth || 0).toFixed(1)}%`} icon={DollarSign} color="blue" />
          <StatCard title="Units Sold" value={s.unitsSold || 0} subtitle="Total quantity sold" icon={Package} color="green" />
          <StatCard title="Stock Remaining" value={s.remainingStock || 0} subtitle="Current inventory" icon={Package} color="orange" />
          <StatCard title="Profit Generated" value={formatCurrency(s.profitGenerated || s.netProfit || 0)} subtitle="Estimated profit" icon={TrendingUp} color="purple" />
        </div>
      );
    }

    if (context === 'supplier') {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Purchased" value={formatCurrency(s.purchaseValue || s.totalRevenue || 0)} subtitle="Total purchase value" icon={DollarSign} color="blue" />
          <StatCard title="Purchase Cost" value={formatCurrency(s.purchaseCost || 0)} subtitle="Total cost" icon={Wallet} color="green" />
          <StatCard title="Outstanding Payment" value={formatCurrency(s.outstandingPayment || s.pendingPayments || 0)} subtitle="Amount owed" icon={CreditCard} color="yellow" />
          <StatCard title="Total Deliveries" value={s.totalDeliveries || s.deliveryCount || 0} subtitle="Deliveries received" icon={Truck} color="purple" />
        </div>
      );
    }

    if (context === 'customer') {
      return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Orders" value={s.totalOrders || s.orders || 0} subtitle="Orders placed" icon={ShoppingCart} color="blue" />
          <StatCard title="Total Purchases" value={formatCurrency(s.totalPurchases || s.totalRevenue || 0)} subtitle="Lifetime value" icon={DollarSign} color="green" />
          <StatCard title="Credit Remaining" value={formatCurrency(s.creditRemaining || s.creditOutstanding || 0)} subtitle="Outstanding balance" icon={CreditCard} color="yellow" />
          <StatCard title="Last Purchase" value={s.lastPurchase ? formatDate(s.lastPurchase) : 'N/A'} subtitle="Most recent order" icon={Calendar} color="purple" />
        </div>
      );
    }

    if (context === 'payment') {
      return (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total Cash Income" value={formatCurrency(s.totalCashIncome || s.totalRevenue || 0)} subtitle="Cash payments" icon={Banknote} color="green" />
            <StatCard title="Total Online Income" value={formatCurrency(s.totalOnlineIncome || 0)} subtitle="Online payments" icon={CreditCard} color="blue" />
            <StatCard title="Customer Credit" value={formatCurrency(s.customerCreditRemaining || s.creditOutstanding || 0)} subtitle="Outstanding credit" icon={Wallet} color="yellow" />
            <StatCard title="Supplier Outstanding" value={formatCurrency(s.supplierOutstandingPayment || s.pendingPayments || 0)} subtitle="Amount owed to suppliers" icon={Building} color="orange" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard title="Incoming Cash" value={formatCurrency(s.incomingCash || s.totalRevenue || 0)} subtitle="Cash inflow" icon={TrendingUp} color="green" />
            <StatCard title="Outgoing Cash" value={formatCurrency(s.outgoingCash || 0)} subtitle="Cash outflow" icon={TrendingDown} color="red" />
            <StatCard title="Net Cash Flow" value={formatCurrency(s.netCashFlow || 0)} subtitle="Cash position" icon={Wallet} color={s.netCashFlow > 0 ? 'teal' : 'red'} />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Total Revenue" value={formatCurrency(s.totalRevenue)} subtitle="Year to date" trend={`+${(s.revenueGrowth || 0).toFixed(1)}%`} icon={DollarSign} color="blue" />
          <StatCard title="Monthly Revenue" value={formatCurrency(s.monthlyRevenue)} subtitle="Current month" icon={TrendingUp} color="green" />
          <StatCard title="Net Profit" value={formatCurrency(s.netProfit)} subtitle="Year to date" icon={TrendingUp} color="purple" />
          <StatCard title="Orders Completed" value={s.ordersCompleted} subtitle="Total orders" icon={ShoppingCart} color="orange" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard title="Inventory Value" value={formatCurrency(s.inventoryValue)} subtitle="Current stock value" icon={Package} color="indigo" />
          <StatCard title="Credit Outstanding" value={formatCurrency(s.creditOutstanding)} subtitle="Pending payments" icon={CreditCard} color="yellow" />
          <StatCard title="Active Customers" value={s.activeCustomers} subtitle="Last 30 days" icon={Users} color="teal" />
          <StatCard title="Top Product" value={s.topProduct} subtitle="Best selling item" icon={Award} color="red" />
        </div>
      </>
    );
  };

  // ==================== FIXED: TRANSACTION TABLE with Pagination ====================
  const renderTransactionTable = () => {
    const config = getTableConfig;
    const data = config.data || [];
    
    // Use server-side pagination info
    const pagination = reportData.pagination || { total: 0, page: 1, limit: 10, totalPages: 0 };
    const totalItems = pagination.total || data.length;
    const totalPages = pagination.totalPages || Math.ceil(totalItems / pageSize);
    const currentPage = pagination.page || 1;
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = Math.min(startIndex + pageSize, totalItems);

    // Use the data from server (already paginated) or fallback to client-side slicing
    const displayData = data;

    if (totalItems === 0) {
      return (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-center justify-center text-gray-500">No transactions found for this period</div>
          </CardContent>
        </Card>
      );
    }

    const headers = config.columns;
    const rows = displayData.map((order, index) => config.renderRow(order));

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
              <p className="text-xs text-gray-500">
                Showing {totalItems > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, totalItems)} of {totalItems} records
              </p>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                className="text-xs border rounded px-2 py-1 bg-white"
              >
                <option value={5}>5 per page</option>
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header, idx) => (
                    <TableHead key={idx} className="text-xs whitespace-nowrap">{header}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length > 0 ? (
                  rows.map((row, idx) => (
                    <TableRow key={idx} className="hover:bg-gray-50">
                      {headers.map((header, colIdx) => {
                        const value = row[header] || '-';
                        const isMultiline = typeof value === 'string' && value.includes('\n');
                        return (
                          <TableCell key={colIdx} className="text-xs">
                            {isMultiline ? (
                              <div className="whitespace-pre-line">
                                {value}
                              </div>
                            ) : (
                              <span className="whitespace-nowrap">{value}</span>
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={headers.length} className="text-center py-4 text-gray-500">
                      No records found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Pagination Controls - Show when total items > page size OR totalPages > 1 */}
          {(totalItems > pageSize || totalPages > 1) && (
            <div className="flex items-center justify-between p-3 border-t flex-wrap gap-2">
              <div className="text-xs text-gray-500">
                Page {currentPage} of {totalPages}
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className="h-8 px-3"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                
                {/* Page numbers - show up to 7 pages */}
                {Array.from({ length: Math.min(7, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 7) {
                    pageNum = i + 1;
                  } else if (currentPage <= 4) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 3) {
                    pageNum = totalPages - 6 + i;
                  } else {
                    pageNum = currentPage - 3 + i;
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className="h-8 w-8 min-w-[32px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className="h-8 px-3"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  // 3. REVENUE TREND CHART
  const renderRevenueTrendChart = () => {
    const data = reportData.revenueTrend || [];
    const context = getFilterContext.type;

    if (data.length === 0) {
      return <Card className="lg:col-span-2"><CardContent className="h-72 flex items-center justify-center text-gray-500">No trend data available</CardContent></Card>;
    }

    const chartConfigs = {
      overview: { title: 'Revenue & Orders Trend', subtitle: 'Business growth over time' },
      employee: { title: 'Revenue & Orders Over Time', subtitle: 'Employee performance trend' },
      product: { title: 'Sales & Units Trend', subtitle: 'Revenue and units sold over time' },
      supplier: { title: 'Purchase Trend', subtitle: 'Purchase value over time' },
      customer: { title: 'Customer Purchase History', subtitle: 'Purchase amount over time' },
      payment: { title: 'Cash Flow Trend', subtitle: 'Incoming and outgoing cash' },
    };

    const config = chartConfigs[context] || chartConfigs.overview;
    const isPayment = context === 'payment';

    if (isPayment) {
      const paymentData = data.map((item) => ({
        ...item,
        incoming: item.revenue * (0.6 + Math.random() * 0.3),
        outgoing: item.revenue * (0.3 + Math.random() * 0.3),
      }));

      return (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                <p className="text-xs text-gray-500">{config.subtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div id="revenueChart" className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={paymentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value, name) => {
                    if (name === 'Incoming' || name === 'Outgoing') return formatCurrency(value);
                    return value;
                  }} />
                  <Legend />
                  <Bar dataKey="incoming" fill="#10B981" name="Incoming" barSize={20} />
                  <Bar dataKey="outgoing" fill="#EF4444" name="Outgoing" barSize={20} />
                  <Line type="monotone" dataKey="incoming" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 3 }} />
                  <Line type="monotone" dataKey="outgoing" stroke="#DC2626" strokeWidth={2} dot={{ fill: '#DC2626', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (context === 'supplier') {
      return (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                <p className="text-xs text-gray-500">{config.subtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div id="revenueChart" className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#8B5CF6" name="Purchase Value" barSize={30} />
                  <Line type="monotone" dataKey="revenue" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (context === 'customer') {
      return (
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
                <p className="text-xs text-gray-500">{config.subtitle}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div id="revenueChart" className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="revenue" fill="#10B981" name="Purchase Amount" barSize={30} />
                  <Line type="monotone" dataKey="revenue" stroke="#059669" strokeWidth={2} dot={{ fill: '#059669', r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="lg:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-xs text-gray-600">Revenue</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-green-500"></div>
                <span className="text-xs text-gray-600">Orders</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div id="revenueChart" className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" label={{ value: 'Revenue (NPR)', angle: -90, position: 'insideLeft', style: { fontSize: 11 } }} />
                <YAxis yAxisId="right" orientation="right" label={{ value: 'Orders', angle: 90, position: 'insideRight', style: { fontSize: 11 } }} />
                <Tooltip formatter={(value, name) => {
                  if (name === 'Revenue') return formatCurrency(value);
                  return value;
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="revenue" fill="#3B82F6" name="Revenue" barSize={25} />
                <Line yAxisId="right" type="monotone" dataKey="orders" stroke="#10B981" name="Orders" strokeWidth={2} dot={{ fill: '#10B981', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 4. WEEKLY PERFORMANCE CHART
  const renderWeeklyTrend = () => {
    const data = reportData.weeklyTrend || [];
    const context = getFilterContext.type;

    if (data.length === 0) {
      return <Card><CardContent className="h-48 flex items-center justify-center text-gray-500">No weekly data available</CardContent></Card>;
    }

    const chartConfigs = {
      overview: { title: 'Weekly Performance', subtitle: 'Orders and revenue over time' },
      employee: { title: 'Weekly Employee Performance', subtitle: 'Orders processed by employee' },
      product: { title: 'Weekly Product Sales', subtitle: 'Weekly sales of this product' },
      supplier: { title: 'Weekly Purchases', subtitle: 'Products purchased each week' },
      customer: { title: 'Weekly Customer Orders', subtitle: 'Orders placed by customer' },
      payment: { title: 'Weekly Payment Activity', subtitle: 'Daily payment activity' },
    };

    const config = chartConfigs[context] || chartConfigs.overview;

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 bg-purple-500 rounded"></div>
                <span className="text-xs text-gray-600">Orders</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-0.5 bg-yellow-500"></div>
                <span className="text-xs text-gray-600">Revenue</span>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div id="weeklyChart" className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip formatter={(value, name) => { 
                  if (name === 'Revenue') return formatCurrency(value); 
                  return value; 
                }} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" fill="#8B5CF6" name="Orders" barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#F59E0B" name="Revenue" strokeWidth={2} dot={{ fill: '#F59E0B', r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };

  // 5. PAYMENT PIE CHART
  const renderPaymentChart = () => {
    const data = reportData.paymentMethods || [];
    const context = getFilterContext.type;

    if (data.length === 0 || (data.length === 1 && data[0].name === 'No Data')) {
      return <Card><CardContent className="h-64 flex items-center justify-center text-gray-500">No payment data available</CardContent></Card>;
    }

    const chartConfigs = {
      overview: { title: 'Payment Breakdown', subtitle: 'Distribution by payment type' },
      employee: { title: 'Payment Collections', subtitle: 'Payment collection breakdown' },
      product: { title: 'Payment Methods for Product', subtitle: 'How customers paid for this product' },
      supplier: { title: 'Paid vs Outstanding', subtitle: 'Supplier payment status' },
      customer: { title: 'Customer Payment Methods', subtitle: 'Customer\'s preferred payment methods' },
      payment: { title: 'Payment Distribution', subtitle: 'Distribution by payment type' },
    };

    const config = chartConfigs[context] || chartConfigs.overview;

    const chartData = context === 'supplier' 
      ? [
          { name: 'Paid', value: reportData.creditSummary?.totalPaid || 0 },
          { name: 'Outstanding', value: reportData.creditSummary?.totalRemaining || 0 },
        ].filter(d => d.value > 0)
      : data;

    if (chartData.length === 0) {
      return <Card><CardContent className="h-64 flex items-center justify-center text-gray-500">No data available</CardContent></Card>;
    }

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{config.title}</CardTitle>
              <p className="text-xs text-gray-500">{config.subtitle}</p>
            </div>
            {context !== 'supplier' && (
              <Select value={paymentDisplayMode} onValueChange={setPaymentDisplayMode}>
                <SelectTrigger className="h-7 w-[120px] text-xs"><SelectValue placeholder="Display" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="amount">By Amount</SelectItem>
                  <SelectItem value="percentage">By Percentage</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div id="paymentChart" className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(value) => {
                  if (paymentDisplayMode === 'percentage') return `${value.toFixed(1)}%`;
                  return formatCurrency(value);
                }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {chartData.map((method, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-gray-600">{method.name}</span>
                </div>
                <span className="font-semibold">
                  {paymentDisplayMode === 'percentage' && context !== 'supplier' 
                    ? `${method.value.toFixed(1)}%` 
                    : formatCurrency(method.value)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 6. TOP PRODUCTS HORIZONTAL BAR
  const renderTopHorizontalBar = () => {
    const context = getFilterContext.type;
    const topProducts = reportData.topProducts || [];
    const topCustomers = reportData.topCustomers || [];
    const employeeTopProducts = reportData.employeeData?.topProducts || [];

    let data = [];
    let title = '';
    let subtitle = '';
    let dataKey = 'revenue';

    switch (context) {
      case 'employee':
        data = employeeTopProducts.length > 0 ? employeeTopProducts : topProducts;
        title = 'Top Products Sold';
        subtitle = 'Best selling products handled by employee';
        break;
      case 'product':
        data = topCustomers;
        title = 'Top Customers';
        subtitle = 'Customers who purchased this product';
        dataKey = 'purchaseValue';
        break;
      case 'supplier':
        data = topProducts;
        title = 'Top Products Supplied';
        subtitle = 'Products supplied by this supplier';
        break;
      case 'customer':
        data = topProducts;
        title = 'Products Purchased';
        subtitle = 'Products bought by this customer';
        break;
      case 'payment':
        data = reportData.creditSummary?.totalRemaining > 0 
          ? [{ name: 'Outstanding Credits', value: reportData.creditSummary.totalRemaining }]
          : [];
        title = 'Outstanding Credits';
        subtitle = 'Credit accounts with balance';
        break;
      default:
        data = topProducts;
        title = 'Top Products by Revenue';
        subtitle = 'Best performing products';
    }

    if (data.length === 0) {
      return null;
    }

    const chartData = data.slice(0, 5).map(item => ({
      name: item.name || item.customer?.name || item.supplier?.name || 'N/A',
      value: item[dataKey] || item.revenue || item.purchaseValue || 0,
    })).sort((a, b) => b.value - a.value);

    const maxValue = Math.max(...chartData.map(d => d.value), 1);

    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold">{title}</CardTitle>
              <p className="text-xs text-gray-500">{subtitle}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {chartData.map((item, index) => {
              const percentage = (item.value / maxValue) * 100;
              const colorIndex = index % COLORS.length;
              return (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-24 truncate text-right">{item.name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-xs text-white font-medium"
                      style={{ 
                        width: `${Math.max(percentage, 5)}%`, 
                        backgroundColor: COLORS[colorIndex],
                      }}
                    >
                      {percentage > 15 && formatCurrency(item.value)}
                    </div>
                  </div>
                  <span className="text-xs font-semibold w-20">{formatCurrency(item.value)}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  };

  // 7. SECONDARY HORIZONTAL BAR
  const renderSecondaryHorizontalBar = () => {
    const context = getFilterContext.type;
    
    if (context === 'overview') {
      const topCustomers = reportData.topCustomers || [];
      if (topCustomers.length === 0) return null;
      
      const data = topCustomers.slice(0, 5).map(c => ({
        name: c.name || 'N/A',
        value: c.purchaseValue || 0,
      })).sort((a, b) => b.value - a.value);
      
      const maxValue = Math.max(...data.map(d => d.value), 1);
      
      return (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
                <p className="text-xs text-gray-500">Highest spending customers</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const colorIndex = (index + 3) % COLORS.length;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 truncate text-right">{item.name}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-xs text-white font-medium"
                        style={{ 
                          width: `${Math.max(percentage, 5)}%`, 
                          backgroundColor: COLORS[colorIndex],
                        }}
                      >
                        {percentage > 15 && formatCurrency(item.value)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold w-20">{formatCurrency(item.value)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (context === 'supplier') {
      const topSuppliers = reportData.topSuppliers || [];
      if (topSuppliers.length === 0) return null;
      
      const data = topSuppliers.slice(0, 5).map(s => ({
        name: s.name || 'N/A',
        value: s.purchaseValue || 0,
      })).sort((a, b) => b.value - a.value);
      
      const maxValue = Math.max(...data.map(d => d.value), 1);
      
      return (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top Suppliers</CardTitle>
                <p className="text-xs text-gray-500">Suppliers by purchase value</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const colorIndex = (index + 5) % COLORS.length;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 truncate text-right">{item.name}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-xs text-white font-medium"
                        style={{ 
                          width: `${Math.max(percentage, 5)}%`, 
                          backgroundColor: COLORS[colorIndex],
                        }}
                      >
                        {percentage > 15 && formatCurrency(item.value)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold w-20">{formatCurrency(item.value)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    }

    if (context === 'customer' || context === 'payment') {
      const topCustomers = reportData.topCustomers || [];
      if (topCustomers.length === 0) return null;
      
      const data = topCustomers.slice(0, 5).map(c => ({
        name: c.name || 'N/A',
        value: c.purchaseValue || 0,
      })).sort((a, b) => b.value - a.value);
      
      const maxValue = Math.max(...data.map(d => d.value), 1);
      
      return (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold">Top Customers</CardTitle>
                <p className="text-xs text-gray-500">{context === 'payment' ? 'Customers with highest payments' : 'Highest spending customers'}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.map((item, index) => {
                const percentage = (item.value / maxValue) * 100;
                const colorIndex = (index + 3) % COLORS.length;
                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24 truncate text-right">{item.name}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500 flex items-center justify-end pr-2 text-xs text-white font-medium"
                        style={{ 
                          width: `${Math.max(percentage, 5)}%`, 
                          backgroundColor: COLORS[colorIndex],
                        }}
                      >
                        {percentage > 15 && formatCurrency(item.value)}
                      </div>
                    </div>
                    <span className="text-xs font-semibold w-20">{formatCurrency(item.value)}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      );
    }

    return null;
  };

  // 8. LOW STOCK ALERT
  const renderLowStockAlert = () => {
    const lowStock = reportData.lowStock || [];
    const { lowStockCount, outOfStockCount } = reportData.inventoryOverview || {};

    if (lowStock.length === 0 && (lowStockCount || 0) === 0 && (outOfStockCount || 0) === 0) {
      return null;
    }

    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-full"><AlertTriangle className="h-5 w-5 text-yellow-600" /></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800">⚠️ Low Stock Alert</p>
              <p className="text-xs text-yellow-700">
                {lowStockCount || 0} products are below reorder level.
                {outOfStockCount > 0 && ` ${outOfStockCount} items are out of stock.`}
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-yellow-300 hover:bg-yellow-100">View Details</Button>
          </div>
          {lowStock.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {lowStock.slice(0, 5).map((item) => (
                <span key={item.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs border border-yellow-200">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-red-500 font-bold">{item.currentStock}</span>
                  <span className="text-gray-400">/</span>
                  <span className="text-gray-500">{item.reorderLevel}</span>
                  <span className="text-gray-400">{item.unit}</span>
                </span>
              ))}
              {lowStock.length > 5 && <span className="text-xs text-gray-500">+{lowStock.length - 5} more</span>}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading && !refreshing) {
    return <div className="flex h-96 items-center justify-center"><div className="text-gray-500">Loading report data...</div></div>;
  }

  return (
    <div className="space-y-6" ref={reportRef}>
      {/* Print Styles */}
      <style>
        {`
          @media print {
            body * { visibility: hidden; }
            #report-content, #report-content * { visibility: visible; }
            #report-content { position: absolute; left: 0; top: 0; width: 100%; padding: 20px; }
            .no-print { display: none !important; }
            .print-card { break-inside: avoid; page-break-inside: avoid; }
            .print-table { page-break-after: auto; }
            .print-chart { page-break-inside: avoid; }
          }
        `}
      </style>

      <div id="report-content">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 no-print">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-600 mt-1">
              {getFilterContext.hasFilters ? getFilterContext.label : 'Executive insights and business intelligence'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap no-print">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Date:</span>
              <Select value={dateRange} onValueChange={handleDateRangeChange}>
                <SelectTrigger className="h-9 w-[160px] text-sm"><SelectValue placeholder="Select date range" /></SelectTrigger>
                <SelectContent>
                  {DATE_RANGE_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <Dialog open={showCustomRange} onOpenChange={setShowCustomRange}>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Custom Date Range</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>From Date</Label><Input type="date" value={customDateRange.from} onChange={(e) => setCustomDateRange({ ...customDateRange, from: e.target.value })} className="mt-1" /></div>
                  <div><Label>To Date</Label><Input type="date" value={customDateRange.to} onChange={(e) => setCustomDateRange({ ...customDateRange, to: e.target.value })} className="mt-1" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowCustomRange(false)}>Cancel</Button>
                  <Button onClick={() => { setShowCustomRange(false); fetchReportData(); }}>Apply Range</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <ActionButtons />

            <Button variant="outline" size="sm" className="gap-2 no-print" onClick={handleRefresh} disabled={loading || refreshing}>
              <RefreshCw className={`h-4 w-4 ${loading || refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="print-card">
          {renderStatCards()}
        </div>

        {/* Low Stock Alert */}
        <div className="no-print">
          {renderLowStockAlert()}
        </div>

        {/* Filters */}
        <div className="no-print">
          <Card>
            <CardContent className="p-4">
              <FilterSelector />
            </CardContent>
          </Card>
        </div>

        {/* Transaction Table */}
        <div className="print-card print-table">
          {renderTransactionTable()}
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 print:grid-cols-2">
          <div className="lg:col-span-2 print-chart">
            {renderRevenueTrendChart()}
          </div>
          <div className="print-chart">
            {renderPaymentChart()}
          </div>
        </div>

        {/* Weekly Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 print:grid-cols-2">
          <div className="print-chart">
            {renderWeeklyTrend()}
          </div>
          <div className="print-chart">
            {renderTopHorizontalBar()}
          </div>
        </div>

        {/* Secondary Horizontal Bar */}
        <div className="print-card">
          {renderSecondaryHorizontalBar()}
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-6 mt-6 no-print">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Last updated: {formatDate(new Date())}</span>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500">Live</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Fusion IMS v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}