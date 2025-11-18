import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { supabase } from '../services/supabaseClient';
import './Login.css';

const Login: React.FC = () => {
  const { isAuthenticated, showNotification } = useApp();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLoginClick = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Supabase OAuth error:', error);
        showNotification('error', `Login failed: ${error.message}`);
        setIsLoading(false);
        return;
      }

      console.log('OAuth initiated:', data);
    } catch (error) {
      console.error('Login error:', error);
      showNotification('error', 'Login failed. Check console for details.');
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>📅 Nepali Calendar</h1>
          <p>Sync your Nepali calendar with Google Calendar</p>
        </div>

        <div className="login-content">
          <div className="features">
            <div className="feature">
              <span className="icon">✨</span>
              <h3>Tithi & Festivals</h3>
              <p>Sync Nepali tithis and major festivals</p>
            </div>

            <div className="feature">
              <span className="icon">📝</span>
              <h3>Custom Events</h3>
              <p>Add your important dates based on lunar calendar</p>
            </div>

            <div className="feature">
              <span className="icon">🎂</span>
              <h3>Lunar Birthdays</h3>
              <p>Track birthdays that repeat yearly on lunar dates</p>
            </div>

            <div className="feature">
              <span className="icon">🔔</span>
              <h3>Smart Reminders</h3>
              <p>Get notified about upcoming events</p>
            </div>
          </div>

          <button
            className="login-button"
            onClick={handleLoginClick}
            disabled={isLoading}
          >
            <span className="google-icon">{isLoading ? '⏳' : 'G'}</span>
            {isLoading ? 'Redirecting...' : 'Sign in with Google'}
          </button>

          <p className="login-note">
            We'll use your Google Calendar to sync Nepali calendar events. No personal data is stored.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
