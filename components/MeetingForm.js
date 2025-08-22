import React, { useState } from 'react';
import { Box, TextField, Button, MenuItem, Chip, Stack } from '@mui/material';
import { useMeetings } from '../context/MeetingContext';

const platforms = ['Zoom', 'Google Meet', 'Teams'];

export default function MeetingForm() {
  const { addMeeting } = useMeetings();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [platform, setPlatform] = useState(platforms[0]);
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState([]);

  const handleAddParticipant = () => {
    if (participantInput && !participants.includes(participantInput)) {
      setParticipants([...participants, participantInput]);
      setParticipantInput('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title || !date || !start || !end || !platform || participants.length === 0) return;
    addMeeting({
      title,
      date: `${date}T${start}`,
      start,
      end,
      platform,
      participants,
      link: `https://${platform.toLowerCase().replace(' ', '')}.com/meeting/${Math.random().toString(36).slice(2, 8)}`,
    });
    setTitle('');
    setDate('');
    setStart('');
    setEnd('');
    setPlatform(platforms[0]);
    setParticipants([]);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 1 }}>
      <Stack spacing={2}>
        <TextField label="Meeting Title" value={title} onChange={e => setTitle(e.target.value)} required />
        <Stack direction="row" spacing={2}>
          <TextField type="date" label="Date" value={date} onChange={e => setDate(e.target.value)} required InputLabelProps={{ shrink: true }} />
          <TextField type="time" label="Start Time" value={start} onChange={e => setStart(e.target.value)} required InputLabelProps={{ shrink: true }} />
          <TextField type="time" label="End Time" value={end} onChange={e => setEnd(e.target.value)} required InputLabelProps={{ shrink: true }} />
        </Stack>
        <TextField select label="Platform" value={platform} onChange={e => setPlatform(e.target.value)} required>
          {platforms.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            label="Add Participant (email)"
            value={participantInput}
            onChange={e => setParticipantInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
          />
          <Button variant="outlined" onClick={handleAddParticipant}>Add</Button>
        </Stack>
        <Stack direction="row" spacing={1}>
          {participants.map(email => (
            <Chip key={email} label={email} onDelete={() => setParticipants(participants.filter(p => p !== email))} />
          ))}
        </Stack>
        <Button type="submit" variant="contained" color="primary">
          Create Meeting & Send Notifications
        </Button>
      </Stack>
    </Box>
  );
}
