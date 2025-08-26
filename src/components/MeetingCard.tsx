'use client';

import React, { useState } from 'react';
import { Meeting } from '@/types';
import { 
  Video, 
  Users, 
  Clock, 
  Calendar, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Download,
  Eye,
  MessageSquare
} from 'lucide-react';
import { format, isValid, parseISO } from 'date-fns';
import { toast } from 'react-hot-toast';

interface MeetingCardProps {
  meeting: Meeting;
  onRefresh: () => void;
}

export default function MeetingCard({ meeting, onRefresh }: MeetingCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [loading, setLoading] = useState(false);

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'zoom':
        return <Video className="w-4 h-4" />;
      case 'teams':
        return <Users className="w-4 h-4" />;
      case 'google':
        return <Calendar className="w-4 h-4" />;
      default:
        return <Video className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in-progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this meeting?')) {
      return;
    }

    try {
      setLoading(true);
      const token = await (window as any).firebase?.auth?.currentUser?.getIdToken();
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/meetings/${meeting.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete meeting');
      }

      toast.success('Meeting deleted successfully');
      onRefresh();
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Failed to delete meeting');
    } finally {
      setLoading(false);
      setShowActions(false);
    }
  };

  const handleGenerateNotes = async () => {
    try {
      setLoading(true);
      const token = await (window as any).firebase?.auth?.currentUser?.getIdToken();
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(`/api/meetings/${meeting.id}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          includeActionItems: true,
          includeDecisions: true,
          includeKeyTopics: true,
          includeSentiment: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate notes');
      }

      toast.success('AI notes generated successfully');
      onRefresh();
    } catch (error) {
      console.error('Error generating notes:', error);
      toast.error('Failed to generate notes');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    try {
      setLoading(true);
      
      if (format === 'pdf') {
        // PDF export logic would go here
        toast.success('PDF export started');
      } else {
        // CSV export logic would go here
        toast.success('CSV export started');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-2">
            <div className="flex items-center space-x-2 text-gray-600">
              {getPlatformIcon(meeting.platform)}
              <span className="text-sm font-medium capitalize">
                {meeting.platform}
              </span>
            </div>
            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(meeting.status)}`}>
              {getStatusText(meeting.status)}
            </span>
          </div>
          
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {meeting.title}
          </h3>
          
          <div className="flex items-center space-x-6 text-sm text-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>
                {meeting.scheduledAt && isValid(new Date(meeting.scheduledAt))
                  ? format(new Date(meeting.scheduledAt), 'MMM dd, yyyy HH:mm')
                  : meeting.createdAt && isValid(new Date(meeting.createdAt))
                    ? format(new Date(meeting.createdAt), 'MMM dd, yyyy HH:mm')
                    : 'Unknown date'
                }
              </span>
            </div>
            
            {meeting.participants.length > 0 && (
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{meeting.participants.length} participants</span>
              </div>
            )}
          </div>

          {/* Meeting Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {meeting.transcript && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <MessageSquare className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Transcript</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {meeting.transcript.length > 100 
                    ? `${meeting.transcript.substring(0, 100)}...`
                    : meeting.transcript
                  }
                </p>
              </div>
            )}

            {meeting.summary && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Summary</span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {meeting.summary.length > 100 
                    ? `${meeting.summary.substring(0, 100)}...`
                    : meeting.summary
                  }
                </p>
              </div>
            )}

            {meeting.actionItems.length > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Calendar className="w-4 h-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Action Items</span>
                </div>
                <p className="text-sm text-gray-600">
                  {meeting.actionItems.length} action item{meeting.actionItems.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {meeting.transcript && !meeting.summary && (
              <button
                onClick={handleGenerateNotes}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <Eye className="w-4 h-4 mr-2" />
                Generate AI Notes
              </button>
            )}

            {meeting.summary && (
              <button
                onClick={() => handleExport('pdf')}
                disabled={loading}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </button>
            )}

            <button
              onClick={() => handleExport('csv')}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Actions Menu */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <MoreVertical className="w-5 h-5" />
          </button>

          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-10 border border-gray-200">
              <button
                onClick={() => {
                  // Edit logic would go here
                  setShowActions(false);
                }}
                className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <Edit className="w-4 h-4 mr-3" />
                Edit Meeting
              </button>
              
              <button
                onClick={handleDelete}
                disabled={loading}
                className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete Meeting
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
