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
    const { pincode, service } = req.body;

    const snapshot = await db
      .collection("carpenters")
      .where("online", "==", true)
      .where("serviceAreas", "array-contains", pincode)
      .get();

    const tokens: string[] = [];

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
    });

    return res.json({ success: true, sent: tokens.length });
  } catch (err: any) {
    console.error("🔥 PUSH REAL ERROR:", err);

    res.status(500).json({
      error: "Push failed",
      message: err?.message || null,
      code: err?.code || null,
    });
  }
}