import React, { useState } from 'react';
import { useMeetings } from '../context/MeetingContext';
import { Box, Typography, TextField, Button, MenuItem, Alert } from '@mui/material';

export default function TranscriptSimulator() {
  const { meetings, updateMeeting } = useMeetings();
  const [meetingId, setMeetingId] = useState('');
  const [transcript, setTranscript] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState('');

  const handleSimulate = async () => {
    if (!meetingId || !transcript) return;
    setLoading(true);
    setResult('');
    const res = await fetch('/api/fireflies-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    });
    const data = await res.json();
    setResult(data.notes);
    updateMeeting(meetingId, { transcript, notes: data.notes, status: 'completed' });
    setLoading(false);
  };

  return (
    <Box sx={{ p: 3, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Typography variant="h6" gutterBottom>
        Simulate Fireflies Transcript & AI Note Generation
      </Typography>
      <TextField
        select
        label="Select Meeting"
        value={meetingId}
        onChange={e => setMeetingId(e.target.value)}
        fullWidth
        sx={{ mb: 2 }}
      >
        {meetings.map(m => (
          <MenuItem key={m.id} value={m.id}>{m.title}</MenuItem>
        ))}
      </TextField>
      <TextField
        label="Paste Transcript"
        value={transcript}
        onChange={e => setTranscript(e.target.value)}
        multiline
        minRows={4}
        fullWidth
        sx={{ mb: 2 }}
      />
      <Button variant="contained" onClick={handleSimulate} disabled={loading || !meetingId || !transcript}>
        {loading ? 'Generating...' : 'Simulate Fireflies Webhook'}
      </Button>
      {result && (
        <Alert severity="success" sx={{ mt: 2, whiteSpace: 'pre-line' }}>
          <strong>AI Notes:</strong>
          <br />
          {result}
        </Alert>
      )}
    </Box>
  );
}
