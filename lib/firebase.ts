import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';
//import { isPlatform } from '@ionic/core';
import { Capacitor } from '@capacitor/core';

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize messaging only for web
let messaging: Messaging | null = null;
if (typeof window !== 'undefined' && Capacitor.getPlatform() === 'web') {
  messaging = getMessaging(app);
}

export { messaging };

// VAPID key for web push notifications
const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// Unified notification service for Web and Mobile
export class UnifiedFCMService {
  private static instance: UnifiedFCMService;
  private token: string | null = null;
  private isInitialized = false;
  private platform: 'web' | 'ios' | 'android' = 'web';

  private constructor() {
    if (typeof window !== 'undefined') {
      this.platform = Capacitor.getPlatform() as 'web' | 'ios' | 'android';
    }
  }

  public static getInstance(): UnifiedFCMService {
    if (!UnifiedFCMService.instance) {
      UnifiedFCMService.instance = new UnifiedFCMService();
    }
    return UnifiedFCMService.instance;
  }

  /**
   * Initialize FCM service (works for both web and mobile)
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (this.platform === 'web') {
        await this.initializeWeb();
      } else {
        await this.initializeMobile();
      }
      this.isInitialized = true;
    } catch (error) {
      console.error('Error initializing FCM:', error);
    }
  }

  /**
   * Initialize web notifications
   */
  private async initializeWeb(): Promise<void> {
    if (typeof window === 'undefined' || !messaging) return;

    // Request notification permission
    const permission = await this.requestNotificationPermission();
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    // Get FCM token
    this.token = await getToken(messaging, { vapidKey });

    if (this.token) {
      console.log('FCM Token (Web):', this.token);
      localStorage.setItem('fcm_token', this.token);
      await this.sendTokenToServer(this.token);
    }

    // Setup foreground message listener
    onMessage(messaging, (payload) => {
      console.log('Foreground message received (Web):', payload);
      // Show custom notification or handle data
    });
  }

  /**
   * Initialize mobile notifications
   */
  private async initializeMobile(): Promise<void> {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const { FirebaseMessaging } = await import('@capacitor-firebase/messaging');

    // Request permission
    const permissionStatus = await PushNotifications.requestPermissions();
    
    if (permissionStatus.receive === 'granted') {
      // Register for push notifications
      await PushNotifications.register();

      // Get FCM token
      const result = await FirebaseMessaging.getToken();
      this.token = result.token;

      if (this.token) {
        console.log('FCM Token (Mobile):', this.token);
        localStorage.setItem('fcm_token', this.token);
        await this.sendTokenToServer(this.token);
      }

      // Listen for notification received
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push notification received (Mobile):', notification);
      });

      // Listen for notification action performed
      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push notification action performed:', notification);
      });
    }
  }

  /**
   * Request notification permission
   */
  public async requestNotificationPermission(): Promise<string> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    if (Notification.permission === 'denied') {
      return 'denied';
    }

    const permission = await Notification.requestPermission();
    return permission;
  }

  /**
   * Get current FCM token
   */
  public getToken(): string | null {
    return this.token || localStorage.getItem('fcm_token');
  }

  /**
   * Send token to your backend server
   */
  private async sendTokenToServer(token: string): Promise<void> {
    try {
      const response = await fetch('/api/fcm/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: this.platform,
          userId: null, // Add your user ID logic
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send token to server');
      }
    } catch (error) {
      console.error('Error sending token to server:', error);
    }
  }

  /**
   * Get platform
   */
  public getPlatform(): string {
    return this.platform;
  }
}

// Export singleton instance
export const unifiedFcmService = UnifiedFCMService.getInstance();

export default app;