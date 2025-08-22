import React, { createContext, useContext, useState } from 'react';

export const MeetingContext = createContext();

export function MeetingProvider({ children }) {
  const [meetings, setMeetings] = useState([]);
  const [notification, setNotification] = useState(null);

  const addMeeting = (meeting) => {
    setMeetings((prev) => [...prev, { ...meeting, id: Date.now().toString(), notes: '', transcript: '', status: 'scheduled' }]);
    setNotification({
      message: `Meeting "${meeting.title}" created.`,
      participants: meeting.participants,
    });
  };

  const updateMeeting = (id, updates) => {
    setMeetings((prev) =>
      prev.map((m) => (m.id === id ? { ...m, ...updates } : m))
    );
  };

  const deleteMeeting = (id) => {
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  const clearNotification = () => setNotification(null);

  return (
    <MeetingContext.Provider
      value={{
        meetings,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        notification,
        clearNotification,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeetings() {
  return useContext(MeetingContext);
}
