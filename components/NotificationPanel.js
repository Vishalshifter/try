import React, { useEffect } from 'react';
import { Alert, Snackbar } from '@mui/material';
import { useMeetings } from '../context/MeetingContext';

export default function NotificationPanel() {
  const { notification, clearNotification } = useMeetings();

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(clearNotification, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, clearNotification]);

  return (
    <Snackbar open={!!notification} onClose={clearNotification} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
      {notification && (
        <Alert severity="info" onClose={clearNotification} sx={{ width: '100%' }}>
          {notification.message}
          <br />
          <strong>Participants:</strong> {notification.participants.join(', ')}
        </Alert>
      )}
    </Snackbar>
  );
}
