# Firebase Notifications Setup Guide

## ✅ What's Been Done

1. ✅ Installed dependencies (`firebase`, `@capacitor/push-notifications`, `@capacitor-firebase/messaging`)
2. ✅ Created `lib/firebase-notifications.ts` service
3. ✅ Created `public/firebase-messaging-sw.js` service worker
4. ✅ Updated `components/providers.tsx` to initialize notifications
5. ✅ Verified Android build configuration (already set up properly)

## 📝 Next Steps - YOU NEED TO COMPLETE THESE:

### 1. Create `.env.local` File

Create a `.env.local` file in the root directory with your Firebase credentials:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your_vapid_key
```

**Where to get these values:**
- Firebase Console → Project Settings → General → Your web app
- For VAPID key: Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

### 2. Update Service Worker

Edit `public/firebase-messaging-sw.js` and replace the placeholder values with your actual Firebase config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 3. Android Setup

1. **Download `google-services.json`:**
   - Go to Firebase Console → Project Settings → Your Android app
   - Download the `google-services.json` file

2. **Place the file:**
   - Copy `google-services.json` to `android/app/` directory

3. **Sync Capacitor:**
   ```bash
   npx cap sync android
   ```

### 4. Register Service Worker in Next.js Config

You may need to add service worker registration in `next.config.mjs`. Let me know if you need help with this.

### 5. Build and Test

#### Web Testing:
```bash
npm run dev
# Open browser console and look for "FCM Token (Web)"
```

#### Android Testing:
```bash
npm run build
npx cap sync android
npx cap run android
```

### 6. Test Notifications

1. Get your FCM token from the browser/device console
2. Go to Firebase Console → Cloud Messaging
3. Click "Send your first message"
4. Enter the title and body
5. In "Target", select "Test on a device"
6. Paste your FCM token
7. Send!

## 📱 How It Works

- **Web**: Uses Firebase SDK with VAPID key
- **Android**: Uses Capacitor plugins to bridge Firebase Messaging
- Tokens are stored in localStorage and can be retrieved with `notificationService.getToken()`

## 🔧 Troubleshooting

**No token on web:**
- Check browser console for permission errors
- Make sure you're on HTTPS or localhost
- Verify `.env.local` has correct VAPID key

**No token on Android:**
- Make sure `google-services.json` is in `android/app/`
- Run `npx cap sync android`
- Check device logs with `npx cap run android` and view logs

**Service worker not registering:**
- Check browser DevTools → Application → Service Workers
- Clear cache and reload

## 📚 Additional Resources

- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Capacitor Firebase Messaging](https://github.com/capawesome-team/capacitor-firebase/tree/main/packages/messaging)

