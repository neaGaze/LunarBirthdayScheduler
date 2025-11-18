import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const Callback: React.FC = () => {
  const [status, setStatus] = useState('Processing authentication...');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase handles the OAuth callback automatically
        // Check if we have a session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Auth session error:', error);
          setStatus(`Error: ${error.message}`);
          setTimeout(() => {
            window.location.href = '/';
          }, 3000);
          return;
        }

        if (session) {
          console.log('✅ Authentication successful:', session.user.email);
          setStatus('Authentication successful! Redirecting...');

          // Redirect to home after a brief delay
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        } else {
          console.log('No session found');
          setStatus('Authentication completed. Redirecting...');
          setTimeout(() => {
            window.location.href = '/';
          }, 500);
        }
      } catch (error) {
        console.error('Callback error:', error);
        setStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    };

    handleCallback();
  }, []);

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
