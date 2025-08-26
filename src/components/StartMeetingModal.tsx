'use client';

import React, { useState } from 'react';
import { auth } from '@/lib/firebase';
import { Meeting, Participant } from '@/types';
import { X, Plus, Trash2, Video, Users, Calendar } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface StartMeetingModalProps {
  onClose: () => void;
  onMeetingStarted: (meeting: Meeting) => void;
}

export default function StartMeetingModal({ onClose, onMeetingStarted }: StartMeetingModalProps) {
  const [formData, setFormData] = useState({
    platform: 'zoom',
    meetingId: '',
    title: '',
    scheduledAt: '',
    participants: [] as Participant[],
  });
  const [loading, setLoading] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    role: 'participant',
  });

  const platforms = [
    { id: 'zoom', name: 'Zoom', icon: Video },
    { id: 'teams', name: 'Microsoft Teams', icon: Users },
    { id: 'google', name: 'Google Meet', icon: Calendar },
  ];

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddParticipant = () => {
    if (!newParticipant.name || !newParticipant.email) {
      toast.error('Please fill in both name and email');
      return;
    }

    if (formData.participants.some(p => p.email === newParticipant.email)) {
      toast.error('Participant with this email already exists');
      return;
    }

    setFormData(prev => ({
      ...prev,
      participants: [...prev.participants, { ...newParticipant, id: Date.now().toString() }],
    }));

    setNewParticipant({ name: '', email: '', role: 'participant' });
  };

  const handleRemoveParticipant = (email: string) => {
    setFormData(prev => ({
      ...prev,
      participants: prev.participants.filter(p => p.email !== email),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.meetingId) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch('/api/meetings/start', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          platform: formData.platform,
          meetingId: formData.meetingId,
          title: formData.title,
          participants: formData.participants,
          scheduledAt: formData.scheduledAt || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start meeting');
      }

      const data = await response.json();
      
      if (data.success) {
        // Create a mock meeting object for the callback
        const meeting: Meeting = {
          id: data.data.meetingId,
          platform: formData.platform,
          meetingId: formData.meetingId,
          title: formData.title,
          createdBy: '', // Will be set by the backend
          participants: formData.participants,
          transcript: '',
          actionItems: [],
          decisions: [],
          status: 'scheduled',
          scheduledAt: formData.scheduledAt ? new Date(formData.scheduledAt) : undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: {
            transcriptionStatus: 'pending',
            summaryStatus: 'pending',
          },
        };

        onMeetingStarted(meeting);
        toast.success('Meeting started successfully!');
      }
    } catch (error) {
      console.error('Error starting meeting:', error);
      toast.error('Failed to start meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Start New Meeting</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Platform Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Meeting Platform
            </label>
            <div className="grid grid-cols-3 gap-3">
              {platforms.map((platform) => {
                const Icon = platform.icon;
                return (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => handleInputChange('platform', platform.id)}
                    className={`p-4 border rounded-lg text-center transition-colors ${
                      formData.platform === platform.id
                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <Icon className="w-6 h-6 mx-auto mb-2" />
                    <span className="text-sm font-medium">{platform.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Meeting Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter meeting title"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting ID *
              </label>
              <input
                type="text"
                value={formData.meetingId}
                onChange={(e) => handleInputChange('meetingId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Enter meeting ID or link"
                required
              />
            </div>
          </div>

          {/* Scheduled Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Date & Time (Optional)
            </label>
            <input
              type="datetime-local"
              value={formData.scheduledAt}
              onChange={(e) => handleInputChange('scheduledAt', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Participants */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Participants
            </label>
            
            {/* Add Participant Form */}
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Name"
              />
              <input
                type="email"
                value={newParticipant.email}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, email: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Email"
              />
              <select
                value={newParticipant.role}
                onChange={(e) => setNewParticipant(prev => ({ ...prev, role: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="participant">Participant</option>
                <option value="organizer">Organizer</option>
                <option value="presenter">Presenter</option>
              </select>
              <button
                type="button"
                onClick={handleAddParticipant}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Participants List */}
            {formData.participants.length > 0 && (
              <div className="space-y-2">
                {formData.participants.map((participant) => (
                  <div
                    key={participant.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <span className="font-medium text-gray-900">{participant.name}</span>
                      <span className="text-gray-500 ml-2">({participant.email})</span>
                      <span className="text-xs text-gray-400 ml-2 capitalize">{participant.role}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveParticipant(participant.email)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 focus:ring-2 focus:ring-indigo-500"
            >
              {loading ? 'Starting...' : 'Start Meeting'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
