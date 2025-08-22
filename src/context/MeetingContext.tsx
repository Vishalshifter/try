'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface Note {
  id: string;
  transcript: string;
  notes: string;
  createdAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  date: string;
  participants: string[];
  transcript?: string;
  notes?: string;
  status: 'scheduled' | 'completed' | 'cancelled';
}

interface MeetingState {
  meetings: Meeting[];
  notes: Note[];
  notifications: string[];
  loading: boolean;
}

type MeetingAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_MEETING'; payload: Meeting }
  | { type: 'UPDATE_MEETING'; payload: Meeting }
  | { type: 'DELETE_MEETING'; payload: string }
  | { type: 'SET_MEETINGS'; payload: Meeting[] }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'SET_NOTES'; payload: Note[] }
  | { type: 'ADD_NOTIFICATION'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' };

const initialState: MeetingState = {
  meetings: [],
  notes: [],
  notifications: [],
  loading: false,
};

function meetingReducer(state: MeetingState, action: MeetingAction): MeetingState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'ADD_MEETING':
      return { ...state, meetings: [action.payload, ...state.meetings] };
    case 'UPDATE_MEETING':
      return {
        ...state,
        meetings: state.meetings.map(meeting =>
          meeting.id === action.payload.id ? action.payload : meeting
        ),
      };
    case 'DELETE_MEETING':
      return {
        ...state,
        meetings: state.meetings.filter(meeting => meeting.id !== action.payload),
      };
    case 'SET_MEETINGS':
      return { ...state, meetings: action.payload };
    case 'ADD_NOTE':
      return { ...state, notes: [action.payload, ...state.notes] };
    case 'SET_NOTES':
      return { ...state, notes: action.payload };
    case 'ADD_NOTIFICATION':
      return { ...state, notifications: [action.payload, ...state.notifications] };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    default:
      return state;
  }
}

interface MeetingContextType {
  state: MeetingState;
  dispatch: React.Dispatch<MeetingAction>;
  addMeeting: (meeting: Omit<Meeting, 'id'>) => void;
  updateMeeting: (meeting: Meeting) => void;
  deleteMeeting: (id: string) => void;
  addNote: (note: Omit<Note, 'id'>) => void;
  addNotification: (message: string) => void;
  clearNotifications: () => void;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export function MeetingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(meetingReducer, initialState);

  const addMeeting = (meeting: Omit<Meeting, 'id'>) => {
    const newMeeting: Meeting = {
      ...meeting,
      id: Date.now().toString(),
    };
    dispatch({ type: 'ADD_MEETING', payload: newMeeting });
    dispatch({ type: 'ADD_NOTIFICATION', payload: `Meeting "${meeting.title}" created` });
  };

  const updateMeeting = (meeting: Meeting) => {
    dispatch({ type: 'UPDATE_MEETING', payload: meeting });
    dispatch({ type: 'ADD_NOTIFICATION', payload: `Meeting "${meeting.title}" updated` });
  };

  const deleteMeeting = (id: string) => {
    dispatch({ type: 'DELETE_MEETING', payload: id });
    dispatch({ type: 'ADD_NOTIFICATION', payload: 'Meeting deleted' });
  };

  const addNote = (note: Omit<Note, 'id'>) => {
    const newNote: Note = {
      ...note,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_NOTE', payload: newNote });
  };

  const addNotification = (message: string) => {
    dispatch({ type: 'ADD_NOTIFICATION', payload: message });
  };

  const clearNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  return (
    <MeetingContext.Provider
      value={{
        state,
        dispatch,
        addMeeting,
        updateMeeting,
        deleteMeeting,
        addNote,
        addNotification,
        clearNotifications,
      }}
    >
      {children}
    </MeetingContext.Provider>
  );
}

export function useMeeting() {
  const context = useContext(MeetingContext);
  if (context === undefined) {
    throw new Error('useMeeting must be used within a MeetingProvider');
  }
  return context;
}
