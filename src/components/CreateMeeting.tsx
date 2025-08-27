'use client'

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function CreateMeeting() {
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [startTime, setStartTime] = useState('');
  const [attendees, setAttendees] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!user) {
        alert('Please sign in first');
        return;
      }
      
      const accessToken = await user.getIdToken();

      const response = await fetch('/api/meetings/create-with-meet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          title,
          startTime,
          attendees: attendees.split(',').map(email => email.trim()).filter(Boolean)
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setResult(data);
        setTitle('');
        setStartTime('');
        setAttendees('');
      } else {
        alert('Error creating meeting: ' + data.error);
      }
    } catch (error) {
      alert('Error creating meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-bold mb-4">Create Meeting with Google Meet</h2>
      
      <div className="mb-4 p-3 bg-blue-50 rounded">
        <p className="text-sm text-blue-800">Meeting will be created with Google Meet link</p>
        <p className="text-xs text-gray-600 mt-1">Fireflies will automatically join for transcription</p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Meeting Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Start Time</label>
          <input
            type="datetime-local"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Attendees (comma-separated emails)</label>
          <input
            type="text"
            value={attendees}
            onChange={(e) => setAttendees(e.target.value)}
            placeholder="email1@example.com, email2@example.com"
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Meeting'}
        </button>
      </form>

      {result && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <h3 className="font-semibold text-green-800">Meeting Created!</h3>
          <p className="text-sm">
            <a href={result.meetLink} target="_blank" className="text-blue-600 hover:underline">
              Join Google Meet
            </a>
          </p>
          <p className="text-sm">
            <a href={result.calendarLink} target="_blank" className="text-blue-600 hover:underline">
              View in Calendar
            </a>
          </p>
        </div>
      )}
    </div>
  );
}