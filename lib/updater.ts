import { CapacitorUpdater } from '@capgo/capacitor-updater';

export async function checkForUpdates() {
  try {
    const response = await fetch('https://turnaicash-mobile-app-1.vercel.app/releases/manifest.json');
    const manifest = await response.json();

    const localVersion = localStorage.getItem('app_version') || '0.0.0';
    if (manifest.version !== localVersion) {
      console.log(`New version ${manifest.version} found, downloading...`);
      
      const result = await CapacitorUpdater.download({
        url: manifest.url,
        version: manifest.version,
      });

      if (result.status === 'success') {
        await CapacitorUpdater.set({ id: result.id });
        localStorage.setItem('app_version', manifest.version);
        alert('New version installed! Restarting app...');
        await CapacitorUpdater.reload();
      }
    } else {
      console.log('App is up to date');
    }
  } catch (error) {
    console.error('Update check failed:', error);
  }
}
