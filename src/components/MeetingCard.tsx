'use client'

import React from 'react';
import { Meeting } from '@/context/MeetingContext';

interface MeetingCardProps {
  meeting: Meeting;
  onEdit?: (meeting: Meeting) => void;
  onDelete?: (id: string) => void;
  onAddNotes?: (meeting: Meeting) => void;
}

export default function MeetingCard({ meeting, onEdit, onDelete, onAddNotes }: MeetingCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-4 border border-gray-200 dark:border-gray-700">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {meeting.title}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(meeting.status)}`}>
          {meeting.status}
        </span>
      </div>

      <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
        <div>
          <span className="font-medium">Date:</span>{' '}
          {formatDate(meeting.date)}
        </div>
        
        {meeting.participants.length > 0 && (
          <div>
            <span className="font-medium">Participants:</span>{' '}
            {meeting.participants.join(', ')}
          </div>
        )}

        {meeting.notes && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <h4 className="font-medium text-gray-900 dark:text-white mb-2">Notes:</h4>
            <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-3">
              {meeting.notes}
            </p>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        {onAddNotes && (
          <button
            onClick={() => onAddNotes(meeting)}
            className="px-3 py-1 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
          >
            Add Notes
          </button>
        )}
        
        {onEdit && (
          <button
            onClick={() => onEdit(meeting)}
            className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
          >
            Edit
          </button>
        )}
        
        {onDelete && (
          <button
            onClick={() => onDelete(meeting.id)}
            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
