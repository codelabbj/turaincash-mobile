"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

// Get current installed version - you may need to adjust this based on your app's versioning system
function getCurrentVersion(): string {
  const FALLBACK_VERSION = "1.0.0"

  if (typeof window !== "undefined") {
    const envVersion =
      process.env.NEXT_PUBLIC_APP_VERSION || (window as any)?.__APP_VERSION__

    if (envVersion) {
      localStorage.setItem("app_installed_version", envVersion)
      return envVersion
    }

    const storedVersion = localStorage.getItem("app_installed_version")
    if (storedVersion) {
      return storedVersion
    }
  } else if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION
  }

  return FALLBACK_VERSION
}

// Compare version strings (e.g., "1.0.1" vs "1.0.0")
function isNewerVersion(manifestVersion: string, currentVersion: string): boolean {
  const manifestParts = manifestVersion.split('.').map(Number);
  const currentParts = currentVersion.split('.').map(Number);
  
  for (let i = 0; i < Math.max(manifestParts.length, currentParts.length); i++) {
    const manifestPart = manifestParts[i] || 0;
    const currentPart = currentParts[i] || 0;
    
    if (manifestPart > currentPart) return true;
    if (manifestPart < currentPart) return false;
  }
  
  return false; // Versions are equal
}

// Method 1: Create and click an anchor tag with download attribute
function downloadViaAnchor(apkUrl: string): boolean {
  try {
    const link = document.createElement('a');
    link.href = apkUrl;
    link.download = 'app-update.apk';
    link.target = '_blank';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
    }, 100);
    console.log('Method 1: Anchor tag download triggered');
    return true;
  } catch (error) {
    console.error('Anchor download failed:', error);
    return false;
  }
}

// Method 2: Try JavaScript interface if available
function downloadViaJavaScriptInterface(apkUrl: string): boolean {
  // Try injected downloadApk function
  if (typeof (window as any).downloadApk === 'function') {
    try {
      console.log('Method 2a: Using injected downloadApk function');
      (window as any).downloadApk(apkUrl);
      return true;
    } catch (error) {
      console.error('downloadApk error:', error);
    }
  }
  
  // Try AndroidDownloader interface
  if ((window as any).AndroidDownloader && typeof (window as any).AndroidDownloader.downloadApk === 'function') {
    try {
      console.log('Method 2b: Using AndroidDownloader interface');
      (window as any).AndroidDownloader.downloadApk(apkUrl);
      return true;
    } catch (error) {
      console.error('AndroidDownloader error:', error);
    }
  }
  
  return false;
}

// Method 3: Try Capacitor Browser plugin
async function downloadViaCapacitorBrowser(apkUrl: string): Promise<boolean> {
  try {
    // Try to dynamically import Capacitor Browser
    const { Browser } = await import('@capacitor/browser');
    console.log('Method 3: Using Capacitor Browser plugin');
    await Browser.open({ url: apkUrl });
    return true;
  } catch (error) {
    console.log('Capacitor Browser not available:', error);
    return false;
  }
}

// Method 4: Fetch and create blob URL
async function downloadViaBlob(apkUrl: string): Promise<boolean> {
  try {
    console.log('Method 4: Attempting blob download via fetch');
    const response = await fetch(apkUrl);
    if (!response.ok) {
      throw new Error('Fetch failed');
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = 'app-update.apk';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 100);
    
    console.log('Method 4: Blob download successful');
    return true;
  } catch (error) {
    console.error('Blob download failed:', error);
    return false;
  }
}

// Method 5: Try window.open
function downloadViaWindowOpen(apkUrl: string): boolean {
  try {
    console.log('Method 5: Trying window.open');
    const newWindow = window.open(apkUrl, '_blank');
    if (newWindow) {
      console.log('Method 5: window.open succeeded');
      return true;
    } else {
      console.log('Method 5: window.open was blocked');
      return false;
    }
  } catch (error) {
    console.error('window.open failed:', error);
    return false;
  }
}

// Method 6: Navigate directly (should trigger WebView handlers)
function downloadViaLocation(apkUrl: string): boolean {
  try {
    console.log('Method 6: Using window.location.href (should trigger WebView handlers)');
    window.location.href = apkUrl;
    return true;
  } catch (error) {
    console.error('location.href failed:', error);
    return false;
  }
}

// Method 7: Try Capacitor Share plugin
async function downloadViaCapacitorShare(apkUrl: string): Promise<boolean> {
  try {
    const { Share } = await import('@capacitor/share');
    console.log('Method 7: Using Capacitor Share plugin');
    await Share.share({
      title: 'Télécharger la mise à jour',
      text: 'Télécharger la nouvelle version de l\'application',
      url: apkUrl,
      dialogTitle: 'Télécharger APK'
    });
    return true;
  } catch (error) {
    console.log('Capacitor Share not available:', error);
    return false;
  }
}

// Main download function that tries all methods
async function downloadAndInstall(apkUrl: string) {
  console.log('=== Starting download with multiple fallback methods ===');
  console.log('Download URL:', apkUrl);
  
  // Try methods in order of preference
  const methods = [
    () => downloadViaJavaScriptInterface(apkUrl), // Native bridge (fastest)
    () => downloadViaAnchor(apkUrl), // Direct anchor download
    () => downloadViaCapacitorBrowser(apkUrl), // Capacitor Browser
    () => downloadViaWindowOpen(apkUrl), // Window open
    () => downloadViaBlob(apkUrl), // Fetch and blob
    () => downloadViaLocation(apkUrl), // Location href (triggers WebView)
    () => downloadViaCapacitorShare(apkUrl), // Share as last resort
  ];
  
  // Try synchronous methods first
  for (let i = 0; i < 4; i++) {
    if (methods[i]()) {
      console.log(`Successfully triggered download using method ${i + 1}`);
      return;
    }
  }
  
  // Try async methods
  for (let i = 4; i < methods.length; i++) {
    try {
      const result = await methods[i]();
      if (result) {
        console.log(`Successfully triggered download using method ${i + 1}`);
        return;
      }
    } catch (error) {
      console.error(`Method ${i + 1} failed:`, error);
      continue;
    }
  }
  
  // If all methods fail, try location.href as absolute fallback
  console.error('All download methods failed, using location.href as final fallback');
  window.location.href = apkUrl;
}
// Dynamically import Capacitor Browser to avoid build issues
// let Browser: any = null;
// if (typeof window !== 'undefined') {
//   try {
//     Browser = require('@capacitor/browser').Browser;
//   } catch (e) {
//     // Capacitor Browser not available, will use window.open fallback
//   }
// }

export function UpdateCheck() {
  const [show, setShow] = useState(false);
  const [apkUrl, setApkUrl] = useState("");
  const [manifestVersion, setManifestVersion] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const currentVersion = getCurrentVersion();

    fetch("https://turnaicash-mobile-app-1.vercel.app/releases/manifest.json")
      .then(r => r.json())
      .then(manifest => {
        const manifestVersion = manifest.android_version;
        console.log('Manifest version:', manifestVersion, 'Current version:', currentVersion);
        
        // Check if we've already dismissed this version
        const dismissedVersion = localStorage.getItem('app_dismissed_version');
        const installedVersion = localStorage.getItem('app_installed_version');
        const wasDismissed = dismissedVersion === manifestVersion;
        const isAlreadyInstalled = installedVersion === manifestVersion;
        
        console.log('Dismissed version:', dismissedVersion, 'Installed version:', installedVersion);
        console.log('Was dismissed:', wasDismissed, 'Is installed:', isAlreadyInstalled);
        
        // Show update if:
        // 1. Force update is enabled AND we haven't installed this version yet, OR
        // 2. There's a newer version available AND we haven't dismissed it AND we haven't installed it
        const hasNewerVersion = isNewerVersion(manifestVersion, currentVersion);
        const versionsAreEqual = manifestVersion === currentVersion;
        
        // Don't show if versions are equal (already up to date)
        if (versionsAreEqual) {
          console.log('Versions are equal, not showing modal');
          if (typeof window !== 'undefined') {
            localStorage.setItem('app_installed_version', manifestVersion);
            localStorage.removeItem('app_dismissed_version');
          }
          return;
        }
        
        const shouldShow = (manifest.force === true && !isAlreadyInstalled && !wasDismissed) || 
          (hasNewerVersion && !wasDismissed && !isAlreadyInstalled);
        
        console.log('Has newer version:', hasNewerVersion, 'Should show:', shouldShow);
        
        if (shouldShow) {
          setApkUrl(manifest.apk_url);
          setManifestVersion(manifestVersion);
          setShow(true);
        } else {
          console.log('Modal not showing because:', {
            force: manifest.force,
            isAlreadyInstalled,
            hasNewerVersion,
            wasDismissed
          });
        }
      })
      .catch(error => {
        console.error('Error checking for updates:', error);
      });
  }, []);

  const handleClose = () => {
    // Store the dismissed version so we don't show it again
    if (manifestVersion) {
      localStorage.setItem('app_dismissed_version', manifestVersion);
    }
    setShow(false);
  };

  const handleDownload = async () => {
    // Start download process (don't await - let it run in background)
    downloadAndInstall(apkUrl).catch(err => {
      console.error('Download process error:', err);
    });
    
    // After user clicks download, immediately mark as installed and close modal
    if (manifestVersion) {
      localStorage.setItem('app_installed_version', manifestVersion);
      // Also clear dismissed version for this version since they're installing it
      localStorage.removeItem('app_dismissed_version');
    }
    setShow(false);
  };

  if (!show || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[9999]">
      <div className="bg-white dark:bg-gray-800 p-5 rounded-xl text-center shadow-2xl z-[10000] max-w-md mx-4 relative">
        {/* Close/Cancel button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>

        <h1 className="font-bold text-lg dark:text-white pr-8">Nouvelle mise à jour disponible</h1>
        <p className="mt-2 mb-4 dark:text-gray-300">Une nouvelle version de l'application est disponible.</p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            Plus tard
          </button>
          <button
            onClick={handleDownload}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded transition-colors"
          >
            Télécharger la mise à jour
          </button>
        </div>
      </div>
    </div>
  );

  // Render in a portal at document body level to ensure it's above everything
  return createPortal(modalContent, document.body);
}
