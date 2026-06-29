// src/pages/manager/ManagerStockOverview.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { productsApi, rawMaterialsApi, stockApi } from '@/api/index.js';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { 
  Package, Box, AlertTriangle, XCircle, Search, RefreshCw, Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { StockStatsCard } from '@/components/stock/StockStatsCard';
import { StockStatusBadge } from '@/components/stock/StockStatusBadge';

export default function ManagerStockOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [rawMaterials, setRawMaterials] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stats, setStats] = useState({
    totalRawMaterials: { items: 0, quantity: 0 },
    totalFinishedProducts: { items: 0, quantity: 0 },
    lowStockCount: 0,
    outOfStockCount: 0,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rawRes, productsRes, overviewRes] = await Promise.all([
        rawMaterialsApi.getAll({ limit: 500 }),
        productsApi.getAll({ limit: 500 }),
        stockApi.getOverview().catch(() => null),
      ]);
      
      const rawData = rawRes.data?.data || rawRes.data || [];
      const productData = productsRes.data || [];
      
      setRawMaterials(rawData);
      setProducts(productData);
      
      if (overviewRes?.data) {
        setStats(overviewRes.data);
      } else {
        const allItems = [
          ...rawData.map(i => ({ currentStock: i.currentStock || 0, reorderLevel: i.reorderLevel || 10 })),
          ...productData.map(i => ({ currentStock: i.currentStock || 0, reorderLevel: i.reorderLevel || 10 }))
        ];
        setStats({
          totalRawMaterials: { items: rawData.length, quantity: rawData.reduce((s, i) => s + (i.currentStock || 0), 0) },
          totalFinishedProducts: { items: productData.length, quantity: productData.reduce((s, i) => s + (i.currentStock || 0), 0) },
          lowStockCount: allItems.filter(i => i.currentStock > 0 && i.currentStock <= i.reorderLevel).length,
          outOfStockCount: allItems.filter(i => i.currentStock === 0).length,
        });
      }
    } catch (error) {
      console.error('Error fetching stock data:', error);
      toast.error('Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  const allItems = [
    ...rawMaterials.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category || 'Raw Material',
      currentQuantity: item.currentStock || 0,
      unit: item.unit || 'piece',
      reorderLevel: item.reorderLevel || 10,
      type: 'raw',
      status: (item.currentStock || 0) === 0 ? 'out' : 
              (item.currentStock || 0) <= (item.reorderLevel || 10) ? 'low' : 'in',
    })),
    ...products.map(item => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category?.name || 'Finished Product',
      currentQuantity: item.currentStock || 0,
      unit: item.unit || 'piece',
      reorderLevel: item.reorderLevel || 10,
      type: 'product',
      status: (item.currentStock || 0) === 0 ? 'out' : 
              (item.currentStock || 0) <= (item.reorderLevel || 10) ? 'low' : 'in',
    })),
  ];

  const filteredItems = allItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleViewDetails = (item) => {
    if (item.type === 'raw') {
      navigate(`/manager/raw-materials/${item.id}`);
    } else {
      navigate(`/manager/products/${item.id}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-gray-500">Loading stock data...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory {'>'} Stock Overview</h1>
          <p className="text-gray-600 mt-1">Monitor and manage inventory levels</p>
        </div>
        <Button variant="outline" onClick={fetchData} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StockStatsCard
          title="Total Raw Materials"
          value={`${stats.totalRawMaterials.items} Items`}
          subtitle={`Total Quantity: ${stats.totalRawMaterials.quantity.toLocaleString()} Units`}
          icon={Box}
          color="blue"
        />
        <StockStatsCard
          title="Total Finished Products"
          value={`${stats.totalFinishedProducts.items} Items`}
          subtitle={`Total Quantity: ${stats.totalFinishedProducts.quantity.toLocaleString()} Units`}
          icon={Package}
          color="green"
        />
        <StockStatsCard
          title="Low Stock Items"
          value={`${stats.lowStockCount} Items`}
          subtitle="Below reorder level"
          icon={AlertTriangle}
          color="yellow"
        />
        <StockStatsCard
          title="Out of Stock Items"
          value={`${stats.outOfStockCount} Items`}
          subtitle="Currently unavailable"
          icon={XCircle}
          color="red"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or SKU..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Raw Material">Raw Materials</option>
              <option value="Finished Product">Finished Products</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock</option>
              <option value="out">Out of Stock</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Current Quantity</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead className="text-right">Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-gray-500">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => (
                    <TableRow key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.sku && (
                            <p className="text-xs text-gray-400">SKU: {item.sku}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.category}</TableCell>
                      <TableCell className="text-right">
                        <span className={`font-semibold ${
                          item.status === 'low' ? 'text-yellow-600' : 
                          item.status === 'out' ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {item.currentQuantity.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">{item.reorderLevel.toLocaleString()}</TableCell>
                      <TableCell>
                        <StockStatusBadge 
                          currentStock={item.currentQuantity} 
                          reorderLevel={item.reorderLevel}
                          size="sm"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(item)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}