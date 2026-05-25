// prisma/seed.js
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const main = async () => {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("123456789", 10);

  // ----- Users (1 Admin, 2 Managers, 2 Staff) -----
  const users = [
    { name: "System Admin",    email: "gurunggaurav1611@gmail.com", role: "ADMIN"   },
    { name: "Berserker May",   email: "berserkermay40@gmail.com",   role: "MANAGER" },
    { name: "Lost World",      email: "lostworld450@gmail.com",     role: "MANAGER" },
    { name: "Sotaku",          email: "sotaku763@gmail.com",        role: "STAFF"   },
    { name: "Edward Law",      email: "edwardlaw272@gmail.com",     role: "STAFF"   },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: {
        name: u.name,
        email: u.email,
        password: hashedPassword,
        role: u.role,
        isActive: true,
      },
    });
  }

  // ----- Categories -----
  const categories = [
    { name: "Water Jars",           description: "20L reusable water jars" },
    { name: "Water Bottles",        description: "Bottled drinking water (500ml, 1L etc.)" },
    { name: "Filtration Equipment", description: "Water filters, cartridges, UV systems" },
    { name: "Accessories",          description: "Pumps, caps, stands, cleaning kits" },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // Helper to get category ID by name
  const getCategoryId = async (name) => {
    const cat = await prisma.category.findUnique({ where: { name } });
    return cat.id;
  };

  // ----- Products (without image fields – they become NULL) -----
  const products = [
    { name: "Labeled Water Jar",     sku: "JAR-LBL-20L", category: "Water Jars", unit: "piece", reorderLevel: 50,  currentStock: 120, costPrice: 280, sellingPrice: 350 },
    { name: "Normal Water Jar",      sku: "JAR-NRM-20L", category: "Water Jars", unit: "piece", reorderLevel: 40,  currentStock: 85,  costPrice: 250, sellingPrice: 300 },
    { name: "Labeled Water Bottle",  sku: "BTL-LBL-1L",  category: "Water Bottles", unit: "bottle", reorderLevel: 200, currentStock: 450, costPrice: 18,  sellingPrice: 25 },
    { name: "Normal Water Bottle",   sku: "BTL-NRM-1L",  category: "Water Bottles", unit: "bottle", reorderLevel: 150, currentStock: 320, costPrice: 15,  sellingPrice: 20 },
    { name: "Filtration Equipment",  sku: "FILT-MAIN",   category: "Filtration Equipment", unit: "unit",  reorderLevel: 5,   currentStock: 12,  costPrice: 1800, sellingPrice: 2500 },
    { name: "Accessories",           sku: "ACC-GEN",     category: "Accessories", unit: "piece", reorderLevel: 20,  currentStock: 45,  costPrice: 80,   sellingPrice: 120 },
  ];

  for (const p of products) {
    const categoryId = await getCategoryId(p.category);
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        name: p.name,
        sku: p.sku,
        unit: p.unit,
        reorderLevel: p.reorderLevel,
        currentStock: p.currentStock,
        costPrice: p.costPrice,
        sellingPrice: p.sellingPrice,
        categoryId,
        // imageUrl and imagePublicId are omitted → they stay NULL in DB
      },
    });
  }

  console.log("✅ Seed complete.");
  console.log("👥 Users created:");
  console.log("   Admin    → gurunggaurav1611@gmail.com");
  console.log("   Managers → berserkermay40@gmail.com, lostworld450@gmail.com");
  console.log("   Staff    → sotaku763@gmail.com, edwardlaw272@gmail.com");
  console.log("   🔐 All passwords: 123456789");
  console.log("📦 Products seeded with stock & prices.");
};

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());