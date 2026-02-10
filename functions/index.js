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