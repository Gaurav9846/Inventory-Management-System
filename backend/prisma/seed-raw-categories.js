// prisma/seed-raw-categories.js
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================
// RAW MATERIAL CATEGORIES SEED
// ============================================================
const rawMaterialCategories = [
  { 
    name: "Plastic Materials", 
    description: "Empty bottles, jars, caps, plastic components",
    icon: "Package" 
  },
  { 
    name: "Packaging Materials", 
    description: "Labels, shrink wrap, cartons, crates",
    icon: "Box" 
  },
  { 
    name: "Filtration Equipment", 
    description: "RO membranes, filter cartridges, UV lamps",
    icon: "Droplet" 
  },
  { 
    name: "Chemicals", 
    description: "Cleaning chemicals, sanitizers, activated carbon",
    icon: "FlaskConical" 
  },
  { 
    name: "Miscellaneous", 
    description: "Office supplies, construction materials, repair items",
    icon: "Wrench" 
  },
];

async function seedRawMaterialCategories() {
  console.log("🌱 Seeding raw material categories...");

  try {
    for (const cat of rawMaterialCategories) {
      const existing = await prisma.rawMaterialCategory.findUnique({
        where: { name: cat.name }
      });

      if (existing) {
        console.log(`⏭️  Category "${cat.name}" already exists, skipping...`);
        continue;
      }

      const created = await prisma.rawMaterialCategory.create({
        data: cat,
      });
      console.log(`✅ Created category: ${created.name}`);
    }

    console.log("\n✅ Raw material categories seeded successfully!");
    
    // Display all categories
    const allCategories = await prisma.rawMaterialCategory.findMany({
      orderBy: { name: "asc" },
    });
    
    console.log("\n📋 All Raw Material Categories:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    allCategories.forEach(c => {
      console.log(`   🏷️  ${c.name}`);
      console.log(`      ${c.description}`);
      console.log(`      Icon: ${c.icon || "None"}`);
      console.log("");
    });

  } catch (error) {
    console.error("❌ Error seeding raw material categories:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seed
seedRawMaterialCategories()
  .then(() => {
    console.log("🎉 Seed completed successfully!");
  })
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  });