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

export default async function handler(req, res) {
  try {
    const { token, title, body, pincode, service } = req.body;

    // ===== MODE 1: DIRECT TOKEN TEST =====
    if (token) {
      await getMessaging().send({
        token,

        notification: {
          title: title || "New Job",
          body: body || "Tap to open app",
        },

        webpush: {
          notification: {
            icon: "/icons/icon-192.png",
            badge: "/icons/icon-192.png",
          },
        },
      });

      return res.json({ success: true, mode: "single-token" });
    }

    // ===== MODE 2: BOOKING BASED PUSH =====
    if (!pincode || !service) {
      return res.status(400).json({
        error: "Missing pincode or service",
      });
    }

    const snapshot = await db
      .collection("carpenters")
      .where("online", "==", true)
      .where("serviceAreas", "array-contains", pincode)
      .get();

    const tokens = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    });

    if (tokens.length === 0) {
      return res.json({ success: false, message: "No carpenters online" });
    }

    await getMessaging().sendEachForMulticast({
      tokens,
      notification: {
        title: "New Job Nearby 🔧",
        body: `${service} job available. Open MistryLocal.`,
      },
      webpush: {
        notification: {
          icon: "/icons/icon-192.png",
          badge: "/icons/icon-192.png",
        },
      },
    });

    return res.json({ success: true, sent: tokens.length, mode: "multicast" });
  } catch (err: any) {
    console.error("🔥 PUSH REAL ERROR:", err);

    return res.status(500).json({
      error: "Push failed",
      message: err?.message || null,
      code: err?.code || null,
    });
  }
}