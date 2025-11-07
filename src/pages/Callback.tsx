import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';

const Callback: React.FC = () => {
  const { handleOAuthCallback, showNotification, isAuthenticated } = useApp();
  const [status, setStatus] = useState('Processing OAuth callback...');

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');
      const error = params.get('error');

      console.log('Callback page loaded:', { code, error, isAuthenticated });

      if (error) {
        console.error('OAuth error:', error);
        setStatus(`OAuth error: ${error}`);
        showNotification('error', `OAuth error: ${error}`);
        // Redirect to home after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
        return;
      }

      if (code) {
        try {
          setStatus('Exchanging authorization code for access token...');
          console.log('Exchanging code for token...');
          await handleOAuthCallback(code);

          setStatus('Authentication successful! Redirecting...');
          console.log('Authentication successful, redirecting to home');

          // Redirect to home - the AppProvider will check localStorage for the token
          setTimeout(() => {
            console.log('Redirecting to home');
            window.location.href = '/';
          }, 500);
        } catch (error) {
          console.error('Callback error:', error);
          setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
          showNotification('error', 'Failed to complete authentication');
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
        }
      } else {
        setStatus('No authorization code received');
        console.error('No authorization code in callback');
        setTimeout(() => {
          window.location.href = '/';
        }, 2000);
      }
    };

    handleCallback();
  }, [handleOAuthCallback, showNotification, isAuthenticated]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '500px'
      }}>
        <h1>🔄 Completing Authentication...</h1>
        <p>{status}</p>
        <p style={{ opacity: 0.7, fontSize: '0.9em' }}>
          You'll be redirected shortly.
        </p>
        <div style={{
          marginTop: '20px',
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.05)',
          borderRadius: '4px',
          fontSize: '0.85em',
          fontFamily: 'monospace'
        }}>
          <p>Authenticated: {isAuthenticated ? '✅ Yes' : '❌ No'}</p>
        </div>
      </div>
    </div>
  );
};

export default Callback;
