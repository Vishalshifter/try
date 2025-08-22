import React, { useState } from 'react';
import { Container, Tabs, Tab, Box, Typography } from '@mui/material';
import MeetingForm from '../components/MeetingForm';
import MeetingList from '../components/MeetingList';
import NotificationPanel from '../components/NotificationPanel';
import TranscriptSimulator from '../components/TranscriptSimulator';

export default function Home() {
  const [tab, setTab] = useState(0);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Meeting Management App
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Meetings" />
        <Tab label="Simulate Fireflies Transcript" />
      </Tabs>
      <Box hidden={tab !== 0}>
        <MeetingForm />
        <NotificationPanel />
        <MeetingList />
      </Box>
      <Box hidden={tab !== 1}>
        <TranscriptSimulator />
      </Box>
    </Container>
  );
}
