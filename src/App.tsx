import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Calendar from './components/Calendar';
import FestivalList from './components/FestivalList';
import EventForm from './components/EventForm';
import BirthdayTracker from './components/BirthdayTracker';
import Settings from './components/Settings';
import Notification from './components/Notification';
import Callback from './pages/Callback';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, activeTab, setActiveTab } = useApp();
  const isCallbackPath = window.location.pathname === '/callback';

  // Handle OAuth callback
  if (isCallbackPath) {
    return <Callback />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <Notification />
      </>
    );
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">📅 Nepali Calendar</h1>
          <p className="app-subtitle">Sync your Nepali calendar with Google Calendar</p>
        </div>
        <div className="user-info">
          <span>👤 {user?.email || 'User'}</span>
        </div>
      </header>

      <nav className="app-nav">
        <div className="nav-container">
          <button
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            🏠 Dashboard
          </button>
          <button
            className={`nav-link ${activeTab === 'events' ? 'active' : ''}`}
            onClick={() => setActiveTab('events')}
          >
            📝 Events
          </button>
          <button
            className={`nav-link ${activeTab === 'birthdays' ? 'active' : ''}`}
            onClick={() => setActiveTab('birthdays')}
          >
            🎂 Birthdays
          </button>
          <button
            className={`nav-link ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
        </div>
      </nav>

      <main className="app-main">
        <div className="container">
          {activeTab === 'dashboard' && (
            <div className="dashboard">
              <h2>📆 Calendar View</h2>
              <Calendar />

              <FestivalList />

              <div className="dashboard-grid">
                <section className="dashboard-card">
                  <h3>📊 Quick Stats</h3>
                  <div className="stats-content">
                    <p>✨ Your Nepali calendar is ready to sync with Google Calendar</p>
                    <p>🏮 Major festivals are pre-loaded and ready to sync</p>
                    <p>📝 Create custom events based on the lunar calendar</p>
                    <p>🎂 Track birthdays that repeat yearly</p>
                  </div>
                </section>

                <section className="dashboard-card">
                  <h3>🚀 Getting Started</h3>
                  <div className="getting-started">
                    <ol>
                      <li>Create custom events for important dates</li>
                      <li>Track lunar birthdays of loved ones</li>
                      <li>Go to Settings → Sync to push events to Google Calendar</li>
                      <li>Manage reminders and notifications</li>
                    </ol>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'events' && (
            <div className="events-page">
              <h2>📝 Manage Events</h2>
              <EventForm />
            </div>
          )}

          {activeTab === 'birthdays' && (
            <div className="birthdays-page">
              <h2>🎂 Track Lunar Birthdays</h2>
              <BirthdayTracker />
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="settings-page">
              <Settings />
            </div>
          )}
        </div>
      </main>

      <Notification />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;
