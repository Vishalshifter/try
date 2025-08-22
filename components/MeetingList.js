import React, { useState } from 'react';
import { useMeetings } from '../context/MeetingContext';
import MeetingCard from './MeetingCard';
import { Box, Collapse, Typography, Button, Stack } from '@mui/material';

export default function MeetingList() {
  const { meetings, updateMeeting, deleteMeeting } = useMeetings();
  const [openNotes, setOpenNotes] = useState({});

  const handleViewNotes = (id) => {
    setOpenNotes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <Stack spacing={2}>
      {meetings.length === 0 && (
        <Typography color="text.secondary" align="center">
          No meetings scheduled.
        </Typography>
      )}
      {meetings.map((meeting) => (
        <Box key={meeting.id}>
          <MeetingCard
            meeting={meeting}
            onEdit={() => {}}
            onDelete={deleteMeeting}
            onAddNotes={() => setOpenNotes((prev) => ({ ...prev, [meeting.id]: true }))}
          />
          <Button
            variant="outlined"
            size="small"
            onClick={() => handleViewNotes(meeting.id)}
            sx={{ mb: 1 }}
          >
            {openNotes[meeting.id] ? 'Hide Notes' : 'View Notes'}
          </Button>
          <Collapse in={!!openNotes[meeting.id]}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
              <Typography variant="subtitle2">Transcript:</Typography>
              <Typography variant="body2" sx={{ mb: 1, whiteSpace: 'pre-line' }}>
                {meeting.transcript || 'No transcript available.'}
              </Typography>
              <Typography variant="subtitle2">AI Notes:</Typography>
              <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                {meeting.notes || 'No AI notes generated yet.'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Scheduled on Shared Calendar
              </Typography>
            </Box>
          </Collapse>
        </Box>
      ))}
    </Stack>
  );
}
