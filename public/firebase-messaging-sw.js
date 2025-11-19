importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  // apiKey: "YOUR_API_KEY",
  // authDomain: "YOUR_PROJECT.firebaseapp.com",
  // projectId: "YOUR_PROJECT_ID",
  // storageBucket: "YOUR_PROJECT.appspot.com",
  // messagingSenderId: "123456789",
  // appId: "1:123456789:web:abcdef"

  apiKey: "AIzaSyDj4CbDhlN_dxQ1exeCtPTgSZZfN8IAddM",
  authDomain: "turaincash-57c48.firebaseapp.com",
  projectId: "turaincash-57c48",
  storageBucket: "turaincash-57c48.firebasestorage.app",
  messagingSenderId: "665076337085",
  appId: "1:665076337085:web:8a360f95eaf720e0292ad4",
  measurementId: "G-VVVTVB21R9"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

console.log('[firebase-messaging-sw.js] Firebase initialized');

messaging.onBackgroundMessage((payload) => {

  console.log('Received background message:', payload);

  const notificationTitle = payload.notification?.title || 'New Message';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message',
    icon: '/icon-192x192.png',
    data: payload.data,
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll().then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

