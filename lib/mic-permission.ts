import { Capacitor, registerPlugin } from '@capacitor/core';

type MicPermissionPlugin = {
  check: () => Promise<{ granted: boolean }>;
  request: () => Promise<{ granted: boolean }>;
};

const MicPermission = registerPlugin<MicPermissionPlugin>('MicPermission');

/**
 * Sur Android natif : demande RECORD_AUDIO via popup système
 * avant getUserMedia (sinon le WebView refuse silencieusement).
 */
export async function ensureMicrophonePermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return true;
  }
  try {
    const current = await MicPermission.check();
    if (current.granted) return true;
    const result = await MicPermission.request();
    return Boolean(result.granted);
  } catch (err) {
    console.warn('[MicPermission] request failed', err);
    return false;
  }
}
