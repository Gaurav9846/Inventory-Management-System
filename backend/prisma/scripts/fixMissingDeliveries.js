// scripts/fixMissingDeliveries.js
import prisma from "../../src/config/prisma.js";

async function fixMissingDeliveries() {
  console.log("🔍 Finding orders without delivery records...");
  
  try {
    // Get all orders with their delivery records
    const orders = await prisma.salesOrder.findMany({
      include: { delivery: true },
    });
    
    const missingDeliveries = orders.filter(order => !order.delivery);
    
    console.log(`📊 Found ${missingDeliveries.length} orders missing deliveries`);
    console.log(`📊 Total orders: ${orders.length}`);
    console.log(`📊 Existing deliveries: ${orders.length - missingDeliveries.length}`);
    
    if (missingDeliveries.length === 0) {
      console.log("✅ All orders have delivery records!");
      return;
    }
    
    let created = 0;
    
    for (const order of missingDeliveries) {
      let deliveryStatus = "PENDING";
      let deliveryDate = null;
      let deliveredAt = null;
      let notes = "Awaiting processing";
      
      // Determine correct delivery status based on order status
      if (order.status === "COMPLETED") {
        deliveryStatus = "DELIVERED";
        deliveryDate = order.updatedAt || order.createdAt;
        deliveredAt = order.updatedAt || order.createdAt;
        notes = "Delivered successfully";
      } else if (order.status === "CANCELLED") {
        deliveryStatus = "RETURNED";
        notes = "Order cancelled";
      } else if (order.status === "PROCESSING") {
        deliveryStatus = "PENDING";
        notes = "Awaiting dispatch - Order processed";
      } else if (order.status === "DISPATCHED") {
        deliveryStatus = "IN_TRANSIT";
        notes = "On the way";
      }
      
      // Create delivery record
      await prisma.delivery.create({
        data: {
          salesOrderId: order.id,
          status: deliveryStatus,
          deliveryDate: deliveryDate,
          deliveredAt: deliveredAt,
          notes: notes,
        },
      });
      
      created++;
      console.log(`✅ Created delivery for ${order.orderNumber} (${order.status}) -> ${deliveryStatus}`);
    }
    
    console.log(`\n✅ Successfully created ${created} delivery records!`);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the function
fixMissingDeliveries();