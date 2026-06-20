import React from 'react';
import { Badge } from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import { useFirebaseAuth } from '../../hooks/useFirebaseAuth';

export default function NotificationBadge() {
  const { pendingCount, firebaseConfigured } = useFirebaseAuth();
  if (!firebaseConfigured) return <NotificationsIcon fontSize="small" />;
  return (
    <Badge badgeContent={pendingCount} color="error" max={9}>
      <NotificationsIcon fontSize="small" />
    </Badge>
  );
}
