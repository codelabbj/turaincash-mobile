# Mobile Native Back Button Implementation Guide

This guide explains how to implement native back button handling in a Capacitor mobile app to prevent app exit and control navigation flow.

## Overview

The implementation prevents the app from exiting when users press the native back button. Instead, it navigates authenticated users to the dashboard, ensuring they stay within the app.

## Architecture

The solution consists of three main components:

1. **Capacitor App Plugin** - Captures native back button events
2. **Mobile Back Button Handler Class** - Manages event listeners and callbacks
3. **React Component Handler** - Handles navigation logic based on authentication state

## Step-by-Step Implementation

### Step 1: Install Dependencies

```bash
npm install @capacitor/app
npx cap sync android  # or ios for iOS
```

### Step 2: Create the Back Button Handler Class

Create `lib/mobile-back-button.ts`:

```typescript
import { App } from '@capacitor/app'

export class MobileBackButtonHandler {
  private static instance: MobileBackButtonHandler
  private isInitialized = false
  private backButtonCallback?: (e?: Event) => void
  private eventListeners: Array<{ element: EventTarget; event: string; handler: EventListener }> = []
  private capacitorListener?: any

  private constructor() {}

  static getInstance(): MobileBackButtonHandler {
    if (!MobileBackButtonHandler.instance) {
      MobileBackButtonHandler.instance = new MobileBackButtonHandler()
    }
    return MobileBackButtonHandler.instance
  }

  initialize(callback: (e?: Event) => void) {
    if (this.isInitialized) return
    this.backButtonCallback = callback

    const handleBackButton = (e?: Event) => {
      if (this.backButtonCallback) {
        this.backButtonCallback(e)
      }
    }

    // Use Capacitor App plugin for native back button handling
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      this.capacitorListener = App.addListener('backButton', ({ canGoBack }) => {
        // Always prevent default exit behavior
        handleBackButton()
      })
    }

    // Fallback event listeners for web/browser
    const events = [
      { element: document, event: 'backbutton', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } },
      { element: window, event: 'backbutton', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } },
      { element: window, event: 'popstate', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } },
      { element: window, event: 'mobileBackButton', handler: (e: Event) => { e.preventDefault(); e.stopPropagation(); handleBackButton(e) } }
    ]

    events.forEach(({ element, event, handler }) => {
      element.addEventListener(event, handler, false)
      this.eventListeners.push({ element, event, handler })
    })

    this.isInitialized = true
  }

  setCallback(callback: (e?: Event) => void) {
    this.backButtonCallback = callback
  }

  cleanup() {
    if (this.capacitorListener) {
      this.capacitorListener.remove()
      this.capacitorListener = undefined
    }
    if (this.isInitialized) {
      this.eventListeners.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler)
      })
      this.eventListeners = []
      this.isInitialized = false
    }
  }
}

export const mobileBackButtonHandler = MobileBackButtonHandler.getInstance()
```

**Key Points:**
- Uses Singleton pattern to ensure only one instance
- Integrates Capacitor App plugin for native back button
- Includes fallback listeners for web/browser testing
- Properly cleans up listeners on unmount

### Step 3: Create the React Component Handler

Create `components/mobile-back-button-handler.tsx`:

```typescript
"use client"

import { useEffect, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import { mobileBackButtonHandler } from "@/lib/mobile-back-button"
import { isAuthenticated } from "@/lib/auth" // Your auth utility

export function MobileBackButtonHandler() {
  const router = useRouter()
  const pathname = usePathname()
  const pathnameRef = useRef(pathname)

  // Keep pathname ref up to date
  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

  useEffect(() => {
    // Push history state to prevent browser back navigation
    if (typeof window !== 'undefined') {
      window.history.pushState({ screen: 'app' }, '', window.location.href)
    }

    const handleBackButton = (e?: Event) => {
      // Always prevent default browser back behavior
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      
      const currentPath = pathnameRef.current
      
      // CRITICAL: If authenticated, ALWAYS navigate to dashboard (NEVER allow exit)
      if (isAuthenticated()) {
        // Push history state to prevent browser back navigation
        if (typeof window !== 'undefined') {
          window.history.pushState({ screen: 'app' }, '', window.location.href)
        }
        
        // Always navigate to dashboard, even if already there
        // This prevents the app from exiting
        if (currentPath !== "/dashboard") {
          router.push("/dashboard")
        } else {
          // If already on dashboard, push state again to prevent exit
          if (typeof window !== 'undefined') {
            window.history.pushState({ screen: 'app' }, '', window.location.href)
          }
        }
        return // Always return early for authenticated users
      }
      
      // If not authenticated and not on login/root, go to login
      if (!isAuthenticated() && currentPath !== "/login" && currentPath !== "/") {
        if (typeof window !== 'undefined') {
          window.history.pushState({ screen: 'app' }, '', window.location.href)
        }
        router.push("/login")
        return
      }
      
      // Only allow exit if not authenticated and on login/root screen
      if (!isAuthenticated() && (currentPath === "/login" || currentPath === "/")) {
        // Allow natural exit only for unauthenticated users on login/root
        return
      }
      
      // Fallback: navigate to appropriate screen
      if (isAuthenticated()) {
        if (typeof window !== 'undefined') {
          window.history.pushState({ screen: 'app' }, '', window.location.href)
        }
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }

    // Initialize mobile back button handler
    mobileBackButtonHandler.initialize(handleBackButton)

    // Update callback when pathname changes
    mobileBackButtonHandler.setCallback(handleBackButton)

    // Cleanup on unmount
    return () => {
      mobileBackButtonHandler.cleanup()
    }
  }, [router, pathname])

  return null
}
```

**Key Points:**
- Uses `useRef` to track current pathname (avoids stale closures)
- Always prevents exit for authenticated users
- Navigates to dashboard for authenticated users
- Allows exit only for unauthenticated users on login/root
- Manages browser history state to prevent back navigation

### Step 4: Add to Root Layout

Add the component to your root layout (`app/layout.tsx`):

```typescript
import { MobileBackButtonHandler } from "@/components/mobile-back-button-handler"

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let isHandlingBackButton = false;
                
                function handleBackButton() {
                  if (isHandlingBackButton) return;
                  isHandlingBackButton = true;
                  
                  // Dispatch custom event for React to handle
                  window.dispatchEvent(new CustomEvent('mobileBackButton'));
                  
                  setTimeout(() => {
                    isHandlingBackButton = false;
                  }, 300);
                }
                
                // Listen for various back button events
                document.addEventListener('backbutton', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBackButton();
                }, false);
                
                window.addEventListener('backbutton', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  handleBackButton();
                }, false);
                
                // Listen for browser back button - ALWAYS prevent default
                window.addEventListener('popstate', function(e) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Push current state back to prevent navigation
                  if (window.history.state === null) {
                    window.history.pushState({screen: 'app'}, '', window.location.href);
                  } else {
                    // Always push state to prevent back navigation
                    window.history.pushState({screen: 'app'}, '', window.location.href);
                  }
                  handleBackButton();
                });
                
                // Initialize history state
                if (window.history.state === null) {
                  window.history.replaceState({screen: 'app'}, '', window.location.href);
                }
              })();
            `,
          }}
        />
        <Providers>
          <MobileBackButtonHandler />
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

**Key Points:**
- Inline script runs before React hydration
- Prevents default browser back behavior
- Manages history state to prevent navigation
- Dispatches custom events for React to handle

## Customization Options

### 1. Change Default Navigation Target

To navigate to a different page instead of dashboard:

```typescript
// In mobile-back-button-handler.tsx
if (isAuthenticated()) {
  if (currentPath !== "/home") {  // Change from "/dashboard"
    router.push("/home")
  }
}
```

### 2. Allow Exit on Specific Pages

To allow exit on certain pages:

```typescript
const allowExitPages = ["/settings", "/about"]

if (isAuthenticated() && allowExitPages.includes(currentPath)) {
  // Allow natural exit
  return
}
```

### 3. Show Confirmation Dialog Before Exit

```typescript
if (isAuthenticated() && currentPath === "/dashboard") {
  // Show confirmation dialog
  if (confirm("Are you sure you want to exit?")) {
    // Allow exit
    return
  } else {
    // Prevent exit
    window.history.pushState({ screen: 'app' }, '', window.location.href)
    return
  }
}
```

### 4. Different Behavior for Different User Roles

```typescript
const userRole = getUserRole() // Your function

if (isAuthenticated()) {
  if (userRole === "admin") {
    router.push("/admin-dashboard")
  } else {
    router.push("/dashboard")
  }
}
```

## Testing

### Web Browser Testing

1. Open browser DevTools
2. Navigate through your app
3. Press browser back button
4. Verify it navigates to dashboard instead of exiting

### Android Testing

1. Build and install the app:
   ```bash
   npm run build
   npx cap sync android
   npx cap open android
   ```
2. Run on device or emulator
3. Navigate to different pages
4. Press native back button
5. Verify it navigates to dashboard instead of exiting

### iOS Testing

For iOS, the back button behavior is different (swipe gestures), but you can test with:

```bash
npx cap sync ios
npx cap open ios
```

## Troubleshooting

### Issue: App Still Exits

**Solution:**
- Ensure `@capacitor/app` is installed and synced
- Check that `MobileBackButtonHandler` is in your root layout
- Verify authentication check is working correctly
- Check browser console for errors

### Issue: Navigation Not Working

**Solution:**
- Ensure router is properly imported
- Check that pathname ref is updating
- Verify history state is being pushed
- Check for route conflicts

### Issue: Multiple Navigations

**Solution:**
- The `isHandlingBackButton` flag prevents rapid-fire events
- Adjust the timeout in the layout script if needed
- Ensure cleanup is called on unmount

## Best Practices

1. **Always prevent exit for authenticated users** - Keep users in the app
2. **Use refs for pathname** - Avoid stale closures in callbacks
3. **Clean up listeners** - Prevent memory leaks
4. **Test on real devices** - Emulators may behave differently
5. **Handle edge cases** - Consider all navigation scenarios
6. **Provide user feedback** - Consider showing a toast when preventing exit

## Architecture Diagram

```
┌─────────────────────────────────────┐
│   Native Back Button Pressed        │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Capacitor App Plugin               │
│   (Captures native event)            │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   MobileBackButtonHandler Class     │
│   (Manages listeners & callbacks)   │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   React Component Handler           │
│   (Navigation logic)                │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│   Check Authentication               │
│   ├─ Authenticated → Dashboard      │
│   └─ Not Authenticated → Login/Exit │
└─────────────────────────────────────┘
```

## Summary

This implementation provides:
- ✅ Native back button handling via Capacitor
- ✅ Prevents app exit for authenticated users
- ✅ Controlled navigation flow
- ✅ Browser history management
- ✅ Fallback support for web
- ✅ Proper cleanup and memory management

The solution ensures users stay within your app and provides a smooth navigation experience while maintaining control over the app lifecycle.

