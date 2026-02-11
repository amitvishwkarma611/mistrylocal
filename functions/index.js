const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

exports.sendNewBookingNotification = functions.firestore
.document('bookings/{bookingId}')
.onCreate(async (snap, context) => {
  try {
    const booking = snap.data();
    
    const workersSnap = await admin
      .firestore()
      .collection('workers')
      .where('area', '==', booking.area)
      .where('online', '==', true)
      .get();

    const tokens = [];

    workersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmToken) tokens.push(data.fcmToken);
    });

    if (tokens.length === 0) return null;

    await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: '🛠 New Job Nearby',
        body: booking.description || 'New service request received'
      }
    });

    return null;
  } catch (error) {
    return null;
  }
});

exports.testPush = functions.https.onRequest(async (req, res) => {
  const token = req.query.token;

  if (!token) {
    return res.status(400).send("Token missing");
  }

  const message = {
    token: token,
    notification: {
      title: "Test Notification",
      body: "Push notification working 🎉",
    },
  };

  try {
    await admin.messaging().send(message);
    res.send("Notification sent successfully");
  } catch (error) {
    console.error("Push error:", error);
    res.status(500).send("Push failed");
  }
});