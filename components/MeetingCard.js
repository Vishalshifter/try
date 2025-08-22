import React from 'react';
import { Card, CardContent, Typography, Chip, Stack, Box } from '@mui/material';

export default function MeetingCard({ meeting, onEdit, onDelete, onAddNotes }) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="h6">{meeting.title}</Typography>
            <Typography variant="body2" color="text.secondary">
              {new Date(meeting.date).toLocaleString()} ({meeting.platform})
            </Typography>
            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
              {meeting.participants.map((p) => (
                <Chip key={p} label={p} size="small" />
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
              <strong>Shared Calendar:</strong> {meeting.date.split('T')[0]}
            </Typography>
          </Box>
          <Stack spacing={1}>
            {onAddNotes && (
              <Chip label="Simulate Fireflies Transcript" color="success" onClick={() => onAddNotes(meeting)} clickable />
            )}
            {onEdit && (
              <Chip label="Edit" color="primary" onClick={() => onEdit(meeting)} clickable />
            )}
            {onDelete && (
              <Chip label="Delete" color="error" onClick={() => onDelete(meeting.id)} clickable />
            )}
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
