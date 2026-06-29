import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export const getDashboardStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's orders
    const todaysOrders = await prisma.order.count({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      }
    });

    // Today's revenue
    const todaysRevenue = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        },
        status: 'DELIVERED'
      },
      _sum: {
        totalAmount: true
      }
    });

    // Pending deliveries
    const pendingDeliveries = await prisma.delivery.count({
      where: {
        status: 'PENDING'
      }
    });

    // Low stock products
    const lowStockProducts = await prisma.product.count({
      where: {
        OR: [
          { status: 'LOW' },
          { status: 'CRITICAL' }
        ]
      }
    });

    // Credit sales total
    const creditSales = await prisma.order.aggregate({
      where: {
        paymentMethod: 'CREDIT',
        status: 'PENDING'
      },
      _sum: {
        totalAmount: true
      }
    });

    // Monthly sales
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlySales = await prisma.order.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth
        },
        status: 'DELIVERED'
      },
      _sum: {
        totalAmount: true
      }
    });

    // Inventory value
    const products = await prisma.product.findMany();
    const inventoryValue = products.reduce((sum, product) => 
      sum + (product.currentStock * product.costPrice), 0);

    // Supplier pending orders
    const supplierPendingOrders = await prisma.purchaseOrder.count({
      where: {
        status: 'PENDING'
      }
    });

    // Daily sales trend (last 7 days)
    const dailyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);
      
      const sales = await prisma.order.aggregate({
        where: {
          createdAt: {
            gte: date,
            lt: nextDate
          },
          status: 'DELIVERED'
        },
        _sum: {
          totalAmount: true
        }
      });
      
      dailyTrend.push({
        date: date.toLocaleDateString('en-US', { weekday: 'short' }),
        sales: sales._sum.totalAmount || 0
      });
    }

    // Payment method breakdown
    const cashSales = await prisma.order.aggregate({
      where: { paymentMethod: 'CASH', status: 'DELIVERED' },
      _sum: { totalAmount: true }
    });
    
    const onlineSales = await prisma.order.aggregate({
      where: { paymentMethod: 'ONLINE', status: 'DELIVERED' },
      _sum: { totalAmount: true }
    });
    
    const creditSalesTotal = await prisma.order.aggregate({
      where: { paymentMethod: 'CREDIT', status: 'DELIVERED' },
      _sum: { totalAmount: true }
    });

    res.json({
      todaysOrders,
      todaysRevenue: todaysRevenue._sum.totalAmount || 0,
      pendingDeliveries,
      lowStockProducts,
      creditSales: creditSales._sum.totalAmount || 0,
      monthlySales: monthlySales._sum.totalAmount || 0,
      inventoryValue,
      supplierPendingOrders,
      dailySalesTrend: dailyTrend,
      paymentBreakdown: {
        cash: cashSales._sum.totalAmount || 0,
        online: onlineSales._sum.totalAmount || 0,
        credit: creditSalesTotal._sum.totalAmount || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getRecentOrders = async (req, res) => {
  try {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedStaff: true,
        items: {
          include: { product: true }
        }
      }
    });
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};