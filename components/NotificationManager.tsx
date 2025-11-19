'use client';

import React, { useEffect, useState } from 'react';
import { unifiedFcmService } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff } from 'lucide-react';

export const NotificationManager: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>('web');

  useEffect(() => {
    initializeNotifications();
  }, []);

  const initializeNotifications = async () => {
    try {
      await unifiedFcmService.initialize();
      const currentToken = unifiedFcmService.getToken();
      const currentPlatform = unifiedFcmService.getPlatform();
      
      setToken(currentToken);
      setIsEnabled(!!currentToken);
      setPlatform(currentPlatform);
    } catch (error) {
      console.error('Failed to initialize notifications:', error);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isEnabled ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
          Push Notifications
        </CardTitle>
        <CardDescription>
          Platform: {platform}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Badge>{isEnabled ? 'Enabled' : 'Disabled'}</Badge>
        
        {token && (
          <div className="space-y-2">
            <p className="text-sm font-medium">FCM Token:</p>
            <code className="text-xs break-all bg-gray-100 p-2 rounded block">
              {token}
            </code>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default NotificationManager;