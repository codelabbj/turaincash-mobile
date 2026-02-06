import { Capacitor } from '@capacitor/core';
import { PushNotifications, Token, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';

let isInitialized = false;
let registrationToken: string | null = null;

export async function initializePushNotifications(): Promise<void> {
    console.log('🚀 [TEST LOG] initializePushNotifications() called at:', new Date().toISOString());

    // Ne pas initialiser plusieurs fois
    if (isInitialized) {
        console.log('⚠️ [TEST LOG] Push notifications already initialized, skipping...');
        return;
    }

    console.log('🔍 [TEST LOG] Checking platform compatibility...');

    // Vérifier si on est sur une plateforme native
    // Même si l'app charge depuis une URL distante, Capacitor.isNativePlatform()
    // retourne true dans une app Android/iOS grâce au bridge natif
    if (!Capacitor.isNativePlatform()) {
        console.log('❌ [TEST LOG] Push notifications not available on web platform (browser) - exiting');
        return;
    }

    const platform = Capacitor.getPlatform();
    console.log(`✅ [TEST LOG] Initializing push notifications on ${platform} platform (loading from remote URL)`);
    console.log(`ℹ️ [TEST LOG] Capacitor platform: ${platform}, isNative: ${Capacitor.isNativePlatform()}`);

    try {
        // Vérifier d'abord l'état actuel des permissions
        // Selon la documentation Capacitor: https://capacitorjs.com/docs/apis/push-notifications
        // PermissionState peut être: 'prompt' | 'prompt-with-rationale' | 'granted' | 'denied'
        console.log('🔐 [TEST LOG] Checking current push notification permissions...');
        let permStatus = await PushNotifications.checkPermissions();
        console.log('🔐 [TEST LOG] Current permission status:', permStatus);

        // Si la permission n'a pas encore été demandée (prompt ou prompt-with-rationale), la demander
        // Selon l'exemple officiel de la documentation Capacitor
        if (permStatus.receive === 'prompt' || permStatus.receive === 'prompt-with-rationale') {
            console.log('📋 [TEST LOG] Requesting push notification permissions...');
            permStatus = await PushNotifications.requestPermissions();
            console.log('📋 [TEST LOG] Permission request result:', permStatus);
        } else if (permStatus.receive === 'denied') {
            // Si la permission a été refusée, ne pas continuer
            // L'utilisateur doit l'activer dans les paramètres de l'app
            console.warn('🚫 [TEST LOG] Push notification permission denied by user. User can enable it in app settings.');
            return;
        } else if (permStatus.receive === 'granted') {
            console.log('✅ [TEST LOG] Push notification permission already granted');
        }

        // Vérifier si la permission a été accordée avant de continuer
        if (permStatus.receive !== 'granted') {
            console.warn('🚫 [TEST LOG] Push notification permission not granted:', permStatus.receive);
            console.warn('🚫 [TEST LOG] Full status received:', permStatus);
            return;
        }

        console.log('✅ [TEST LOG] Push notification permission granted, setting up listeners...');

        // Créer le canal haute priorité pour TOUTES les notifications (push + locales)
        if (Capacitor.getPlatform() === 'android') {
            await LocalNotifications.createChannel({
                id: 'turaincash_foreground',
                name: 'turaincash_foreground',
                description: 'Toutes les notifications Turaincash avec aperçu flottant',
                importance: 5, // IMPORTANCE_HIGH - force les heads-up
                visibility: 1, // VISIBILITY_PUBLIC
                sound: 'default',
                vibration: true,
                lights: true
            });
            console.log('✅ [TEST LOG] High priority notification channel created at app startup');
        }

        // IMPORTANT: Ajouter les listeners AVANT d'appeler register()
        // Sinon, on peut manquer l'événement de registration
        console.log('👂 [TEST LOG] Adding push notification event listeners...');

        // Écouter l'événement de registration
        PushNotifications.addListener('registration', async (token: Token) => {
            console.log('🔔 [TEST LOG] Push registration success! Token received:', {
                token_preview: token.value.substring(0, 30) + '...',
                full_token_length: token.value.length,
                timestamp: new Date().toISOString(),
            });
            registrationToken = token.value;

            // Déterminer le type de plateforme
            const currentPlatform = Capacitor.getPlatform();
            let type: 'android' | 'ios' | 'web' = 'web';
            if (currentPlatform === 'android') {
                type = 'android';
            } else if (currentPlatform === 'ios') {
                type = 'ios';
            }

            console.log(`📱 [TEST LOG] Platform detected: ${type}, preparing to send token to backend...`);
            console.log(`📱 [TEST LOG] Device registration process starting for ${type} platform`);

            // Enregistrer le device sur le backend
            // Cela fonctionne même si l'app charge depuis une URL distante
            // car l'API est appelée depuis le contexte web qui a accès au réseau
            await registerDeviceOnBackend(token.value, type);
        });

        // Écouter les erreurs de registration
        PushNotifications.addListener('registrationError', (error: any) => {
            console.error('❌ [TEST LOG] Push notification registration error:', {
                error: JSON.stringify(error),
                timestamp: new Date().toISOString(),
                platform: Capacitor.getPlatform(),
            });
        });

        // Écouter les notifications reçues (quand l'app est au premier plan)
        PushNotifications.addListener('pushNotificationReceived', async (notification: PushNotificationSchema) => {
            console.log('📨 [TEST LOG] Push notification received while app in foreground:', {
                title: notification.title,
                body: notification.body,
                data: notification.data,
                timestamp: new Date().toISOString(),
            });

            // Afficher une notification locale quand l'app est en foreground
            if (Capacitor.isNativePlatform()) {
                try {
                    const notificationOptions: any = {
                        notifications: [{
                            title: notification.title || 'Notification',
                            body: notification.body || '',
                            id: Math.floor(Math.random() * 2147483647), // ID aléatoire dans les limites Java int
                            schedule: { at: new Date(Date.now() + 100) }, // Afficher immédiatement
                            sound: 'default'
                        }]
                    };

                    // Pour Android, spécifier l'icône et le canal
                    if (Capacitor.getPlatform() === 'android') {
                        notificationOptions.notifications[0].smallIcon = 'ic_notification';
                        notificationOptions.notifications[0].icon = 'ic_notification';
                        notificationOptions.notifications[0].channelId = 'turaincash_foreground';
                    }

                    await LocalNotifications.schedule(notificationOptions);
                    console.log('✅ [TEST LOG] Local notification scheduled for foreground push notification with heads-up display');
                } catch (error) {
                    console.error('❌ [TEST LOG] Error scheduling local notification:', error);
                }
            }
        });

        // Écouter les actions sur les notifications (quand l'utilisateur clique dessus)
        PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
            console.log('👆 [TEST LOG] Push notification action performed:', {
                action_id: action.actionId,
                notification_title: action.notification.title,
                notification_data: action.notification.data,
                timestamp: new Date().toISOString(),
            });
            // Ici vous pouvez naviguer vers une page spécifique selon l'action
        });

        // Initialiser les permissions pour les notifications locales
        if (Capacitor.isNativePlatform()) {
            try {
                console.log('🔔 [TEST LOG] Checking local notification permissions...');
                let localPermStatus = await LocalNotifications.checkPermissions();
                console.log('🔔 [TEST LOG] Local notification permission status:', localPermStatus);

                if (localPermStatus.display === 'prompt') {
                    console.log('📋 [TEST LOG] Requesting local notification permissions...');
                    localPermStatus = await LocalNotifications.requestPermissions();
                    console.log('📋 [TEST LOG] Local notification permission request result:', localPermStatus);
                }

                if (localPermStatus.display === 'granted') {
                    console.log('✅ [TEST LOG] Local notification permissions granted');
                } else {
                    console.warn('⚠️ [TEST LOG] Local notification permissions not granted:', localPermStatus.display);
                }
            } catch (error) {
                console.error('❌ [TEST LOG] Error initializing local notifications:', error);
            }
        }

        console.log('👂 [TEST LOG] All listeners added, now registering for push notifications...');

        // Enregistrer pour recevoir les notifications
        // Cela fonctionne même si l'app charge depuis une URL distante
        // car Capacitor utilise le bridge natif pour accéder aux fonctionnalités natives
        console.log('📝 [TEST LOG] Calling PushNotifications.register()...');
        await PushNotifications.register();
        isInitialized = true;

        console.log('✅ [TEST LOG] Push notifications registration initiated successfully!');
        console.log('⏰ [TEST LOG] Waiting for registration token from FCM/APNS...');

    } catch (error) {
        console.error('Error initializing push notifications:', error);
    }
}

// Backend registration implementation
async function registerDeviceOnBackend(token: string, platform: 'android' | 'ios' | 'web') {
    try {
        console.log('📝 [TEST LOG] Sending token to backend:', { token, platform });

        // Use relative URL for internal API
        const response = await fetch('/api/fcm/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                platform,
                // userId can be added here if available in context
            }),
        });

        if (response.ok) {
            console.log('✅ [TEST LOG] Device registered on backend successfully');
        } else {
            console.error('❌ [TEST LOG] Failed to register device on backend:', response.statusText);
        }
    } catch (error) {
        console.error('❌ [TEST LOG] Error registering device on backend:', error);
    }
}
