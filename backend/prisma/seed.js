// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Helper functions
const generateOrderNumber = (prefix) => {
  const date = new Date();
  const dateStr = date.getFullYear() + 
    String(date.getMonth() + 1).padStart(2, '0') + 
    String(date.getDate()).padStart(2, '0');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `${prefix}-${dateStr}-${rand}`;
};

const randomDate = (start, end) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const randomFloat = (min, max) => Math.round((Math.random() * (max - min) + min) * 100) / 100;

const main = async () => {
  console.log("🌱 Seeding database with transaction data...");

  const hashedPassword = await bcrypt.hash("123456789", 10);

  // ============================================================
  // 1. USERS
  // ============================================================
  const users = [
    { name: "Gaurav Gurung", email: "gurunggaurav1611@gmail.com", role: "ADMIN" },
    { name: "Berserker May", email: "berserkermay40@gmail.com", role: "MANAGER" },
    { name: "Slayer Otaku", email: "sotaku763@gmail.com", role: "STAFF" },
    { name: "Hari Prasad", email: "hari.prasad@fusion.com", role: "STAFF" },
    { name: "Gita Sharma", email: "gita.sharma@fusion.com", role: "STAFF" },
    { name: "Ram Bahadur", email: "ram.bahadur@fusion.com", role: "STAFF" },
  ];

  const createdUsers = [];
  for (const u of users) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, password: hashedPassword, role: u.role, isActive: true },
      create: { name: u.name, email: u.email, password: hashedPassword, role: u.role, isActive: true },
    });
    createdUsers.push(user);
  }
  console.log(`✅ ${users.length} users ready`);

  const getStaff = () => createdUsers.filter(u => u.role === 'STAFF');
  const getRandomStaff = () => {
    const staff = getStaff();
    return staff[Math.floor(Math.random() * staff.length)];
  };
  const getRandomManager = () => {
    const managers = createdUsers.filter(u => u.role === 'MANAGER');
    return managers[Math.floor(Math.random() * managers.length)];
  };
  const getRandomAdmin = () => {
    const admins = createdUsers.filter(u => u.role === 'ADMIN');
    return admins[Math.floor(Math.random() * admins.length)];
  };

  // ============================================================
  // 2. PRODUCTS & CATEGORIES
  // ============================================================
  const productCategories = [
    { name: "Water Bottles", description: "Bottled drinking water products" },
    { name: "Water Jars", description: "20L water jar products" },
    { name: "Equipment", description: "Water dispensers and filtration equipment" },
  ];

  const createdCategories = [];
  for (const cat of productCategories) {
    const c = await prisma.productCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
    createdCategories.push(c);
  }
  console.log(`✅ ${productCategories.length} product categories ready`);

  const getCategoryId = (name) => createdCategories.find(c => c.name === name)?.id;

  // ============================================================
  // 3. FINISHED PRODUCTS
  // ============================================================
  const products = [
    { name: "500ml Water Bottle", sku: "WB-500", type: "BOTTLE_500ML", unit: "bottle", currentStock: 2000, reorderLevel: 500, costPrice: 8, sellingPrice: 15, categoryName: "Water Bottles" },
    { name: "1L Water Bottle", sku: "WB-1L", type: "BOTTLE_1L", unit: "bottle", currentStock: 1500, reorderLevel: 300, costPrice: 12, sellingPrice: 20, categoryName: "Water Bottles" },
    { name: "20L Water Jar", sku: "WJ-20L", type: "JAR_20L", unit: "jar", currentStock: 500, reorderLevel: 100, costPrice: 90, sellingPrice: 150, categoryName: "Water Jars" },
    { name: "Water Dispenser", sku: "WD-001", type: "OTHER", unit: "unit", currentStock: 20, reorderLevel: 5, costPrice: 2500, sellingPrice: 3500, categoryName: "Equipment" },
  ];

  const createdProducts = [];
  for (const p of products) {
    const categoryId = getCategoryId(p.categoryName);
    const prod = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        name: p.name,
        type: p.type,
        unit: p.unit,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        categoryId: categoryId,
      },
      create: {
        name: p.name,
        sku: p.sku,
        type: p.type,
        unit: p.unit,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        categoryId: categoryId,
      },
    });
    createdProducts.push(prod);
  }
  console.log(`✅ ${products.length} products ready`);

  // ============================================================
  // 4. RAW MATERIALS & CATEGORIES
  // ============================================================
  const rawMatCategories = [
    { name: "Plastic Materials", description: "Empty bottles, jars, caps" },
    { name: "Packaging Materials", description: "Labels, shrink wrap, cartons" },
    { name: "Filtration Equipment", description: "RO membranes, filters" },
  ];

  const createdRawCats = [];
  for (const cat of rawMatCategories) {
    const c = await prisma.rawMaterialCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
    createdRawCats.push(c);
  }
  console.log(`✅ ${rawMatCategories.length} raw material categories ready`);

  const getRawCatId = (name) => createdRawCats.find(c => c.name === name)?.id;

  // ============================================================
  // 5. RAW MATERIALS
  // ============================================================
  const rawMaterials = [
    { name: "Empty Plastic Bottle (500ml)", sku: "RM-BTL-500", categoryName: "Plastic Materials", unit: "piece", currentStock: 5000, reorderLevel: 1000, unitCost: 2.5 },
    { name: "Empty Plastic Bottle (1L)", sku: "RM-BTL-1L", categoryName: "Plastic Materials", unit: "piece", currentStock: 4000, reorderLevel: 800, unitCost: 3.5 },
    { name: "Empty Water Jar (20L)", sku: "RM-JAR-20L", categoryName: "Plastic Materials", unit: "piece", currentStock: 1000, reorderLevel: 200, unitCost: 20 },
    { name: "Bottle Cap", sku: "RM-CAP", categoryName: "Plastic Materials", unit: "piece", currentStock: 10000, reorderLevel: 2000, unitCost: 0.5 },
    { name: "Bottle Label (500ml)", sku: "RM-LBL-500", categoryName: "Packaging Materials", unit: "roll", currentStock: 10000, reorderLevel: 2000, unitCost: 0.25 },
    { name: "Bottle Label (1L)", sku: "RM-LBL-1L", categoryName: "Packaging Materials", unit: "roll", currentStock: 8000, reorderLevel: 1500, unitCost: 0.3 },
    { name: "Shrink Wrap", sku: "RM-SW", categoryName: "Packaging Materials", unit: "roll", currentStock: 200, reorderLevel: 50, unitCost: 18 },
    { name: "RO Membrane (100 GPD)", sku: "RM-RO-100", categoryName: "Filtration Equipment", unit: "piece", currentStock: 50, reorderLevel: 10, unitCost: 1500 },
    { name: "Carbon Filter Cartridge", sku: "RM-CARB", categoryName: "Filtration Equipment", unit: "piece", currentStock: 80, reorderLevel: 15, unitCost: 400 },
    { name: "UV Lamp (11W)", sku: "RM-UV-11", categoryName: "Filtration Equipment", unit: "piece", currentStock: 50, reorderLevel: 10, unitCost: 500 },
  ];

  const createdRawMaterials = [];
  for (const rm of rawMaterials) {
    const catId = getRawCatId(rm.categoryName);
    const raw = await prisma.rawMaterial.upsert({
      where: { sku: rm.sku },
      update: {
        name: rm.name,
        unit: rm.unit,
        currentStock: rm.currentStock,
        reorderLevel: rm.reorderLevel,
        unitCost: rm.unitCost,
        status: "Active",
        categoryId: catId,
      },
      create: {
        name: rm.name,
        sku: rm.sku,
        unit: rm.unit,
        currentStock: rm.currentStock,
        reorderLevel: rm.reorderLevel,
        unitCost: rm.unitCost,
        status: "Active",
        categoryId: catId,
      },
    });
    createdRawMaterials.push(raw);
  }
  console.log(`✅ ${rawMaterials.length} raw materials ready`);

  // ============================================================
  // 6. SUPPLIERS
  // ============================================================
  const suppliers = [
    {
      name: "PlastiPack Industries",
      contactPerson: "Rajesh Sharma",
      phone: "+91 98765 43210",
      email: "sales@plastipack.com",
      address: "Mumbai",
      productCategories: ["Plastic Materials", "Packaging Materials"],
      paymentTerms: "Net 30",
      status: "Active",
      performanceRating: 4.8,
    },
    {
      name: "AquaPure Filters",
      contactPerson: "Priya Mehta",
      phone: "+91 98200 11223",
      email: "sales@aquapure.in",
      address: "Pune",
      productCategories: ["Filtration Equipment"],
      paymentTerms: "Net 30",
      status: "Active",
      performanceRating: 4.7,
    },
    {
      name: "ChemPure Solutions",
      contactPerson: "Dr. Anita Desai",
      phone: "+91 99887 66554",
      email: "orders@chempure.com",
      address: "Navi Mumbai",
      productCategories: ["Chemicals", "Filtration Equipment"],
      paymentTerms: "Net 15",
      status: "Active",
      performanceRating: 4.5,
    },
  ];

  const createdSuppliers = [];
  for (const sup of suppliers) {
    const existing = await prisma.supplier.findFirst({
      where: { OR: [{ email: sup.email }, { phone: sup.phone }] }
    });
    let s;
    if (existing) {
      s = await prisma.supplier.update({ where: { id: existing.id }, data: sup });
    } else {
      s = await prisma.supplier.create({ data: sup });
    }
    createdSuppliers.push(s);
  }
  console.log(`✅ ${suppliers.length} suppliers ready`);

  // ============================================================
  // 7. CUSTOMERS
  // ============================================================
  const customers = [
    { name: "Hotel ABC", phone: "9841234567", email: "hotelabc@gmail.com", address: "Kathmandu", customerType: "VIP", creditLimit: 50000 },
    { name: "XYZ Mart", phone: "9842345678", email: "xyzmart@gmail.com", address: "Lalitpur", customerType: "REGULAR", creditLimit: 20000 },
    { name: "Ram Traders", phone: "9843456789", email: "ramtraders@gmail.com", address: "Bhaktapur", customerType: "REGULAR", creditLimit: 15000 },
    { name: "Shree Enterprises", phone: "9844567890", email: "shree@gmail.com", address: "Pokhara", customerType: "VIP", creditLimit: 30000 },
    { name: "Green Valley Resort", phone: "9845678901", email: "greenvalley@gmail.com", address: "Chitwan", customerType: "VIP", creditLimit: 45000 },
    { name: "Himalayan Store", phone: "9846789012", email: "himalayan@gmail.com", address: "Butwal", customerType: "REGULAR", creditLimit: 10000 },
    { name: "Nepal Water Supply", phone: "9847890123", email: "nepalwater@gmail.com", address: "Kathmandu", customerType: "REGULAR", creditLimit: 25000 },
    { name: "Annapurna Trading", phone: "9848901234", email: "annapurna@gmail.com", address: "Pokhara", customerType: "VIP", creditLimit: 35000 },
    { name: "Everest Distributors", phone: "9849012345", email: "everest@gmail.com", address: "Lalitpur", customerType: "REGULAR", creditLimit: 18000 },
    { name: "Koshi Suppliers", phone: "9850123456", email: "koshi@gmail.com", address: "Biratnagar", customerType: "REGULAR", creditLimit: 12000 },
    { name: "Gandaki Stores", phone: "9851234567", email: "gandaki@gmail.com", address: "Pokhara", customerType: "VIP", creditLimit: 28000 },
    { name: "Bishal Mart", phone: "9852345678", email: "bishal@gmail.com", address: "Kathmandu", customerType: "REGULAR", creditLimit: 8000 },
    { name: "Rara Trading", phone: "9853456789", email: "rara@gmail.com", address: "Nepalgunj", customerType: "REGULAR", creditLimit: 22000 },
    { name: "Mechi Enterprises", phone: "9854567890", email: "mechi@gmail.com", address: "Bhadrapur", customerType: "NEW", creditLimit: 5000 },
    { name: "Sherpa Retail", phone: "9855678901", email: "sherpa@gmail.com", address: "Namche Bazaar", customerType: "REGULAR", creditLimit: 16000 },
  ];

  const createdCustomers = [];
  for (const cust of customers) {
    const existing = await prisma.customer.findFirst({
      where: { OR: [{ phone: cust.phone }, { email: cust.email }] }
    });
    let c;
    if (existing) {
      c = await prisma.customer.update({ where: { id: existing.id }, data: cust });
    } else {
      c = await prisma.customer.create({ data: cust });
    }
    createdCustomers.push(c);
  }
  console.log(`✅ ${customers.length} customers ready`);

  const getRandomCustomer = () => createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
  const getRandomProduct = () => createdProducts[Math.floor(Math.random() * createdProducts.length)];
  const getRandomRawMat = () => createdRawMaterials[Math.floor(Math.random() * createdRawMaterials.length)];
  const getRandomSupplier = () => createdSuppliers[Math.floor(Math.random() * createdSuppliers.length)];

  // ============================================================
  // 8. SALES ORDERS WITH PROPER CREDIT HANDLING
  // ============================================================
  console.log("\n🔄 Creating Sales Orders...");

  const salesOrderScenarios = [
    { status: "COMPLETED", payment: "CASH", paymentStatus: "COMPLETED", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CASH", paymentStatus: "COMPLETED", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CASH", paymentStatus: "COMPLETED", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "ONLINE", paymentStatus: "COMPLETED", delivery: "DELIVERED", platform: "KHALTI" },
    { status: "COMPLETED", payment: "ONLINE", paymentStatus: "COMPLETED", delivery: "DELIVERED", platform: "ESEWA" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "PROCESSING", payment: "CASH", paymentStatus: "COMPLETED", delivery: "IN_TRANSIT" },
    { status: "PROCESSING", payment: "ONLINE", paymentStatus: "COMPLETED", delivery: "IN_TRANSIT", platform: "FONEPAY" },
    { status: "PROCESSING", payment: "CREDIT", paymentStatus: "PENDING", delivery: "IN_TRANSIT" },
    { status: "PENDING", payment: "CASH", paymentStatus: "PENDING", delivery: "PENDING" },
    { status: "PENDING", payment: "ONLINE", paymentStatus: "PENDING", delivery: "PENDING" },
    { status: "PENDING", payment: "CREDIT", paymentStatus: "PENDING", delivery: "PENDING" },
    { status: "CANCELLED", payment: "CASH", paymentStatus: "FAILED", delivery: null },
    { status: "CANCELLED", payment: "ONLINE", paymentStatus: "FAILED", delivery: null, platform: "OTHER" },
    { status: "DISPATCHED", payment: "CASH", paymentStatus: "COMPLETED", delivery: "IN_TRANSIT" },
    { status: "DISPATCHED", payment: "ONLINE", paymentStatus: "COMPLETED", delivery: "IN_TRANSIT", platform: "KHALTI" },
    { status: "COMPLETED", payment: "CASH", paymentStatus: "COMPLETED", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "ONLINE", paymentStatus: "COMPLETED", delivery: "DELIVERED", platform: "ESEWA" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CASH", paymentStatus: "COMPLETED", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "ONLINE", paymentStatus: "COMPLETED", delivery: "DELIVERED", platform: "KHALTI" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
    { status: "COMPLETED", payment: "CREDIT", paymentStatus: "PENDING", delivery: "DELIVERED" },
  ];

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 45);

  let creditAccountsCreated = [];

  for (let i = 0; i < salesOrderScenarios.length; i++) {
    const scenario = salesOrderScenarios[i];
    const customer = getRandomCustomer();
    const staff = getRandomStaff();
    const orderDate = randomDate(startDate, new Date());
    
    const numItems = randomInt(1, 3);
    let totalAmount = 0;
    const items = [];
    const usedProducts = new Set();

    for (let j = 0; j < numItems; j++) {
      let product = getRandomProduct();
      while (usedProducts.has(product.id)) {
        product = getRandomProduct();
      }
      usedProducts.add(product.id);
      
      const quantity = randomInt(2, 20);
      const unitPrice = product.sellingPrice || randomFloat(10, 200);
      const totalPrice = quantity * unitPrice;
      totalAmount += totalPrice;
      items.push({
        productId: product.id,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    const salesOrder = await prisma.salesOrder.create({
      data: {
        orderNumber: generateOrderNumber('SO'),
        customerId: customer.id,
        status: scenario.status,
        totalAmount: totalAmount,
        notes: `Order ${i + 1} - ${scenario.payment} payment`,
        createdById: staff.id,
        createdAt: orderDate,
        items: {
          create: items,
        },
      },
    });

    // ============================================================
    // HANDLE PAYMENT BASED ON TYPE
    // ============================================================
    
    if (scenario.payment === "CASH") {
      await prisma.payment.create({
        data: {
          salesOrderId: salesOrder.id,
          method: "CASH",
          amount: totalAmount,
          status: scenario.paymentStatus,
          verifiedAt: scenario.paymentStatus === "COMPLETED" ? new Date(orderDate.getTime() + 3600000 * randomInt(1, 6)) : null,
          platform: null,
          platformTransactionId: null,
          createdAt: orderDate,
        },
      });
    } else if (scenario.payment === "ONLINE") {
      await prisma.payment.create({
        data: {
          salesOrderId: salesOrder.id,
          method: "ONLINE",
          platform: scenario.platform || "KHALTI",
          platformTransactionId: `TXN-${Date.now()}-${i}`,
          amount: totalAmount,
          status: scenario.paymentStatus,
          verifiedAt: scenario.paymentStatus === "COMPLETED" ? new Date(orderDate.getTime() + 3600000 * randomInt(1, 6)) : null,
          createdAt: orderDate,
        },
      });
    } else if (scenario.payment === "CREDIT") {
      // ✅ CREDIT: Buy Now, Pay Later
      await prisma.payment.create({
        data: {
          salesOrderId: salesOrder.id,
          method: "CREDIT",
          amount: totalAmount,
          status: "PENDING",
          platform: null,
          platformTransactionId: null,
          createdAt: orderDate,
        },
      });

      const existingCreditAccount = await prisma.creditAccount.findUnique({
        where: { customerId: customer.id },
      });

      if (existingCreditAccount) {
        await prisma.creditAccount.update({
          where: { customerId: customer.id },
          data: {
            totalCredit: existingCreditAccount.totalCredit + totalAmount,
            remainingBalance: existingCreditAccount.remainingBalance + totalAmount,
            status: existingCreditAccount.remainingBalance + totalAmount === 0 ? "PAID" : "PARTIAL",
          },
        });
        creditAccountsCreated.push(existingCreditAccount.id);
      } else {
        const newAccount = await prisma.creditAccount.create({
          data: {
            customerId: customer.id,
            totalCredit: totalAmount,
            paidAmount: 0,
            remainingBalance: totalAmount,
            dueDate: new Date(orderDate.getTime() + 30 * 86400000),
            status: "PENDING",
          },
        });
        creditAccountsCreated.push(newAccount.id);
      }

      await prisma.customer.update({
        where: { id: customer.id },
        data: { outstandingCredit: { increment: totalAmount } },
      });
    }

    // ============================================================
    // CREATE DELIVERY
    // ============================================================
    if (scenario.status !== 'CANCELLED') {
      const deliveryStatus = scenario.delivery || 'PENDING';
      await prisma.delivery.create({
        data: {
          salesOrderId: salesOrder.id,
          status: deliveryStatus,
          deliveryDate: deliveryStatus !== 'PENDING' ? new Date(orderDate.getTime() + 86400000 * randomInt(1, 3)) : null,
          deliveredAt: deliveryStatus === 'DELIVERED' ? new Date(orderDate.getTime() + 86400000 * randomInt(2, 5)) : null,
          notes: deliveryStatus === 'DELIVERED' ? 'Delivered successfully' : 
                  deliveryStatus === 'IN_TRANSIT' ? 'On the way' : 'Awaiting processing',
          createdAt: orderDate,
        },
      });
    }

    if ((i + 1) % 5 === 0) {
      console.log(`   Created ${i + 1} sales orders...`);
    }
  }
  console.log(`✅ Created ${salesOrderScenarios.length} sales orders`);

  // ============================================================
  // 9. CREDIT PAYMENTS (IMPORTANT FOR STAFF PERFORMANCE)
  // ============================================================
  console.log("\n💳 Recording Credit Payments...");

  const creditAccounts = await prisma.creditAccount.findMany({
    where: { remainingBalance: { gt: 0 } },
    include: { customer: true },
  });

  let creditPaymentCount = 0;

  for (const account of creditAccounts) {
    if (account.remainingBalance > 0) {
      const staff = getRandomStaff();
      
      const numPayments = Math.min(randomInt(1, 3), Math.ceil(account.remainingBalance / 1000));
      let remaining = account.remainingBalance;
      
      for (let i = 0; i < numPayments && remaining > 0; i++) {
        const maxPayment = remaining;
        const minPayment = Math.min(100, remaining);
        const paymentAmount = Math.round(
          Math.max(minPayment, remaining * randomFloat(0.2, 0.8))
        );
        
        const finalAmount = Math.min(paymentAmount, remaining);
        remaining -= finalAmount;
        
        const paymentMethods = ["CASH", "ONLINE"];
        const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
        
        let platform = null;
        let platformTransactionId = null;
        if (method === "ONLINE") {
          const platforms = ["KHALTI", "ESEWA", "FONEPAY", "OTHER"];
          platform = platforms[Math.floor(Math.random() * platforms.length)];
          platformTransactionId = `CP-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        }
        
        await prisma.creditPayment.create({
          data: {
            creditAccountId: account.id,
            amount: finalAmount,
            paymentMethod: method,
            paymentPlatform: platform,
            platformTransactionId: platformTransactionId,
            paymentDate: randomDate(new Date(Date.now() - 30 * 86400000), new Date()),
            transactionId: `CP-${Date.now()}-${i}`,
            notes: `Installment ${i + 1} of ${numPayments} for ${account.customer.name}`,
            status: "COMPLETED",
            recordedById: staff.id,
          },
        });
        
        creditPaymentCount++;
        console.log(`   ${staff.name} recorded payment of NPR ${finalAmount} from ${account.customer.name}`);
      }

      const totalPaid = account.totalCredit - remaining;
      await prisma.creditAccount.update({
        where: { id: account.id },
        data: {
          paidAmount: totalPaid,
          remainingBalance: remaining,
          status: remaining === 0 ? "PAID" : "PARTIAL",
        },
      });

      await prisma.customer.update({
        where: { id: account.customerId },
        data: { outstandingCredit: remaining },
      });
    }
  }
  console.log(`✅ Recorded ${creditPaymentCount} credit payments`);

  // ============================================================
  // 10. PURCHASE ORDERS
  // ============================================================
  console.log("\n🔄 Creating Purchase Orders...");

  const poScenarios = [
    { status: "RECEIVED", payment: "PAID" },
    { status: "RECEIVED", payment: "PAID" },
    { status: "RECEIVED", payment: "PARTIAL" },
    { status: "RECEIVED", payment: "PARTIAL" },
    { status: "RECEIVED", payment: "UNPAID" },
    { status: "APPROVED", payment: "UNPAID" },
    { status: "APPROVED", payment: "UNPAID" },
    { status: "PENDING", payment: "UNPAID" },
    { status: "PENDING", payment: "UNPAID" },
    { status: "PARTIALLY_RECEIVED", payment: "PARTIAL" },
    { status: "PARTIALLY_RECEIVED", payment: "UNPAID" },
    { status: "RECEIVED", payment: "PAID" },
    { status: "RECEIVED", payment: "PAID" },
    { status: "RECEIVED", payment: "PARTIAL" },
    { status: "CANCELLED", payment: "UNPAID" },
  ];

  const poStartDate = new Date();
  poStartDate.setDate(poStartDate.getDate() - 60);

  for (let i = 0; i < poScenarios.length; i++) {
    const scenario = poScenarios[i];
    const supplier = getRandomSupplier();
    const manager = getRandomManager();
    const poDate = randomDate(poStartDate, new Date());
    
    const numItems = randomInt(1, 3);
    let subtotal = 0;
    const items = [];
    const usedRMs = new Set();

    for (let j = 0; j < numItems; j++) {
      let rm = getRandomRawMat();
      while (usedRMs.has(rm.id)) {
        rm = getRandomRawMat();
      }
      usedRMs.add(rm.id);
      
      const quantity = randomInt(100, 1000);
      const unitPrice = rm.unitCost || randomFloat(1, 50);
      const totalPrice = quantity * unitPrice;
      subtotal += totalPrice;
      items.push({
        rawMaterialId: rm.id,
        quantity,
        unitPrice,
        totalPrice,
      });
    }

    const discount = randomFloat(0, 5);
    const tax = randomFloat(0, 13);
    const discountAmount = subtotal * (discount / 100);
    const taxAmount = (subtotal - discountAmount) * (tax / 100);
    const totalAmount = subtotal - discountAmount + taxAmount;

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber: generateOrderNumber('PO'),
        supplierId: supplier.id,
        status: scenario.status,
        paymentStatus: scenario.payment,
        expectedDeliveryDate: new Date(poDate.getTime() + 86400000 * randomInt(5, 15)),
        deliveredAt: scenario.status === 'RECEIVED' ? new Date(poDate.getTime() + 86400000 * randomInt(7, 12)) : null,
        deliveredOnTime: scenario.status === 'RECEIVED' ? Math.random() > 0.2 : null,
        warehouseDestination: ['Main Warehouse', 'Factory Storage'][Math.floor(Math.random() * 2)],
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        totalAmount: totalAmount,
        notes: `PO ${i + 1} - ${scenario.status}`,
        createdById: manager.id,
        createdAt: poDate,
        approvedById: scenario.status !== 'PENDING' ? manager.id : null,
        approvedAt: scenario.status !== 'PENDING' ? new Date(poDate.getTime() + 86400000 * randomInt(1, 2)) : null,
      },
    });

    for (const item of items) {
      const receivedQty = scenario.status === 'RECEIVED' ? item.quantity : 
                          scenario.status === 'PARTIALLY_RECEIVED' ? Math.floor(item.quantity * randomFloat(0.3, 0.8)) : 0;
      
      await prisma.purchaseOrderRawMaterial.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          rawMaterialId: item.rawMaterialId,
          quantity: item.quantity,
          receivedQty: receivedQty,
          damagedQty: Math.random() > 0.85 ? randomInt(1, 10) : 0,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        },
      });
    }

    if (scenario.status === 'RECEIVED' || scenario.status === 'PARTIALLY_RECEIVED') {
      const grn = await prisma.goodsReceivingNote.create({
        data: {
          grnNumber: `GRN-${Date.now()}-${i}`,
          purchaseOrderId: purchaseOrder.id,
          receivedById: manager.id,
          receivedDate: new Date(poDate.getTime() + 86400000 * randomInt(5, 10)),
          notes: `GRN for PO ${purchaseOrder.orderNumber}`,
        },
      });

      const poItems = await prisma.purchaseOrderRawMaterial.findMany({
        where: { purchaseOrderId: purchaseOrder.id },
        include: { rawMaterial: true },
      });

      for (const poItem of poItems) {
        const acceptedQty = poItem.receivedQty - (poItem.damagedQty || 0);
        if (acceptedQty > 0) {
          await prisma.goodsReceivingRawMaterial.create({
            data: {
              grnId: grn.id,
              rawMaterialId: poItem.rawMaterialId,
              orderedQty: poItem.quantity,
              previouslyReceived: 0,
              receivedQty: poItem.receivedQty,
              damagedQty: poItem.damagedQty || 0,
              acceptedQty: acceptedQty,
            },
          });

          await prisma.rawMaterial.update({
            where: { id: poItem.rawMaterialId },
            data: { currentStock: { increment: acceptedQty } },
          });
        }
      }
    }

    if (scenario.payment === 'PAID' || scenario.payment === 'PARTIAL') {
      const paidAmount = scenario.payment === 'PAID' ? totalAmount : totalAmount * randomFloat(0.3, 0.7);
      await prisma.purchaseOrderPayment.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          amount: paidAmount,
          paymentMethod: ['BANK_TRANSFER', 'CASH', 'CHEQUE'][Math.floor(Math.random() * 3)],
          transactionId: `TXN-${Date.now()}-${i}`,
          paymentDate: new Date(poDate.getTime() + 86400000 * randomInt(3, 10)),
          recordedById: manager.id,
          notes: `Payment for PO ${purchaseOrder.orderNumber}`,
        },
      });
    }

    if ((i + 1) % 5 === 0) {
      console.log(`   Created ${i + 1} purchase orders...`);
    }
  }
  console.log(`✅ Created ${poScenarios.length} purchase orders`);

  // ============================================================
  // 11. PRODUCTION BATCHES
  // ============================================================
  console.log("\n🏭 Creating Production Batches...");

  const prodStartDate = new Date();
  prodStartDate.setDate(prodStartDate.getDate() - 30);

  const productRequirements = {
    "WB-500": [
      { sku: "RM-BTL-500", qty: 1 },
      { sku: "RM-CAP", qty: 1 },
      { sku: "RM-LBL-500", qty: 0.01 },
    ],
    "WB-1L": [
      { sku: "RM-BTL-1L", qty: 1 },
      { sku: "RM-CAP", qty: 1 },
      { sku: "RM-LBL-1L", qty: 0.01 },
    ],
    "WJ-20L": [
      { sku: "RM-JAR-20L", qty: 1 },
      { sku: "RM-CAP", qty: 1 },
    ],
    "WD-001": [
      { sku: "RM-RO-100", qty: 1 },
      { sku: "RM-CARB", qty: 1 },
      { sku: "RM-UV-11", qty: 1 },
    ],
  };

  let batchCount = 0;
  for (let i = 0; i < 10; i++) {
    const product = getRandomProduct();
    const manager = getRandomManager();
    const prodDate = randomDate(prodStartDate, new Date());
    const quantityProduced = randomInt(50, 300);
    
    const requirements = productRequirements[product.sku] || [];
    const rawMaterialsUsed = [];

    for (const req of requirements) {
      const rm = createdRawMaterials.find(r => r.sku === req.sku);
      if (rm) {
        const qty = Math.ceil(req.qty * quantityProduced);
        rawMaterialsUsed.push({
          rawMaterialId: rm.id,
          quantity: qty,
          unitCost: rm.unitCost || 0,
          totalCost: (rm.unitCost || 0) * qty,
          name: rm.name,
          unit: rm.unit,
        });
      }
    }

    if (rawMaterialsUsed.length === 0) {
      const shuffled = [...createdRawMaterials].sort(() => Math.random() - 0.5);
      const numMat = randomInt(2, 3);
      for (let j = 0; j < numMat && j < shuffled.length; j++) {
        const rm = shuffled[j];
        const qty = randomInt(10, 50);
        rawMaterialsUsed.push({
          rawMaterialId: rm.id,
          quantity: qty,
          unitCost: rm.unitCost || 0,
          totalCost: (rm.unitCost || 0) * qty,
          name: rm.name,
          unit: rm.unit,
        });
      }
    }

    if (rawMaterialsUsed.length === 0) continue;

    const batch = await prisma.productionBatch.create({
      data: {
        batchNumber: generateOrderNumber('PROD'),
        productId: product.id,
        quantityProduced: quantityProduced,
        unit: product.unit,
        rawMaterialsUsed: rawMaterialsUsed,
        startDate: prodDate,
        notes: `Batch ${i + 1} - ${product.name}`,
        createdById: manager.id,
        createdAt: prodDate,
      },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: { currentStock: { increment: quantityProduced } },
    });

    await prisma.stockTransaction.create({
      data: {
        productId: product.id,
        type: 'IN',
        quantity: quantityProduced,
        previousStock: product.currentStock,
        newStock: product.currentStock + quantityProduced,
        note: `Production batch ${batch.batchNumber}`,
        userId: manager.id,
        createdAt: prodDate,
      },
    });

    for (const rm of rawMaterialsUsed) {
      const rawMat = await prisma.rawMaterial.findUnique({
        where: { id: rm.rawMaterialId },
      });
      if (rawMat) {
        const newStock = Math.max(0, rawMat.currentStock - rm.quantity);
        await prisma.rawMaterial.update({
          where: { id: rm.rawMaterialId },
          data: { currentStock: newStock },
        });
      }
    }

    batchCount++;
    if (batchCount % 3 === 0) {
      console.log(`   Created ${batchCount} production batches...`);
    }
  }
  console.log(`✅ Created ${batchCount} production batches`);

  // ============================================================
  // 12. STOCK ADJUSTMENTS
  // ============================================================
  console.log("\n📦 Creating Stock Adjustments...");

  const adjustmentReasons = [
    'Damaged Inventory',
    'Physical Count Mismatch',
    'Quality Control Rejection',
    'Expired Products',
    'Stock Audit Correction',
  ];

  for (let i = 0; i < 5; i++) {
    const product = getRandomProduct();
    const staff = getRandomStaff();
    const manager = getRandomManager();
    const adjustmentDate = randomDate(new Date(Date.now() - 20 * 86400000), new Date());
    const adjustmentType = ['DAMAGE', 'EXPIRED', 'CORRECTION', 'THEFT', 'RETURN'][i % 5];
    const currentStock = product.currentStock;
    
    const isReduction = Math.random() > 0.4;
    const requestedQty = isReduction ? -randomInt(5, 30) : randomInt(5, 20);
    const newStock = Math.max(0, currentStock + requestedQty);
    
    const statuses = ['APPROVED', 'APPROVED', 'PENDING', 'APPROVED'];
    const status = statuses[i % statuses.length];

    await prisma.stockAdjustment.create({
      data: {
        requestNumber: generateOrderNumber('ADJ'),
        productId: product.id,
        itemType: 'PRODUCT',
        adjustmentType: adjustmentType,
        currentStock: currentStock,
        requestedQuantity: requestedQty,
        newStock: newStock,
        reason: adjustmentReasons[i % adjustmentReasons.length],
        status: status,
        notes: `Adjustment ${i + 1}`,
        requestedById: staff.id,
        approvedById: status !== 'PENDING' ? manager.id : null,
        rejectionReason: status === 'REJECTED' ? 'Insufficient documentation' : null,
        createdAt: adjustmentDate,
        approvedAt: status !== 'PENDING' ? new Date(adjustmentDate.getTime() + 86400000 * randomInt(1, 2)) : null,
      },
    });

    if (status === 'APPROVED') {
      await prisma.product.update({
        where: { id: product.id },
        data: { currentStock: newStock },
      });
    }
  }
  console.log(`✅ Created 5 stock adjustments`);

  // ============================================================
  // 13. STAFF PERFORMANCE RECORDS (Monthly) - FIXED
  // ============================================================
  console.log("\n📊 Creating Staff Performance Records...");

  const staffMembers = getStaff();
  const months = [
    { month: 6, year: 2026 },
    { month: 7, year: 2026 },
    { month: 8, year: 2026 },
  ];

  for (const staff of staffMembers) {
    for (const m of months) {
      const monthStart = new Date(m.year, m.month - 1, 1);
      const monthEnd = new Date(m.year, m.month, 0);
      
      const staffOrders = await prisma.salesOrder.findMany({
        where: {
          createdById: staff.id,
          createdAt: { gte: monthStart, lte: monthEnd },
        },
        include: {
          payment: true,
          delivery: true,
        },
      });

      const ordersProcessed = staffOrders.length;
      const revenueGenerated = staffOrders
        .filter(o => o.status === "COMPLETED")
        .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const deliveriesCompleted = staffOrders.filter(
        o => o.delivery?.status === "DELIVERED"
      ).length;

      const creditPayments = await prisma.creditPayment.findMany({
        where: {
          recordedById: staff.id,
          status: "COMPLETED",
          paymentDate: { gte: monthStart, lte: monthEnd },
        },
      });

      const creditCollected = creditPayments.reduce(
        (sum, payment) => sum + payment.amount,
        0
      );

      const maxOrders = 20;
      const maxRevenue = 200000;
      const maxDeliveries = 15;
      const maxCredit = 20000;

      const orderScore = Math.min(30, (ordersProcessed / maxOrders) * 30);
      const revenueScore = Math.min(35, (revenueGenerated / maxRevenue) * 35);
      const deliveryScore = Math.min(20, (deliveriesCompleted / maxDeliveries) * 20);
      const creditScore = Math.min(15, (creditCollected / maxCredit) * 15);
      const performanceScore = Math.round(orderScore + revenueScore + deliveryScore + creditScore);

      // ✅ FIXED: Use findUnique + create/update instead of upsert
      const existing = await prisma.staffPerformance.findUnique({
        where: {
          userId_month: {
            userId: staff.id,
            month: monthStart,
          },
        },
      });

      if (existing) {
        await prisma.staffPerformance.update({
          where: {
            userId_month: {
              userId: staff.id,
              month: monthStart,
            },
          },
          data: {
            ordersProcessed,
            revenueGenerated,
            deliveriesCompleted,
            creditCollected,
            performanceScore: Math.min(100, performanceScore),
          },
        });
      } else {
        await prisma.staffPerformance.create({
          data: {
            userId: staff.id,
            month: monthStart,
            ordersProcessed,
            revenueGenerated,
            deliveriesCompleted,
            creditCollected,
            performanceScore: Math.min(100, performanceScore),
          },
        });
      }
    }
  }
  console.log(`✅ Created staff performance records for ${staffMembers.length} staff`);

  // ============================================================
  // SUMMARY
  // ============================================================
  console.log("\n✅ Seed complete!");
  console.log("\n📊 Transaction Data Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👥 Users: ${users.length} (1 Admin, 1 Manager, ${staffMembers.length} Staff)`);
  console.log(`🛒 Products: ${products.length}`);
  console.log(`🧱 Raw Materials: ${rawMaterials.length}`);
  console.log(`🏢 Suppliers: ${suppliers.length}`);
  console.log(`👤 Customers: ${customers.length}`);
  console.log(`📋 Sales Orders: ${await prisma.salesOrder.count()}`);
  console.log(`📋 Purchase Orders: ${await prisma.purchaseOrder.count()}`);
  console.log(`🏭 Production Batches: ${await prisma.productionBatch.count()}`);
  console.log(`💳 Credit Payments: ${creditPaymentCount}`);
  console.log(`📦 Stock Adjustments: 5`);
  console.log(`📊 Staff Performance Records: ${staffMembers.length * months.length}`);
  console.log("\n🔐 Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Admin    → gurunggaurav1611@gmail.com / 123456789");
  console.log("   Manager  → berserkermay40@gmail.com / 123456789");
  console.log("   Staff    → sotaku763@gmail.com / 123456789");
  console.log("\n📋 Staff Accounts (password: 123456789):");
  staffMembers.forEach(s => {
    if (s.email !== 'sotaku763@gmail.com') {
      console.log(`   → ${s.email}`);
    }
  });
  console.log("\n💳 Credit Payment Notes:");
  console.log("   - Each credit payment is recorded with `recordedById` (staff who collected)");
  console.log("   - Staff Performance `creditCollected` = sum of payments they recorded");
};

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());