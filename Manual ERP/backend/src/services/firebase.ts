import * as admin from 'firebase-admin';

let firebaseInitialized = false;

try {
  const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (serviceAccountVar) {
    let serviceAccount: any;
    try {
      // Attempt to parse stringified JSON directly
      serviceAccount = JSON.parse(serviceAccountVar);
    } catch {
      // If parsing fails, treat it as a file path
      const fs = require('fs');
      const path = require('path');
      const filePath = path.resolve(serviceAccountVar);
      if (fs.existsSync(filePath)) {
        serviceAccount = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      firebaseInitialized = true;
      console.log("🚀 [Firebase SDK] Initialized successfully using Service Account.");
    }
  }
} catch (error: any) {
  console.warn("⚠️ [Firebase SDK Warning] Failed to initialize Firebase admin:", error.message);
}

if (!firebaseInitialized) {
  console.warn("⚠️ [Firebase SDK] Firebase credentials not configured in process.env.FIREBASE_SERVICE_ACCOUNT_JSON. FCM is running in dry-run/mock mode.");
}

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

/**
 * Dispatches high-priority push notifications to multiple device tokens via Firebase Cloud Messaging.
 */
export async function sendPushNotifications(tokens: string[], payload: PushPayload) {
  if (tokens.length === 0) return;

  if (!firebaseInitialized) {
    console.log(`📡 [FCM Mock] Dry-run message broadcast to ${tokens.length} tokens:`, JSON.stringify(payload));
    return;
  }

  try {
    const message: admin.messaging.MulticastMessage = {
      tokens: tokens,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: payload.data || {},
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          clickAction: 'FCM_OUTDOOR_CLICK', // standard click intent for Capacitor
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
          }
        }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`📡 [FCM Success] Sent ${response.successCount} notifications successfully; ${response.failureCount} failed.`);
    
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.error(`❌ [FCM Error] Failure sending notification to token at index ${idx}:`, resp.error?.message);
        }
      });
    }
  } catch (error: any) {
    console.error("❌ [FCM Dispatch Error] Failed to send multicast push notifications:", error);
  }
}
