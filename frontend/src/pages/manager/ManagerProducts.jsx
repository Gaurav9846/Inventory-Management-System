// src/pages/manager/ManagerProduction.jsx
import { useState, useEffect } from 'react';
import { productionApi, productsApi, rawMaterialsApi } from '@/api/index.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Plus, RefreshCw, 
  Package, Search, Calendar, 
  Trash2, Factory,
  Layers, X, 
  Eye, DollarSign,
  ClipboardListIcon, TrendingUp, TrendingDown
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/utils/helpers';

export default function ManagerProduction() {
  const [loading, setLoading] = useState(true);
  const [batches, setBatches] = useState([]);
  const [products, setProducts] = useState([]);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [comparisonPeriod, setComparisonPeriod] = useState('yesterday');

  // Stats
  const [stats, setStats] = useState({
    totalBatches: 0,
    totalFinishedGoods: 0,
    estimatedCost: 0,
    totalRawUsed: 0,
    comparisons: {
      totalBatches: { value: 0, trend: 'up' },
      totalFinishedGoods: { value: 0, trend: 'up' },
      estimatedCost: { value: 0, trend: 'up' },
      totalRawUsed: { value: 0, trend: 'up' }
    }
  });

  const [formData, setFormData] = useState({
    productId: '',
    quantityProduced: '',
    manufacturingDate: new Date().toISOString().split('T')[0],
    rawMaterialsUsed: [{ rawMaterialId: '', quantity: '' }]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [batchesRes, productsRes, rawRes] = await Promise.all([
        productionApi.getAll({ limit: 1000 }),
        productsApi.getAll(),
        rawMaterialsApi.getAll(),
      ]);

      const allBatches = batchesRes.data.data || [];
      setBatches(allBatches);
      setProducts(productsRes.data || []);
      setRawMaterials(rawRes.data?.data || rawRes.data || []);

      // Calculate current stats
      const totalBatches = allBatches.length;
      const totalFinishedGoods = allBatches.reduce((sum, b) => sum + (b.quantityProduced || 0), 0);
      
      let totalRawUsed = 0;
      let totalCost = 0;
      
      allBatches.forEach(batch => {
        const materials = batch.rawMaterialsUsed || [];
        materials.forEach(item => {
          totalRawUsed += (item.quantity || 0);
          totalCost += (item.unitCost || 0) * (item.quantity || 0);
        });
      });

      // Calculate comparisons
      const comparisons = calculateComparisons(allBatches);

      setStats({
        totalBatches,
        totalFinishedGoods,
        estimatedCost: totalCost,
        totalRawUsed,
        comparisons
      });

    } catch (error) {
      console.error('Error fetching production data:', error);
      toast.error('Failed to load production data');
    } finally {
      setLoading(false);
    }
  };

  const calculateComparisons = (allBatches) => {
    const now = new Date();
    let previousStart, previousEnd, currentStart, currentEnd;
    
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    switch(comparisonPeriod) {
      case 'yesterday': {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const dayBefore = new Date(yesterday);
        dayBefore.setDate(dayBefore.getDate() - 1);
        currentStart = yesterday;
        currentEnd = today;
        previousStart = dayBefore;
        previousEnd = yesterday;
        break;
      }
      case 'week': {
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - 7);
        const prevWeekStart = new Date(weekStart);
        prevWeekStart.setDate(prevWeekStart.getDate() - 7);
        currentStart = weekStart;
        currentEnd = today;
        previousStart = prevWeekStart;
        previousEnd = weekStart;
        break;
      }
      case 'month': {
        const monthStart = new Date(today);
        monthStart.setMonth(monthStart.getMonth() - 1);
        const prevMonthStart = new Date(monthStart);
        prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
        currentStart = monthStart;
        currentEnd = today;
        previousStart = prevMonthStart;
        previousEnd = monthStart;
        break;
      }
      case 'year': {
        const yearStart = new Date(today);
        yearStart.setFullYear(yearStart.getFullYear() - 1);
        const prevYearStart = new Date(yearStart);
        prevYearStart.setFullYear(prevYearStart.getFullYear() - 1);
        currentStart = yearStart;
        currentEnd = today;
        previousStart = prevYearStart;
        previousEnd = yearStart;
        break;
      }
      default:
        return {};
    }

    const filterBatchesByDate = (start, end) => {
      return allBatches.filter(batch => {
        const batchDate = new Date(batch.createdAt);
        return batchDate >= start && batchDate < end;
      });
    };

    const currentBatches = filterBatchesByDate(currentStart, currentEnd);
    const previousBatches = filterBatchesByDate(previousStart, previousEnd);

    const currentMetrics = {
      totalBatches: currentBatches.length,
      totalFinishedGoods: currentBatches.reduce((sum, b) => sum + (b.quantityProduced || 0), 0),
      estimatedCost: currentBatches.reduce((sum, b) => {
        const materials = b.rawMaterialsUsed || [];
        return sum + materials.reduce((s, item) => s + ((item.unitCost || 0) * (item.quantity || 0)), 0);
      }, 0),
      totalRawUsed: currentBatches.reduce((sum, b) => {
        const materials = b.rawMaterialsUsed || [];
        return sum + materials.reduce((s, item) => s + (item.quantity || 0), 0);
      }, 0)
    };

    const previousMetrics = {
      totalBatches: previousBatches.length,
      totalFinishedGoods: previousBatches.reduce((sum, b) => sum + (b.quantityProduced || 0), 0),
      estimatedCost: previousBatches.reduce((sum, b) => {
        const materials = b.rawMaterialsUsed || [];
        return sum + materials.reduce((s, item) => s + ((item.unitCost || 0) * (item.quantity || 0)), 0);
      }, 0),
      totalRawUsed: previousBatches.reduce((sum, b) => {
        const materials = b.rawMaterialsUsed || [];
        return sum + materials.reduce((s, item) => s + (item.quantity || 0), 0);
      }, 0)
    };

    const calculateChange = (current, previous) => {
      if (previous === 0) return { value: current > 0 ? 100 : 0, trend: current > 0 ? 'up' : 'neutral' };
      const change = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(Math.round(change)),
        trend: change >= 0 ? 'up' : 'down'
      };
    };

    return {
      totalBatches: calculateChange(currentMetrics.totalBatches, previousMetrics.totalBatches),
      totalFinishedGoods: calculateChange(currentMetrics.totalFinishedGoods, previousMetrics.totalFinishedGoods),
      estimatedCost: calculateChange(currentMetrics.estimatedCost, previousMetrics.estimatedCost),
      totalRawUsed: calculateChange(currentMetrics.totalRawUsed, previousMetrics.totalRawUsed)
    };
  };

  useEffect(() => {
    if (batches.length > 0) {
      const comparisons = calculateComparisons(batches);
      setStats(prev => ({ ...prev, comparisons }));
    }
  }, [comparisonPeriod]);

  const handleRefresh = () => {
    fetchData();
    toast.success('Data refreshed');
  };

  const handleAddRawMaterial = () => {
    setFormData({
      ...formData,
      rawMaterialsUsed: [...formData.rawMaterialsUsed, { rawMaterialId: '', quantity: '' }]
    });
  };

  const handleRemoveRawMaterial = (index) => {
    if (formData.rawMaterialsUsed.length === 1) {
      toast.error('At least one raw material is required');
      return;
    }
    const updated = formData.rawMaterialsUsed.filter((_, i) => i !== index);
    setFormData({ ...formData, rawMaterialsUsed: updated });
  };

  const handleRawMaterialChange = (index, field, value) => {
    const updated = [...formData.rawMaterialsUsed];
    updated[index][field] = value;
    setFormData({ ...formData, rawMaterialsUsed: updated });
  };

  const handleCreateBatch = async (e) => {
    e.preventDefault();
    
    if (!formData.productId) {
      toast.error('Please select a product');
      return;
    }
    if (!formData.quantityProduced || formData.quantityProduced <= 0) {
      toast.error('Please enter valid quantity');
      return;
    }
    if (formData.rawMaterialsUsed.some(r => !r.rawMaterialId || !r.quantity)) {
      toast.error('Please fill all raw material fields');
      return;
    }

    setSubmitting(true);
    try {
      await productionApi.create({
        productId: formData.productId,
        quantityProduced: parseInt(formData.quantityProduced),
        rawMaterialsUsed: formData.rawMaterialsUsed.map(r => ({
          rawMaterialId: r.rawMaterialId,
          quantity: parseInt(r.quantity)
        })),
        startDate: formData.manufacturingDate
      });

      toast.success('Production record created successfully');
      setDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create production record');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      productId: '',
      quantityProduced: '',
      manufacturingDate: new Date().toISOString().split('T')[0],
      rawMaterialsUsed: [{ rawMaterialId: '', quantity: '' }]
    });
  };

  const getFilteredBatches = () => {
    if (dateFilter === 'all') return batches;
    
    const now = new Date();
    let startDate = new Date();
    
    switch(dateFilter) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      default:
        return batches;
    }
    
    return batches.filter(batch => new Date(batch.createdAt) >= startDate);
  };

  const filteredBatches = getFilteredBatches().filter(batch => 
    batch.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.batchNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dateFilterOptions = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
  ];

  const comparisonOptions = [
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'week', label: 'Previous Week' },
    { value: 'month', label: 'Previous Month' },
    { value: 'year', label: 'Previous Year' },
  ];

  // Helper function to render comparison
  const renderComparison = (comparison) => {
    if (!comparison || comparison.value === 0) return null;
    
    const isUp = comparison.trend === 'up';
    const TrendIcon = isUp ? TrendingUp : TrendingDown;
    const trendColor = isUp ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
        <TrendIcon className="h-3 w-3" />
        <span className="text-xs font-medium">
          {comparison.value}% {isUp ? 'increase' : 'decrease'}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading production data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory {'>'} Production</h1>
          <p className="text-gray-600 mt-1">Manage production batches from raw materials to finished products</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Create Production Record
          </Button>
        </div>
      </div>

      {/* Comparison Dropdown */}
      <div className="flex justify-end">
        <Select value={comparisonPeriod} onValueChange={setComparisonPeriod}>
          <SelectTrigger className="w-40 h-8 text-sm">
            <Calendar className="h-3.5 w-3.5 mr-2" />
            <SelectValue placeholder="Compare to" />
          </SelectTrigger>
          <SelectContent>
            {comparisonOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-700">{stats.totalBatches}</p>
                <p className="text-xs text-blue-600">Total Production Batches</p>
                {renderComparison(stats.comparisons.totalBatches)}
              </div>
              <div className="p-3 bg-blue-200/50 rounded-xl">
                <Factory className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-700">{stats.totalFinishedGoods}</p>
                <p className="text-xs text-purple-600">Total Finished Goods</p>
                {renderComparison(stats.comparisons.totalFinishedGoods)}
              </div>
              <div className="p-3 bg-purple-200/50 rounded-xl">
                <Package className="h-6 w-6 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-700">रू{(stats.estimatedCost || 0).toFixed(2)}</p>
                <p className="text-xs text-green-600">Estimated Production Cost</p>
                {renderComparison(stats.comparisons.estimatedCost)}
              </div>
              <div className="p-3 bg-green-200/50 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-700">{stats.totalRawUsed}</p>
                <p className="text-xs text-orange-600">Total Raw Materials Used</p>
                {renderComparison(stats.comparisons.totalRawUsed)}
              </div>
              <div className="p-3 bg-orange-200/50 rounded-xl">
                <ClipboardListIcon className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Production History */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap justify-between items-center gap-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <ClipboardListIcon className="h-5 w-5 text-blue-600" />
              Production History
            </CardTitle>
            <div className="flex gap-2">
              <div className="relative w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32 h-8 text-sm">
                  <Calendar className="h-3.5 w-3.5 mr-1" />
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  {dateFilterOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="text-xs">Batch #</TableHead>
                  <TableHead className="text-xs">Product</TableHead>
                  <TableHead className="text-xs text-center">Quantity</TableHead>
                  <TableHead className="text-xs">Raw Materials</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBatches.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No production records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBatches.map((batch) => (
                    <TableRow 
                      key={batch.id} 
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => {
                        setSelectedBatch(batch);
                        setViewDialogOpen(true);
                      }}
                    >
                      <TableCell className="font-mono text-xs font-medium">
                        {batch.batchNumber}
                      </TableCell>
                      <TableCell>
                        <p className="text-sm font-medium">{batch.product?.name}</p>
                        <p className="text-xs text-gray-400">{batch.product?.unit}</p>
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {batch.quantityProduced}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">
                          {(batch.rawMaterialsUsed || []).slice(0, 2).map((item, idx) => (
                            <div key={idx} className="text-gray-600">
                              {item.quantity}x {item.name || 'N/A'}
                            </div>
                          ))}
                          {(batch.rawMaterialsUsed || []).length > 2 && (
                            <div className="text-gray-400">+{batch.rawMaterialsUsed.length - 2} more</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-500">
                        {formatDate(batch.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {filteredBatches.length > 0 && (
            <div className="px-6 py-3 border-t text-sm text-gray-500">
              Showing {filteredBatches.length} of {batches.length} batches
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Production Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-blue-600" />
              Create Production Record
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateBatch}>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-4">
                {/* Production Information */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Production Information</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Production Date</Label>
                      <Input 
                        type="date"
                        value={formData.manufacturingDate}
                        onChange={(e) => setFormData({ ...formData, manufacturingDate: e.target.value })}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Finished Product */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Finished Product</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-gray-500">Product *</Label>
                      <Select 
                        value={formData.productId} 
                        onValueChange={(v) => setFormData({ ...formData, productId: v })}
                      >
                        <SelectTrigger className="mt-1 h-9 text-sm">
                          <SelectValue placeholder="Select product..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} - Stock: {p.currentStock} {p.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Quantity Produced *</Label>
                      <Input 
                        type="number"
                        min="1"
                        placeholder="Enter quantity"
                        value={formData.quantityProduced}
                        onChange={(e) => setFormData({ ...formData, quantityProduced: e.target.value })}
                        className="mt-1 h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Raw Materials */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-700">Raw Materials Used</h3>
                    <Button 
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={handleAddRawMaterial}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Material
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {formData.rawMaterialsUsed.map((item, index) => (
                      <div key={index} className="grid grid-cols-12 gap-2 items-end p-3 bg-gray-50 rounded-lg border">
                        <div className="col-span-5">
                          <Label className="text-xs text-gray-500">Material Name</Label>
                          <Select 
                            value={item.rawMaterialId} 
                            onValueChange={(v) => handleRawMaterialChange(index, 'rawMaterialId', v)}
                          >
                            <SelectTrigger className="mt-1 h-8 text-xs">
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              {rawMaterials.map((rm) => (
                                <SelectItem key={rm.id} value={rm.id}>
                                  {rm.name} - Stock: {rm.currentStock} {rm.unit}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs text-gray-500">Required Qty</Label>
                          <Input 
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={item.quantity}
                            onChange={(e) => handleRawMaterialChange(index, 'quantity', e.target.value)}
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div className="col-span-3">
                          <Label className="text-xs text-gray-500">Available Stock</Label>
                          <Input 
                            value={rawMaterials.find(r => r.id === item.rawMaterialId)?.currentStock || 0}
                            disabled
                            className="mt-1 h-8 bg-gray-100 text-sm"
                          />
                        </div>
                        <div className="col-span-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-500 hover:text-red-600"
                            onClick={() => handleRemoveRawMaterial(index)}
                            disabled={formData.rawMaterialsUsed.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Summary */}
              <div className="space-y-4">
                <Card className="border-2 border-blue-200 bg-blue-50/30">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Layers className="h-4 w-4 text-blue-600" />
                      Production Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-gray-600">Total Quantity Produced</span>
                      <span className="font-semibold">
                        {formData.quantityProduced || 0} units
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-gray-600">Total Raw Materials Used</span>
                      <span className="font-semibold">
                        {formData.rawMaterialsUsed.reduce((sum, r) => sum + (parseInt(r.quantity) || 0), 0)} units
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b">
                      <span className="text-gray-600">Estimated Production Cost</span>
                      <span className="font-semibold text-green-600">
                        ₹{(formData.rawMaterialsUsed.reduce((sum, r) => {
                          const material = rawMaterials.find(rm => rm.id === r.rawMaterialId);
                          return sum + ((material?.unitCost || 0) * (parseInt(r.quantity) || 0));
                        }, 0) || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between py-1.5">
                      <span className="text-gray-600">Total Items Consumed</span>
                      <span className="font-semibold">
                        {formData.rawMaterialsUsed.filter(r => r.rawMaterialId).length}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700">
                    {submitting ? 'Creating...' : 'Start Production'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} className="w-full text-red-600 border-red-300 hover:bg-red-50">
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Batch Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Production Batch Details
            </DialogTitle>
          </DialogHeader>
          {selectedBatch && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500">Batch Number</p>
                  <p className="font-semibold">{selectedBatch.batchNumber}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Product</p>
                  <p className="font-medium">{selectedBatch.product?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Quantity Produced</p>
                  <p className="font-semibold">{selectedBatch.quantityProduced} {selectedBatch.unit}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created By</p>
                  <p>{selectedBatch.createdBy?.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Created At</p>
                  <p>{formatDate(selectedBatch.createdAt)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-xs text-gray-500 mb-2">Raw Materials Used</p>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="text-xs">Material</TableHead>
                        <TableHead className="text-xs text-right">Quantity</TableHead>
                        <TableHead className="text-xs text-right">Unit Cost</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(selectedBatch.rawMaterialsUsed || []).map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-sm">{item.name || 'N/A'}</TableCell>
                          <TableCell className="text-sm text-right">{item.quantity}</TableCell>
                          <TableCell className="text-sm text-right">₹{(item.unitCost || 0).toFixed(2)}</TableCell>
                          <TableCell className="text-sm text-right font-semibold">₹{((item.unitCost || 0) * (item.quantity || 0)).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableFooter>
                      <TableRow className="bg-gray-50">
                        <TableCell colSpan={3} className="text-right font-semibold">Total Cost</TableCell>
                        <TableCell className="text-right font-bold">
                          ₹{(selectedBatch.rawMaterialsUsed || []).reduce((sum, item) => sum + ((item.unitCost || 0) * (item.quantity || 0)), 0).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}