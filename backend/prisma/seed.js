// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const main = async () => {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("123456789", 10);

  // ==================== USERS ====================
  const users = [
    { name: "Gaurav Gurung",    email: "gurunggaurav1611@gmail.com",     role: "ADMIN"   },
    { name: "Berserker May",    email: "berserkermay40@gmail.com",   role: "MANAGER" },
    { name: "Slayer Otaku",     email: "sotaku763@gmail.com",     role: "STAFF"   },
  ];

  for (const u of users) {
    await prisma.user.create({
      data: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        isActive: true,
      },
    });
  }
  console.log(`✅ Created ${users.length} users`);

  // ==================== PRODUCT CATEGORIES (For Finished Goods - What you SELL) ====================
  const productCategories = [
    { name: "Water Bottles", description: "Bottled drinking water products (500ml, 1L, 5L)" },
    { name: "Water Jars", description: "20L water jar products" },
    { name: "Equipment", description: "Water dispensers and filtration equipment for sale" },
    { name: "Accessories", description: "Water accessories and spare parts" },
  ];

  const createdProductCategories = [];
  for (const cat of productCategories) {
    const created = await prisma.productCategory.create({
      data: cat,
    });
    createdProductCategories.push(created);
  }
  console.log(`✅ Created ${productCategories.length} product categories`);

  // Helper to get product category ID
  const getProductCategoryId = (name) => {
    const cat = createdProductCategories.find(c => c.name === name);
    return cat?.id;
  };

  // ==================== FINISHED PRODUCTS (What you SELL to customers) ====================
  const products = [
    {
      name: "500ml Water Bottle",
      sku: "WB-500",
      type: "BOTTLE_500ML",
      unit: "bottle",
      currentStock: 2000,
      reorderLevel: 500,
      costPrice: 8,
      sellingPrice: 15,
      category: "Water Bottles",
    },
    {
      name: "1L Water Bottle",
      sku: "WB-1L",
      type: "BOTTLE_1L",
      unit: "bottle",
      currentStock: 1500,
      reorderLevel: 300,
      costPrice: 12,
      sellingPrice: 20,
      category: "Water Bottles",
    },
    {
      name: "5L Water Bottle",
      sku: "WB-5L",
      type: "OTHER",
      unit: "bottle",
      currentStock: 800,
      reorderLevel: 150,
      costPrice: 35,
      sellingPrice: 55,
      category: "Water Bottles",
    },
    {
      name: "20L Water Jar",
      sku: "WJ-20L",
      type: "JAR_20L",
      unit: "jar",
      currentStock: 500,
      reorderLevel: 100,
      costPrice: 90,
      sellingPrice: 150,
      category: "Water Jars",
    },
    {
      name: "Water Dispenser",
      sku: "WD-001",
      type: "OTHER",
      unit: "unit",
      currentStock: 20,
      reorderLevel: 5,
      costPrice: 2500,
      sellingPrice: 3500,
      category: "Equipment",
    },
    {
      name: "Water Pump",
      sku: "WP-001",
      type: "OTHER",
      unit: "piece",
      currentStock: 50,
      reorderLevel: 10,
      costPrice: 150,
      sellingPrice: 250,
      category: "Accessories",
    },
  ];

  for (const p of products) {
    const categoryId = getProductCategoryId(p.category);
    await prisma.product.create({
      data: {
        name: p.name,
        sku: p.sku,
        type: p.type,
        unit: p.unit,
        currentStock: p.currentStock,
        reorderLevel: p.reorderLevel,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        categoryId,
      },
    });
  }
  console.log(`✅ Created ${products.length} products`);

  // ==================== RAW MATERIAL CATEGORIES (For Raw Materials - What you BUY) ====================
  const rawMaterialCategories = [
    { name: "Plastic Materials", description: "Empty bottles, jars, caps, and plastic components" },
    { name: "Packaging Materials", description: "Labels, shrink wrap, cartons, and crates" },
    { name: "Filtration Equipment", description: "RO membranes, filter cartridges, UV lamps" },
    { name: "Chemicals", description: "Cleaning chemicals, sanitizers, activated carbon" },
    { name: "Miscellaneous", description: "Office supplies, construction materials, repair items" },
  ];

  const createdRawMaterialCategories = [];
  for (const cat of rawMaterialCategories) {
    const created = await prisma.rawMaterialCategory.create({
      data: cat,
    });
    createdRawMaterialCategories.push(created);
  }
  console.log(`✅ Created ${rawMaterialCategories.length} raw material categories`);

  // Helper to get raw material category ID
  const getRawMaterialCategoryId = (name) => {
    const cat = createdRawMaterialCategories.find(c => c.name === name);
    return cat?.id;
  };

  // ==================== RAW MATERIALS (What you BUY from suppliers) ====================
  const rawMaterials = [
    // ========== 1. PLASTIC MATERIALS ==========
    {
      name: "Empty Plastic Bottle (500ml)",
      sku: "RM-PL-BTL-500",
      category: "Plastic Materials",
      unit: "piece",
      currentStock: 5000,
      reorderLevel: 1000,
      unitCost: 2.5,
    },
    {
      name: "Empty Plastic Bottle (1L)",
      sku: "RM-PL-BTL-1L",
      category: "Plastic Materials",
      unit: "piece",
      currentStock: 4000,
      reorderLevel: 800,
      unitCost: 3.5,
    },
    {
      name: "Empty Plastic Bottle (5L)",
      sku: "RM-PL-BTL-5L",
      category: "Plastic Materials",
      unit: "piece",
      currentStock: 2000,
      reorderLevel: 400,
      unitCost: 12,
    },
    {
      name: "Empty Water Jar (20L)",
      sku: "RM-PL-JAR-20L",
      category: "Plastic Materials",
      unit: "piece",
      currentStock: 1000,
      reorderLevel: 200,
      unitCost: 20,
    },
    {
      name: "Bottle Cap (Standard)",
      sku: "RM-PL-CAP-BTL",
      category: "Plastic Materials",
      unit: "piece",
      currentStock: 10000,
      reorderLevel: 2000,
      unitCost: 0.5,
    },
    {
      name: "Jar Cap/Seal (20L)",
      sku: "RM-PL-CAP-JAR",
      category: "Plastic Materials",
      unit: "piece",
      currentStock: 2000,
      reorderLevel: 400,
      unitCost: 2,
    },

    // ========== 2. PACKAGING MATERIALS ==========
    {
      name: "Bottle Label (500ml)",
      sku: "RM-PK-LBL-500",
      category: "Packaging Materials",
      unit: "roll",
      currentStock: 10000,
      reorderLevel: 2000,
      unitCost: 0.25,
    },
    {
      name: "Bottle Label (1L)",
      sku: "RM-PK-LBL-1L",
      category: "Packaging Materials",
      unit: "roll",
      currentStock: 8000,
      reorderLevel: 1500,
      unitCost: 0.3,
    },
    {
      name: "Jar Label (20L)",
      sku: "RM-PK-LBL-JAR",
      category: "Packaging Materials",
      unit: "roll",
      currentStock: 3000,
      reorderLevel: 500,
      unitCost: 0.5,
    },
    {
      name: "Shrink Wrap",
      sku: "RM-PK-SW",
      category: "Packaging Materials",
      unit: "roll",
      currentStock: 200,
      reorderLevel: 50,
      unitCost: 18,
    },
    {
      name: "Carton Box (Small)",
      sku: "RM-PK-BOX-S",
      category: "Packaging Materials",
      unit: "piece",
      currentStock: 1000,
      reorderLevel: 200,
      unitCost: 8,
    },
    {
      name: "Carton Box (Large)",
      sku: "RM-PK-BOX-L",
      category: "Packaging Materials",
      unit: "piece",
      currentStock: 500,
      reorderLevel: 100,
      unitCost: 12,
    },
    {
      name: "Plastic Crate (Bottle Carrier)",
      sku: "RM-PK-CRATE",
      category: "Packaging Materials",
      unit: "piece",
      currentStock: 300,
      reorderLevel: 50,
      unitCost: 25,
    },

    // ========== 3. FILTRATION EQUIPMENT ==========
    {
      name: "RO Membrane (100 GPD)",
      sku: "RM-FL-RO-100",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 50,
      reorderLevel: 10,
      unitCost: 1500,
    },
    {
      name: "RO Membrane (200 GPD)",
      sku: "RM-FL-RO-200",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 30,
      reorderLevel: 8,
      unitCost: 2500,
    },
    {
      name: "Sediment Filter Cartridge",
      sku: "RM-FL-SED",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 100,
      reorderLevel: 20,
      unitCost: 350,
    },
    {
      name: "Carbon Filter Cartridge",
      sku: "RM-FL-CARB",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 80,
      reorderLevel: 15,
      unitCost: 400,
    },
    {
      name: "UV Lamp (11W)",
      sku: "RM-FL-UV-11",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 50,
      reorderLevel: 10,
      unitCost: 500,
    },
    {
      name: "UV Lamp (20W)",
      sku: "RM-FL-UV-20",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 30,
      reorderLevel: 8,
      unitCost: 750,
    },
    {
      name: "Pressure Gauge",
      sku: "RM-FL-GAUGE",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 40,
      reorderLevel: 10,
      unitCost: 120,
    },
    {
      name: "Flow Meter",
      sku: "RM-FL-METER",
      category: "Filtration Equipment",
      unit: "piece",
      currentStock: 25,
      reorderLevel: 5,
      unitCost: 300,
    },

    // ========== 4. CHEMICALS ==========
    {
      name: "Cleaning Chemical (RO Cleaner)",
      sku: "RM-CH-RO-CLN",
      category: "Chemicals",
      unit: "liter",
      currentStock: 200,
      reorderLevel: 50,
      unitCost: 250,
    },
    {
      name: "Sanitizer (Food Grade)",
      sku: "RM-CH-SAN",
      category: "Chemicals",
      unit: "liter",
      currentStock: 150,
      reorderLevel: 30,
      unitCost: 180,
    },
    {
      name: "Activated Carbon (Granular)",
      sku: "RM-CH-AC-G",
      category: "Chemicals",
      unit: "kg",
      currentStock: 500,
      reorderLevel: 100,
      unitCost: 85,
    },
    {
      name: "Activated Carbon (Block)",
      sku: "RM-CH-AC-B",
      category: "Chemicals",
      unit: "piece",
      currentStock: 100,
      reorderLevel: 20,
      unitCost: 120,
    },
    {
      name: "Water Testing Kit",
      sku: "RM-CH-TEST",
      category: "Chemicals",
      unit: "kit",
      currentStock: 30,
      reorderLevel: 10,
      unitCost: 500,
    },
    {
      name: "pH Booster",
      sku: "RM-CH-PH",
      category: "Chemicals",
      unit: "liter",
      currentStock: 100,
      reorderLevel: 25,
      unitCost: 150,
    },

    // ========== 5. MISCELLANEOUS ==========
    {
      name: "Invoice Paper (Thermal Roll)",
      sku: "RM-MISC-INV",
      category: "Miscellaneous",
      unit: "roll",
      currentStock: 200,
      reorderLevel: 50,
      unitCost: 25,
    },
    {
      name: "Printer Paper (A4)",
      sku: "RM-MISC-A4",
      category: "Miscellaneous",
      unit: "ream",
      currentStock: 100,
      reorderLevel: 20,
      unitCost: 30,
    },
    {
      name: "Receipt Book",
      sku: "RM-MISC-RCPT",
      category: "Miscellaneous",
      unit: "book",
      currentStock: 150,
      reorderLevel: 30,
      unitCost: 15,
    },
    {
      name: "Stationery Set",
      sku: "RM-MISC-STN",
      category: "Miscellaneous",
      unit: "set",
      currentStock: 50,
      reorderLevel: 10,
      unitCost: 100,
    },
    {
      name: "Cement (50kg bag)",
      sku: "RM-MISC-CEM",
      category: "Miscellaneous",
      unit: "bag",
      currentStock: 50,
      reorderLevel: 10,
      unitCost: 600,
    },
    {
      name: "Construction Sand",
      sku: "RM-MISC-SAND",
      category: "Miscellaneous",
      unit: "cubic meter",
      currentStock: 20,
      reorderLevel: 5,
      unitCost: 2500,
    },
    {
      name: "Bricks",
      sku: "RM-MISC-BRK",
      category: "Miscellaneous",
      unit: "piece",
      currentStock: 5000,
      reorderLevel: 1000,
      unitCost: 10,
    },
    {
      name: "Paint (White, 20L)",
      sku: "RM-MISC-PNT",
      category: "Miscellaneous",
      unit: "bucket",
      currentStock: 30,
      reorderLevel: 10,
      unitCost: 800,
    },
    {
      name: "Pipe Fittings",
      sku: "RM-MISC-PIPE",
      category: "Miscellaneous",
      unit: "set",
      currentStock: 100,
      reorderLevel: 20,
      unitCost: 50,
    },
    {
      name: "Electrical Wires",
      sku: "RM-MISC-WIRE",
      category: "Miscellaneous",
      unit: "meter",
      currentStock: 500,
      reorderLevel: 100,
      unitCost: 15,
    },
  ];

  for (const rm of rawMaterials) {
    const categoryId = getRawMaterialCategoryId(rm.category);
    await prisma.rawMaterial.create({
      data: {
        name: rm.name,
        sku: rm.sku,
        unit: rm.unit,
        currentStock: rm.currentStock,
        reorderLevel: rm.reorderLevel,
        unitCost: rm.unitCost,
        status: "Active",
        categoryId,
      },
    });
  }
  console.log(`✅ Created ${rawMaterials.length} raw materials`);

  // ==================== SUPPLIERS WITH CATEGORIES ====================
  const suppliers = [
    {
      name: "PlastiPack Industries",
      contactPerson: "Rajesh Sharma",
      phone: "+91 98765 43210",
      email: "sales@plastipack.com",
      address: "Plot 14, MIDC Industrial Area, Mumbai",
      productCategories: ["Plastic Materials", "Packaging Materials"],
      paymentTerms: "Net 30",
      status: "Active",
      performanceRating: 4.8,
      bankName: "HDFC Bank",
      bankAccountNumber: "1234567890",
      bankAccountName: "PlastiPack Industries",
      bankBranch: "MIDC Branch",
      notes: "Leading supplier of plastic bottles, jars, and packaging materials",
    },
    {
      name: "AquaPure Filters",
      contactPerson: "Priya Mehta",
      phone: "+91 98200 11223",
      email: "sales@aquapure.in",
      address: "Industrial Estate, Pune",
      productCategories: ["Filtration Equipment", "Chemicals"],
      paymentTerms: "Net 30",
      status: "Active",
      performanceRating: 4.7,
      bankName: "ICICI Bank",
      bankAccountNumber: "9876543210",
      bankAccountName: "AquaPure Filters",
      bankBranch: "Pune Main",
      notes: "Specializes in RO membranes and filtration systems",
    },
    {
      name: "ChemPure Solutions",
      contactPerson: "Dr. Anita Desai",
      phone: "+91 99887 66554",
      email: "orders@chempure.com",
      address: "23 Lake View Rd, Navi Mumbai",
      productCategories: ["Chemicals", "Filtration Equipment"],
      paymentTerms: "Net 15",
      status: "Active",
      performanceRating: 4.5,
      bankName: "Axis Bank",
      bankAccountNumber: "555566667777",
      bankAccountName: "ChemPure Solutions",
      bankBranch: "Navi Mumbai",
      notes: "Industrial chemicals and water treatment solutions",
    },
    {
      name: "ClearPack Solutions",
      contactPerson: "Vikram Singh",
      phone: "+91 97600 77889",
      email: "info@clearpack.com",
      address: "88 Riverside Blvd, Bangalore",
      productCategories: ["Packaging Materials"],
      paymentTerms: "COD",
      status: "Active",
      performanceRating: 4.2,
      bankName: "Kotak Bank",
      bankAccountNumber: "444433332222",
      bankAccountName: "ClearPack Solutions",
      bankBranch: "Bangalore",
      notes: "Premium packaging materials including labels and shrink wraps",
    },
    {
      name: "National Hardware Store",
      contactPerson: "Suresh Gupta",
      phone: "+91 98765 12345",
      email: "sales@nationalhardware.com",
      address: "Main Road, Industrial Area, Delhi",
      productCategories: ["Miscellaneous"],
      paymentTerms: "Net 30",
      status: "Active",
      performanceRating: 4.0,
      bankName: "SBI",
      bankAccountNumber: "111122223333",
      bankAccountName: "National Hardware",
      bankBranch: "Delhi Main",
      notes: "Construction materials, office supplies, and repair items",
    },
    {
      name: "EcoPlast Industries",
      contactPerson: "Meera Joshi",
      phone: "+91 99888 77665",
      email: "sales@ecoplast.com",
      address: "Green Industrial Park, Ahmedabad",
      productCategories: ["Plastic Materials"],
      paymentTerms: "Net 45",
      status: "Active",
      performanceRating: 4.9,
      bankName: "HDFC Bank",
      bankAccountNumber: "999988887777",
      bankAccountName: "EcoPlast Industries",
      bankBranch: "Ahmedabad",
      notes: "Eco-friendly plastic bottles and sustainable packaging",
    },
    {
      name: "UltraPure Filtration",
      contactPerson: "Dr. Rajiv Kapoor",
      phone: "+91 97654 32109",
      email: "contact@ultrapure.com",
      address: "Tech Park, Hyderabad",
      productCategories: ["Filtration Equipment"],
      paymentTerms: "Net 30",
      status: "Active",
      performanceRating: 4.6,
      bankName: "ICICI Bank",
      bankAccountNumber: "777766665555",
      bankAccountName: "UltraPure Filtration",
      bankBranch: "Hyderabad",
      notes: "High-end water filtration components",
    },
  ];

  for (const supplier of suppliers) {
    await prisma.supplier.create({
      data: supplier,
    });
  }
  console.log(`✅ Created ${suppliers.length} suppliers`);

  // ==================== CUSTOMERS ====================
  const customers = [
    {
      name: "Amit Verma",
      phone: "+91 98765 43211",
      email: "amit.verma@example.com",
      address: "123 Civil Lines, Delhi",
      deliveryAddress: "123 Civil Lines, Delhi",
      customerType: "REGULAR",
      creditLimit: 5000,
    },
    {
      name: "Priya Nair",
      phone: "+91 98765 43212",
      email: "priya.nair@example.com",
      address: "45 Marine Drive, Mumbai",
      deliveryAddress: "45 Marine Drive, Mumbai",
      customerType: "VIP",
      creditLimit: 10000,
    },
    {
      name: "Suresh Kumar",
      phone: "+91 98765 43213",
      email: "suresh.kumar@example.com",
      address: "78 Park Street, Kolkata",
      deliveryAddress: "78 Park Street, Kolkata",
      customerType: "REGULAR",
      creditLimit: 3000,
    },
    {
      name: "Neha Gupta",
      phone: "+91 98765 43214",
      email: "neha.gupta@example.com",
      address: "456 South Extension, Delhi",
      deliveryAddress: "456 South Extension, Delhi",
      customerType: "REGULAR",
      creditLimit: 4000,
    },
    {
      name: "Rajesh Iyer",
      phone: "+91 98765 43215",
      email: "rajesh.iyer@example.com",
      address: "89 Anna Nagar, Chennai",
      deliveryAddress: "89 Anna Nagar, Chennai",
      customerType: "VIP",
      creditLimit: 15000,
    },
  ];

  for (const customer of customers) {
    await prisma.customer.create({
      data: customer,
    });
  }
  console.log(`✅ Created ${customers.length} customers`);

  // ==================== SUMMARY ====================
  console.log("\n✅ Seed complete!");
  console.log("\n📊 Seeded Data Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`👥 Users: ${users.length} (1 Admin, 1 Manager, 1 Staff)`);
  console.log(`📦 Product Categories: ${productCategories.length}`);
  console.log(`🛒 Products: ${products.length}`);
  console.log(`📦 Raw Material Categories: ${rawMaterialCategories.length}`);
  
  for (const cat of rawMaterialCategories) {
    const count = rawMaterials.filter(rm => rm.category === cat.name).length;
    console.log(`   └─ ${cat.name}: ${count} items`);
  }
  
  console.log(`🏢 Suppliers: ${suppliers.length}`);
  console.log(`   └─ Categorized by: Plastic Materials, Packaging Materials, Filtration Equipment, Chemicals, Miscellaneous`);
  console.log(`👤 Customers: ${customers.length}`);
  console.log("\n🔐 Login Credentials:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   Admin    → gurunggaurav1611@gmail.com / 123456789");
  console.log("   Manager  → berserkermay40@gmail.com / 123456789");
  console.log("   Staff    → sotaku763@gmail.com / 123456789");
  console.log("\n📋 Business Flow:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("   1. Manager buys Raw Materials from Suppliers (Purchase Orders)");
  console.log("   2. Raw Materials are received via Goods Receiving Note (GRN)");
  console.log("   3. Manager produces Finished Products (Stock Production)");
  console.log("   4. Staff sells Finished Products to Customers (Sales Orders)");
  console.log("   5. Deliveries are created and completed by Staff");
};

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());