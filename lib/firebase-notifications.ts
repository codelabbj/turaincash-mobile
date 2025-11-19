import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
import { Capacitor } from '@capacitor/core';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'web') {
  messaging = getMessaging(app);
}

const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export class NotificationService {
  private token: string | null = null;
  private platform: string = 'web';

  async initialize() {
    if (typeof window === 'undefined') return;

    this.platform = Capacitor.getPlatform() as string;

    try {
      if (this.platform === 'web') {
        await this.initWeb();
      } else {
        await this.initMobile();
      }
    } catch (error) {
      console.error('Notification init error:', error);
    }
  }

  private async initWeb() {
    if (!messaging) return;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return;

    this.token = await getToken(messaging, { vapidKey });
    if (this.token) {
      console.log('FCM Token (Web):', this.token);
      localStorage.setItem('fcm_token', this.token);
    }

    onMessage(messaging, (payload) => {
      console.log('Message received:', payload);
    });
  }

  private async initMobile() {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    // Ask for permission
    const status = await PushNotifications.requestPermissions();
    if (status.receive !== 'granted') {
      console.log('No permission granted for push notifications');
      return;
    }

    // Register for push notifications
    await PushNotifications.register();

    // Listen for the registration token
    PushNotifications.addListener('registration', (token) => {
      this.token = token.value;
      console.log('FCM Token:', token.value);
      localStorage.setItem('fcm_token', token.value);
    });

    // Listen for registration errors
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Registration error:', error);
    });

    // Foreground notification
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Push received in foreground:', notification);
    });

    // Background notification + tapped
    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('Push action:', action);
    });

    // Also try to get token via Firebase Messaging (fallback)
    try {
      const result = await FirebaseMessaging.getToken();
      if (result.token) {
        this.token = result.token;
        console.log('FCM Token (Firebase Messaging):', result.token);
        localStorage.setItem('fcm_token', result.token);
      }
    } catch (error) {
      console.error('Firebase Messaging token error:', error);
    }
  }

  getToken() {
    return this.token || localStorage.getItem('fcm_token');
  }

  getPlatform() {
    return this.platform;
  }

  /**
   * Request notification permissions for mobile platforms
   * This should be called after login and before showing the dashboard
   */
  async requestMobileNotificationPermissions(): Promise<void> {
    if (typeof window === 'undefined') return;

    const platform = Capacitor.getPlatform();
    
    // Only request permissions on mobile platforms (ios/android)
    if (platform === 'ios' || platform === 'android') {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');
        
        // Request permission - this will show the native permission dialog
        const status = await PushNotifications.requestPermissions();
        
        if (status.receive === 'granted') {
          // Register for push notifications
          await PushNotifications.register();

          // Listen for the registration token
          PushNotifications.addListener('registration', (token) => {
            this.token = token.value;
            console.log('FCM Token:', token.value);
            localStorage.setItem('fcm_token', token.value);
          });

          // Listen for registration errors
          PushNotifications.addListener('registrationError', (error) => {
            console.error('Registration error:', error);
          });

          // Foreground notification
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            console.log('Push received in foreground:', notification);
          });

          // Background notification + tapped
          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            console.log('Push action:', action);
          });

          // Also try to get token via Firebase Messaging (fallback)
          try {
            const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');
            const result = await FirebaseMessaging.getToken();
            if (result.token) {
              this.token = result.token;
              console.log('FCM Token (Firebase Messaging):', result.token);
              localStorage.setItem('fcm_token', result.token);
            }
          } catch (error) {
            console.error('Firebase Messaging token error:', error);
          }
        } else {
          console.log('Notification permission not granted');
        }
      } catch (error) {
        console.error('Error requesting notification permissions:', error);
      }
    }
  }
}

export const notificationService = new NotificationService();
export default app;

