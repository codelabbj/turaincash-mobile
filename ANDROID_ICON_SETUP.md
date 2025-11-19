# Android App Icon Setup Guide

This guide will help you set up the Turaincash logo as the Android app icon.

## Quick Method: Using Online Tools

### Option 1: Android Asset Studio (Recommended)
1. Go to: https://romannurik.github.io/AndroidAssetStudio/icons-launcher.html
2. Upload your logo: `public/Turaincash-logo.png`
3. Configure:
   - **Foreground**: Upload `Turaincash-logo.png`
   - **Background**: Set to `#00FFFF` (cyan) or use a solid color
   - **Padding**: Adjust as needed (recommended: 20%)
4. Click "Download" to get a ZIP file
5. Extract the ZIP and copy the `res` folder contents to `android/app/src/main/res/`

### Option 2: Icon Kitchen
1. Go to: https://icon.kitchen/
2. Upload `public/Turaincash-logo.png`
3. Select "Android" platform
4. Download and extract
5. Copy the generated `res` folder contents to `android/app/src/main/res/`

## Manual Method: Using Android Studio

1. Open Android Studio
2. Right-click on `android/app/src/main/res` → New → Image Asset
3. Select "Launcher Icons (Adaptive and Legacy)"
4. Configure:
   - **Foreground Layer**: 
     - Path: Select `public/Turaincash-logo.png`
     - Scaling: Adjust to fit (recommended: 80-90%)
   - **Background Layer**:
     - Color: `#00FFFF` (cyan)
5. Click "Next" and "Finish"
6. The icons will be automatically generated in the correct folders

## Required Icon Sizes

After generating, ensure these files exist in their respective folders:

- `mipmap-mdpi/ic_launcher.png` (48x48 px)
- `mipmap-hdpi/ic_launcher.png` (72x72 px)
- `mipmap-xhdpi/ic_launcher.png` (96x96 px)
- `mipmap-xxhdpi/ic_launcher.png` (144x144 px)
- `mipmap-xxxhdpi/ic_launcher.png` (192x192 px)

And for round icons:
- `mipmap-mdpi/ic_launcher_round.png` (48x48 px)
- `mipmap-hdpi/ic_launcher_round.png` (72x72 px)
- `mipmap-xhdpi/ic_launcher_round.png` (96x96 px)
- `mipmap-xxhdpi/ic_launcher_round.png` (144x144 px)
- `mipmap-xxxhdpi/ic_launcher_round.png` (192x192 px)

For adaptive icons (Android 8.0+):
- `mipmap-anydpi-v26/ic_launcher.xml` (already configured)
- `mipmap-anydpi-v26/ic_launcher_round.xml` (already configured)
- `drawable-v24/ic_launcher_foreground.xml` (needs to be updated with logo)
- Foreground PNGs in each mipmap folder: `ic_launcher_foreground.png`

## After Setup

1. Rebuild the Android app:
   ```bash
   cd android
   ./gradlew clean
   ./gradlew assembleRelease
   ```

2. Or sync with Capacitor:
   ```bash
   npx cap sync android
   ```

3. Test the icon by installing the app on a device or emulator

## Notes

- The background color has been set to cyan (#00FFFF) to match your app theme
- Adaptive icons require both foreground and background layers
- Make sure the logo is centered and has appropriate padding
- The logo should be on a transparent background for best results

