/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBos6sD7W3y8EHvcDSYnvu7TehIgaw4ka8",
  authDomain: "mistrylocal.firebaseapp.com",
  projectId: "mistrylocal",
  storageBucket: "mistrylocal.firebasestorage.app",
  messagingSenderId: "994770518651",
  appId: "1:994770518651:web:426413c55474680eee58de",
});

const messaging = firebase.messaging();

// Background push handler
messaging.onBackgroundMessage(function (payload) {
  console.log("📩 Background message received:", payload);

  const notificationTitle =
    payload?.notification?.title || "New Job Available";

  const notificationOptions = {
    body:
      payload?.notification?.body ||
      "Tap to view job details",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: payload?.data || {},
  };

  self.registration.showNotification(
    notificationTitle,
    notificationOptions
  );
});