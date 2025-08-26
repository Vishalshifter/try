'use client'

import React, { useState } from 'react';
import { useMeeting } from '@/context/MeetingContext';

export default function MeetingForm() {
  const { addMeeting } = useMeeting();
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    participants: '',
    status: 'scheduled' as const,
    inviteFireflies: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    console.log('[MEETING_FORM] Form submission started:', {
      title: formData.title,
      hasDate: !!formData.date,
      participantsCount: formData.participants.split(',').filter(p => p.trim()).length,
      status: formData.status
    });

    try {
      // Call the actual API endpoint to create the meeting
      const response = await fetch('/api/meetings/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
        },
        body: JSON.stringify({
          title: formData.title,
          meetingId: `meeting-${Date.now()}`,
          platform: 'web', // Default platform
          participants: formData.participants
            .split(',')
            .map(p => p.trim())
            .filter(p => p)
            .map(email => ({ email, name: email.split('@')[0] })),
          scheduledAt: formData.date || new Date().toISOString()
        })
      });

      console.log('[MEETING_FORM] API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[MEETING_FORM] API error:', {
          status: response.status,
          error: errorData.error
        });
        throw new Error(errorData.error || 'Failed to create meeting');
      }

      const result = await response.json();
      console.log('[MEETING_FORM] Meeting created successfully:', {
        meetingId: result.data?.meetingId,
        success: result.success
      });

      // Invite Fireflies if requested
      if (formData.inviteFireflies && result.data?.meetingId) {
        try {
          await fetch(`/api/meetings/${result.data.meetingId}/invite-fireflies`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
            }
          });
        } catch (firefliesError) {
          console.warn('Failed to invite Fireflies:', firefliesError);
        }
      }

      // Also update local state for immediate UI feedback
      addMeeting({
        title: formData.title,
        date: formData.date || new Date().toISOString(),
        participants: formData.participants
          .split(',')
          .map(p => p.trim())
          .filter(p => p),
        status: formData.status,
      });

      // Reset form
      setFormData({
        title: '',
        date: '',
        participants: '',
        status: 'scheduled',
        inviteFireflies: false,
      });

      console.log('[MEETING_FORM] Form reset and meeting creation completed');

    } catch (error: any) {
      console.error('[MEETING_FORM] Error creating meeting:', {
        error: error.message,
        stack: error.stack
      });
      setError(error.message || 'Failed to create meeting');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
        Schedule New Meeting
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meeting Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="Enter meeting title"
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Meeting Date
          </label>
          <input
            type="datetime-local"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div>
          <label htmlFor="participants" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Participants (comma-separated)
          </label>
          <input
            type="text"
            id="participants"
            name="participants"
            value={formData.participants}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
            placeholder="john@example.com, jane@example.com"
          />
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
          >
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="inviteFireflies"
            name="inviteFireflies"
            checked={formData.inviteFireflies || false}
            onChange={(e) => setFormData(prev => ({ ...prev, inviteFireflies: e.target.checked }))}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="inviteFireflies" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
            Invite Fireflies.ai for automatic transcription
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting || !formData.title}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-2 px-4 rounded-md transition-colors duration-200"
        >
          {isSubmitting ? 'Creating...' : 'Schedule Meeting'}
        </button>
      </form>
    </div>
  );
}
