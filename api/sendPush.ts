// Requires Vercel ENV:
// FIREBASE_PROJECT_ID
// FIREBASE_CLIENT_EMAIL
// FIREBASE_PRIVATE_KEY

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

const app = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = getFirestore(app);

// Track invalid tokens to clean up
const invalidTokens = new Set<string>();

export default async function handler(req, res) {
  try {
    const { token, title, body, pincode, service, customerName, address } = req.body;

    // ===== MODE 1: DIRECT TOKEN TEST =====
    if (token) {
      if (invalidTokens.has(token)) {
        return res.json({ success: false, error: 'Token previously marked invalid' });
      }
      
      try {
        await getMessaging().send({
          token,
          notification: {
            title: title || "MistryLocal Notification",
            body: body || "Tap to open app",
          },
          webpush: {
            notification: {
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: 'mistrylocal-direct',
              requireInteraction: true,
            },
            fcmOptions: {
              link: '/'
            }
          },
        });
      } catch (sendError: any) {
        if (sendError.code === 'messaging/registration-token-not-registered') {
          invalidTokens.add(token);
          console.log('Marked token as invalid:', token.substring(0, 20) + '...');
        }
        throw sendError;
      }

      return res.json({ success: true, mode: "single-token" });
    }

    // ===== MODE 2: BOOKING BASED PUSH =====
    if (!pincode || !service) {
      return res.status(400).json({
        error: "Missing pincode or service",
      });
    }

    // Extract booking details
    const bookingId = req.body.bookingId || null;
    const customerNameStr = customerName || 'New customer';
    const addressStr = address || pincode;

    // Query workers in the area
    const snapshot = await db
      .collection("carpenters")
      .where("online", "==", true)
      .where("serviceAreas", "array-contains", pincode)
      .get();

    const validTokens = [];
    const tokenDocMap = new Map(); // token -> docId

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken && !invalidTokens.has(data.fcmToken)) {
        validTokens.push(data.fcmToken);
        tokenDocMap.set(data.fcmToken, doc.id);
      }
    });

    if (validTokens.length === 0) {
      // Also check workers collection
      const workersSnapshot = await db
        .collection("workers")
        .where("online", "==", true)
        .where("serviceAreas", "array-contains", pincode)
        .get();
      
      workersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fcmToken && !invalidTokens.has(data.fcmToken)) {
          validTokens.push(data.fcmToken);
          tokenDocMap.set(data.fcmToken, doc.id);
        }
      });
      
      if (validTokens.length === 0) {
        return res.json({ success: false, message: "No workers online in this area" });
      }
    }

    // Send notifications in batches with HIGH PRIORITY for immediate delivery when locked
    const batchSize = 500;
    let successCount = 0;
    const failedTokens = [];
    
    for (let i = 0; i < validTokens.length; i += batchSize) {
      const batch = validTokens.slice(i, i + batchSize);
          
      try {
        // Use high-priority for immediate delivery even when device is locked
        const response = await getMessaging().sendEachForMulticast({
          tokens: batch,
          notification: {
            title: "🔔 New Job Available!",
            body: `${service} - ${customerNameStr} needs help`
          },
          android: {
            priority: 'high',
            ttl: 3600000,
            collapseKey: 'new_job_' + pincode,
            notification: {
              channelId: 'mistrylocal_jobs',
              priority: 'high',
              defaultSound: true,
              defaultVibrateTimings: true,
              sticky: true
            }
          },
          apns: {
            payload: {
              aps: {
                alert: {
                  title: "🔔 New Job Available!",
                  body: `${service} - ${customerNameStr} needs help`
                },
                sound: 'default',
                badge: 1,
                contentAvailable: true,
                priority: 'high'
              }
            },
            headers: {
              'apns-priority': '10',
              'apns-expiration': String(Math.floor(Date.now() / 1000) + 3600)
            }
          },
          webpush: {
            notification: {
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: 'mistrylocal-job',
              requireInteraction: true,
              vibrate: [200, 100, 200, 100, 200],
              timestamp: Date.now(),
              renotify: true
            },
            headers: {
              'TTL': '3600',
              'Urgency': 'high'
            },
            data: {
              bookingId: bookingId || '',
              pincode,
              service,
              customerName: customerNameStr,
              address: addressStr,
              action: 'view_job',
              tab: 'jobs',
              timestamp: Date.now().toString()
            },
            fcmOptions: {
              link: '/?tab=jobs&booking=' + (bookingId || '')
            }
          },
        });

        // Track success
        successCount += response.successCount;

        // Track failed tokens for cleanup
        response.responses.forEach((resp, idx) => {
          if (!resp.success && resp.error) {
            const failedToken = batch[idx];
            if (resp.error.code === 'messaging/registration-token-not-registered') {
              invalidTokens.add(failedToken);
              failedTokens.push(failedToken);
              
              // Clean up invalid token from Firestore
              const docId = tokenDocMap.get(failedToken);
              if (docId) {
                db.collection("carpenters").doc(docId).update({
                  fcmToken: null,
                  tokenInvalidatedAt: new Date()
                }).catch(() => {});
              }
            }
          }
        });
      } catch (batchError) {
        console.error('Batch send error:', batchError);
      }
    }

    return res.json({ 
      success: true, 
      sent: successCount,
      failed: failedTokens.length,
      mode: "multicast",
      area: pincode,
      serviceType: service
    });
  } catch (err: any) {
    console.error("🔥 PUSH ERROR:", err);

    return res.status(500).json({
      error: "Push failed",
      message: err?.message || null,
      code: err?.code || null,
    });
  }
}