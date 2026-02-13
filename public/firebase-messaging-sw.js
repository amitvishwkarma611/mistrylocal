importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");

// 🔹 Firebase config (same as frontend)
firebase.initializeApp({
  apiKey: "AIzaSyBos6sD7W3y8EHvcDSYnvu7TehIgaw4ka8",
  authDomain: "mistrylocal.firebaseapp.com",
  projectId: "mistrylocal",
  storageBucket: "mistrylocal.firebasestorage.app",
  messagingSenderId: "994770518651",
  appId: "1:994770518651:web:426413c55474680eee58de"
});

// 🔹 IMPORTANT — messaging object create karo
const messaging = firebase.messaging();

// 🔔 Background push receive
messaging.onBackgroundMessage((payload) => {
  console.log("🔔 SW background payload received:", payload);

  const notificationData = {
    ...payload.data,
    click_action: payload.data?.click_action || '/',
    bookingId: payload.data?.bookingId || null,
    serviceType: payload.data?.serviceType || null
  };

  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: notificationData,
    tag: 'mistrylocal-notification',
    requireInteraction: false,
    actions: [
      { action: 'open', title: 'Open App' },
      { action: 'view_jobs', title: 'View Jobs' }
    ]
  });
});

// 🔔 Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log("🔔 Notification clicked:", event.notification.data);
  
  event.notification.close();

  const data = event.notification.data || {};
  const clickAction = data.click_action || '/';

  // Handle different actions
  if (event.action === 'view_jobs' || data.action === 'view_jobs') {
    // Open app to jobs page
    clients.openWindow('/?tab=jobs');
    return;
  }

  // Default: open the app
  clients.matchAll({ type: 'window', includeUncontrolled: true })
    .then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        // Focus existing window if it's the same origin
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          
          // Send message to the client about the notification click
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data: data
          });
          
          return;
        }
      }
      
      // If no existing window, open new one
      if (clients.openWindow) {
        clients.openWindow(clickAction)
          .then((windowClient) => {
            if (windowClient) {
              // Send data to new window once it's ready
              windowClient.postMessage({
                type: 'NOTIFICATION_CLICKED',
                data: data
              }, '*');
            }
          });
      }
    });
});

// 🔔 Handle message events from the app
self.addEventListener('message', (event) => {
  console.log("🔔 SW received message:", event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});