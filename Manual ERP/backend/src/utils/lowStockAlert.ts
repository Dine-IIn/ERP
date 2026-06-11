import prisma from '../services/db';
import { ioInstance } from '../controllers/index';
import { sendPushNotifications } from '../services/firebase';

export async function checkAndNotifyLowStock(productId: string, userId?: string) {
  try {
    if (!productId) return;

    // Fetch product details
    const product = await prisma.product.findUnique({
      where: { id: productId }
    });

    if (!product) return;

    // If stock is below or equal to reorder level
    if (product.stock <= product.reorderLevel) {
      const title = "⚠️ Low Stock Alert";
      const message = `Product '${product.name}' has dropped below the safety limit. Current Stock: ${product.stock} ${product.uom} (Limit: ${product.reorderLevel})`;

      // Resolve who to notify
      let targetUserIds: string[] = [];
      if (userId) {
        targetUserIds.push(userId);
      } else {
        // Fallback: Notify all active users in the company
        const users = await prisma.user.findMany({
          where: {
            companyId: product.companyId,
            status: "ACTIVE"
          }
        });
        targetUserIds = users.map(u => u.id);
      }

      for (const targetUserId of targetUserIds) {
        // Create in-app notification in database
        const notification = await prisma.notification.create({
          data: {
            userId: targetUserId,
            title,
            message,
            category: "INVENTORY_LOW_ALERT",
            channels: "IN_APP,PUSH",
            companyId: product.companyId
          }
        });

        // Send over WebSocket if connected
        if (ioInstance) {
          ioInstance.to(targetUserId).emit('notification', notification);
          console.log(`📡 [WebSocket] Sent low stock alert to user ${targetUserId}: "${product.name}"`);
        }

        // Send Android push notification if push tokens are registered
        const pushTokens = await prisma.pushToken.findMany({
          where: { userId: targetUserId }
        });
        
        if (pushTokens.length > 0) {
          const tokens = pushTokens.map(t => t.deviceToken);
          await sendPushNotifications(tokens, {
            title,
            body: message,
            data: {
              productId: product.id,
              type: "low_stock_alert"
            }
          });
        }
      }
    }
  } catch (error) {
    console.error("❌ Error in checkAndNotifyLowStock:", error);
  }
}
