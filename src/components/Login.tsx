import React, { useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './Login.css';

const Login: React.FC = () => {
  const { isAuthenticated, login, handleOAuthCallback, showNotification } = useApp();
  const [isLoading, setIsLoading] = React.useState(false);

  useEffect(() => {
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');

    if (code && !isAuthenticated) {
      handleOAuthCallback(code);
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [isAuthenticated, handleOAuthCallback]);

  const handleLoginClick = async () => {
    setIsLoading(true);
    try {
      // Check if environment variables are available
      const clientId = (window as any).VITE_GOOGLE_CLIENT_ID;
      const clientSecret = (window as any).VITE_GOOGLE_CLIENT_SECRET;
      const redirectUri = (window as any).VITE_REDIRECT_URI;

      if (!clientId || !clientSecret) {
        console.error('Missing environment variables:', {
          clientId: clientId ? 'present' : 'missing',
          clientSecret: clientSecret ? 'present' : 'missing',
          redirectUri: redirectUri ? 'present' : 'missing'
        });
        showNotification('error', 'Missing Google OAuth credentials. Check console for details.');
        setIsLoading(false);
        return;
      }

      await login();
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
