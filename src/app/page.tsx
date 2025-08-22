'use client'
import React, { useState, useEffect } from 'react';
import Image from "next/image";
import { Note } from '@/context/MeetingContext';

interface Meeting {
  id: string;
  title: string;
  date: string;
  start: string;
  end: string;
  platform: string;
  participants: string[];
  link: string;
  transcript?: string;
  notes?: string;
  status: string;
  createdAt: string;
}

const platforms = ['Zoom', 'Google Meet', 'Teams'];

function generateAINotes(transcript: string) {
  return `AI Notes (simulated):\n${transcript
    .split('.')
    .map((s) => s.trim() && `- ${s.trim()}`)
    .filter(Boolean)
    .join('\n')}`;
}

export default function Home() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [notification, setNotification] = useState<{message: string, participants: string[]} | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [platform, setPlatform] = useState(platforms[0]);
  const [participantInput, setParticipantInput] = useState('');
  const [participants, setParticipants] = useState<string[]>([]);
  const [transcriptInput, setTranscriptInput] = useState('');
  const [selectedMeetingId, setSelectedMeetingId] = useState<string>('');
  const [aiLoading, setAiLoading] = useState(false);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/notes')
      .then((res) => res.json())
      .then((data) => {
        setNotes(data.notes || []);
        setLoading(false);
      });
  }, []);

  // Meeting creation
  const handleAddParticipant = () => {
    if (participantInput && !participants.includes(participantInput)) {
      setParticipants([...participants, participantInput]);
      setParticipantInput('');
    }
  };

  const handleCreateMeeting = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date || !start || !end || !platform || participants.length === 0) return;
    const id = Date.now().toString();
    const newMeeting: Meeting = {
      id,
      title,
      date: `${date}T${start}`,
      start,
      end,
      platform,
      participants,
      link: `https://${platform.toLowerCase().replace(' ', '')}.com/meeting/${Math.random().toString(36).slice(2, 8)}`,
      status: 'scheduled',
      createdAt: new Date().toISOString(),
    };
    setMeetings((prev) => [...prev, newMeeting]);
    setNotification({
      message: `Meeting "${title}" created. Fireflies Bot will auto-join this meeting and record the transcript.`,
      participants,
    });
    setTitle('');
    setDate('');
    setStart('');
    setEnd('');
    setPlatform(platforms[0]);
    setParticipants([]);
  };

  // Simulate Fireflies transcript/AI notes
  const handleSimulateAI = async () => {
    if (!selectedMeetingId || !transcriptInput) return;
    setAiLoading(true);
    // Simulate API call
    await new Promise((res) => setTimeout(res, 600));
    const notes = generateAINotes(transcriptInput);
    setMeetings((prev) =>
      prev.map((m) =>
        m.id === selectedMeetingId
          ? { ...m, transcript: transcriptInput, notes, status: 'completed' }
          : m
      )
    );
    setTranscriptInput('');
    setSelectedMeetingId('');
    setAiLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-2">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-center">Meeting Management App</h1>
        {/* Meeting Form */}
        <form onSubmit={handleCreateMeeting} className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="mb-3">
            <label className="block font-medium mb-1">Meeting Title</label>
            <input className="w-full border rounded px-2 py-1" value={title} onChange={e => setTitle(e.target.value)} required />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block font-medium mb-1">Date</label>
              <input type="date" className="w-full border rounded px-2 py-1" value={date} onChange={e => setDate(e.target.value)} required />
            </div>
            <div>
              <label className="block font-medium mb-1">Start</label>
              <input type="time" className="w-full border rounded px-2 py-1" value={start} onChange={e => setStart(e.target.value)} required />
            </div>
            <div>
              <label className="block font-medium mb-1">End</label>
              <input type="time" className="w-full border rounded px-2 py-1" value={end} onChange={e => setEnd(e.target.value)} required />
            </div>
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Platform</label>
            <select className="w-full border rounded px-2 py-1" value={platform} onChange={e => setPlatform(e.target.value)}>
              {platforms.map((p) => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block font-medium mb-1">Participants</label>
            <div className="flex gap-2">
              <input
                className="flex-1 border rounded px-2 py-1"
                placeholder="Email"
                value={participantInput}
                onChange={e => setParticipantInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddParticipant())}
              />
              <button type="button" className="bg-blue-500 text-white px-3 py-1 rounded" onClick={handleAddParticipant}>Add</button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {participants.map(email => (
                <span key={email} className="bg-gray-200 px-2 py-0.5 rounded text-sm">
                  {email}
                  <button type="button" className="ml-1 text-red-500" onClick={() => setParticipants(participants.filter(p => p !== email))}>×</button>
                </span>
              ))}
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold mt-2">
            Create Meeting & Send Notifications
          </button>
        </form>
        {/* Notification */}
        {notification && (
          <div className="bg-green-100 border border-green-300 text-green-800 px-4 py-2 rounded mb-6">
            {notification.message}
            <br />
            <span className="font-medium">Participants:</span> {notification.participants.join(', ')}
            <div className="mt-1 text-xs text-blue-800">
              <b>Fireflies Bot:</b> Will auto-join this meeting and record the transcript.
            </div>
            <button className="float-right text-green-900" onClick={() => setNotification(null)}>×</button>
          </div>
        )}
        {/* Simulate Fireflies Transcript */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold mb-2 text-lg">Simulate Fireflies Transcript & AI Notes</h2>
          <select
            className="w-full border rounded px-2 py-1 mb-2"
            value={selectedMeetingId}
            onChange={e => setSelectedMeetingId(e.target.value)}
          >
            <option value="">Select Meeting</option>
            {meetings.map(m => (
              <option key={m.id} value={m.id}>{m.title}</option>
            ))}
          </select>
          <textarea
            className="w-full border rounded px-2 py-1 mb-2"
            rows={3}
            placeholder="Paste transcript here..."
            value={transcriptInput}
            onChange={e => setTranscriptInput(e.target.value)}
          />
          <button
            className="bg-green-600 text-white px-4 py-1 rounded font-semibold"
            onClick={handleSimulateAI}
            disabled={aiLoading || !selectedMeetingId || !transcriptInput}
          >
            {aiLoading ? 'Generating...' : 'Simulate Fireflies Webhook'}
          </button>
        </div>
        {/* Meeting List */}
        <div>
          <h2 className="font-semibold mb-3 text-lg">Meetings</h2>
          {meetings.length === 0 ? (
            <p className="text-gray-500">No meetings scheduled.</p>
          ) : (
            meetings.map(meeting => (
              <div key={meeting.id} className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <span className="font-bold">{meeting.title}</span>
                    <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded">{meeting.platform}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded ${meeting.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                    {meeting.status}
                  </span>
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Date:</span> {new Date(meeting.date).toLocaleString()}
                </div>
                <div className="text-sm text-gray-700 mb-1">
                  <span className="font-medium">Participants:</span> {meeting.participants.join(', ')}
                </div>
                <div className="text-xs text-gray-500 mb-2">
                  <span>Scheduled on Shared Calendar</span>
                </div>
                <div className="text-xs text-blue-700 mb-2">
                  <b>Fireflies Bot:</b> Will auto-join this meeting and record the transcript.
                </div>
                {meeting.notes && (
                  <div className="bg-gray-50 rounded p-2 mb-2">
                    <div className="font-medium mb-1">AI Notes:</div>
                    <pre className="whitespace-pre-wrap text-sm">{meeting.notes}</pre>
                  </div>
                )}
                {meeting.transcript && (
                  <details>
                    <summary className="cursor-pointer text-sm text-blue-700">Show Transcript</summary>
                    <pre className="bg-gray-100 rounded p-2 text-xs
      </div>
    </div>
  );
}
