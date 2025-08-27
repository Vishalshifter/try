'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';

export default function AdminSetup() {
  const [isSetup, setIsSetup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdmin();
    checkSetup();
  }, []);

  const { user } = useAuth();

  const checkAdmin = () => {
    // Check if current user is admin
    setIsAdmin(user?.email === 'vishal@shiftertech.com');
  };

  const checkSetup = async () => {
    try {
      const response = await fetch('/api/admin/check-setup');
      const data = await response.json();
      setIsSetup(data.isSetup);
    } catch (error) {
      console.error('Setup check failed:', error);
    }
  };

  const handleSetup = () => {
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=239406178361-0kac8nb8ut8fkmfk9tkohnac22502ep0.apps.googleusercontent.com&redirect_uri=${encodeURIComponent('http://localhost:3000/api/auth/google/callback')}&response_type=code&scope=https://www.googleapis.com/auth/calendar&access_type=offline&state=admin_setup`;
    window.location.href = authUrl;
  };

  if (isSetup || !isAdmin) return null;

  return (
    <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
      <h3 className="font-medium text-yellow-800 mb-2">Admin Setup Required</h3>
      <p className="text-sm text-yellow-700 mb-3">
        Connect admin calendar (vishal@shitfertech.com) to enable meeting scheduling for all users.
      </p>
      <button
        onClick={handleSetup}
        disabled={loading}
        className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 disabled:opacity-50"
      >
        {loading ? 'Setting up...' : 'Setup Admin Calendar'}
      </button>
    </div>
  );
}