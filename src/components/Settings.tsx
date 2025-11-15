import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import './Settings.css';

const SYNC_CONFIG_KEY = 'nepali_calendar_sync_config';

const Settings: React.FC = () => {
  const { logout, isSyncing, syncResult, syncEvents, festivals, events, birthdays } = useApp();

  // Load initial state from localStorage or use defaults
  const [syncConfig, setSyncConfig] = useState(() => {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored sync config:', e);
      }
    }
    return {
      calendarId: 'primary',
      syncFestivals: true,
      syncCustomEvents: true,
      syncBirthdays: true,
      daysInAdvance: 90,
      maxBirthdaysToSync: 3,
    };
  });

  const [activeTab, setActiveTab] = useState<'sync' | 'settings' | 'about'>('sync');

  // Save sync config to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(syncConfig));
  }, [syncConfig]);

  const handleSyncConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setSyncConfig({
      ...syncConfig,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'daysInAdvance' || name === 'maxBirthdaysToSync'
            ? parseInt(value)
            : value,
    });
  };

  const handleSync = async () => {
    await syncEvents(syncConfig);
  };

  const getEventStats = () => {
    let totalFestivals = festivals.length;
    let customEvents = events.length;
    let totalBirthdays = birthdays.length;

    return {
      festivals: totalFestivals,
      events: customEvents,
      birthdays: totalBirthdays,
      total: totalFestivals + customEvents + totalBirthdays,
    };
  };

  const stats = getEventStats();

  return (
    <div className="settings-container">
      <div className="settings-tabs">
        <button
          className={`tab-button ${activeTab === 'sync' ? 'active' : ''}`}
          onClick={() => setActiveTab('sync')}
        >
          🔄 Sync
        </button>
        <button
          className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
          onClick={() => setActiveTab('settings')}
        >
          ⚙️ Settings
        </button>
        <button
          className={`tab-button ${activeTab === 'about' ? 'active' : ''}`}
          onClick={() => setActiveTab('about')}
        >
          ℹ️ About
        </button>
      </div>

      {activeTab === 'sync' && (
        <div className="settings-panel">
          <h3>📊 Google Calendar Sync</h3>

          <div className="sync-stats">
            <div className="stat-card">
              <div className="stat-number">{stats.festivals}</div>
              <div className="stat-label">Festivals</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.events}</div>
              <div className="stat-label">Events</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.birthdays}</div>
              <div className="stat-label">Birthdays</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">Total Events</div>
            </div>
          </div>

          <div className="sync-config">
            <h4>What to Sync</h4>

            <div className="sync-option">
              <label>
                <input
                  type="checkbox"
                  name="syncFestivals"
                  checked={syncConfig.syncFestivals}
                  onChange={handleSyncConfigChange}
                />
                <span className="checkbox-label">
                  <span className="icon">🏮</span>
                  Sync Nepali Festivals
                </span>
              </label>
              <p className="option-desc">Add major festivals like Dashain, Tihar, etc.</p>
            </div>

            <div className="sync-option">
              <label>
                <input
                  type="checkbox"
                  name="syncCustomEvents"
                  checked={syncConfig.syncCustomEvents}
                  onChange={handleSyncConfigChange}
                />
                <span className="checkbox-label">
                  <span className="icon">📝</span>
                  Sync Custom Events
                </span>
              </label>
              <p className="option-desc">Add your personal events to Google Calendar</p>
            </div>

            <div className="sync-option">
              <label>
                <input
                  type="checkbox"
                  name="syncBirthdays"
                  checked={syncConfig.syncBirthdays}
                  onChange={handleSyncConfigChange}
                />
                <span className="checkbox-label">
                  <span className="icon">🎂</span>
                  Sync Lunar Birthdays
                </span>
              </label>
              <p className="option-desc">Add tracked birthdays as recurring events</p>
            </div>
          </div>

          <div className="sync-advanced">
            <h4>Advanced Settings</h4>

            <div className="form-group">
              <label htmlFor="daysInAdvance">Sync festivals up to</label>
              <div className="input-group">
                <input
                  type="number"
                  id="daysInAdvance"
                  name="daysInAdvance"
                  value={syncConfig.daysInAdvance}
                  onChange={handleSyncConfigChange}
                  min="1"
                  max="365"
                />
                <span>days in advance</span>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="maxBirthdaysToSync">Lunar birthday occurrences</label>
              <div className="input-group">
                <input
                  type="number"
                  id="maxBirthdaysToSync"
                  name="maxBirthdaysToSync"
                  value={syncConfig.maxBirthdaysToSync}
                  onChange={handleSyncConfigChange}
                  min="1"
                  max="10"
                />
                <span>future occurrences</span>
              </div>
              <p className="field-desc">Number of future lunar birthday events to sync per person</p>
            </div>

            <div className="form-group">
              <label htmlFor="calendarId">Google Calendar</label>
              <select
                id="calendarId"
                name="calendarId"
                value={syncConfig.calendarId}
                onChange={handleSyncConfigChange}
              >
                <option value="primary">Primary Calendar</option>
              </select>
              <p className="field-desc">Note: Only primary calendar is supported for now</p>
            </div>
          </div>

          {syncResult && (
            <div className={`sync-result ${syncResult.failed === 0 ? 'success' : 'warning'}`}>
              <div className="result-icon">
                {syncResult.failed === 0 ? '✅' : '⚠️'}
              </div>
              <div className="result-content">
                <h5>{syncResult.failed === 0 ? 'Sync Successful!' : 'Sync Completed'}</h5>
                <p>{syncResult.message}</p>
                <p className="result-details">
                  {syncResult.success} events synced
                  {syncResult.failed > 0 && ` · ${syncResult.failed} failed`}
                </p>
                {syncResult.errors && syncResult.errors.length > 0 && (
                  <div className="error-details">
                    <p className="error-title">Errors:</p>
                    <ul>
                      {syncResult.errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            className="btn btn-primary btn-large"
            onClick={handleSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <span className="spinner"></span>
                Syncing...
              </>
            ) : (
              <>
                🔄 Sync to Google Calendar
              </>
            )}
          </button>

          <p className="sync-note">
            Your Nepali calendar events will be added to your Google Calendar with automatic
            reminders enabled.
          </p>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="settings-panel">
          <h3>⚙️ Settings</h3>

          <div className="settings-group">
            <h4>Account</h4>
            <div className="setting-item">
              <div className="setting-info">
                <h5>Google Account</h5>
                <p>You are signed in to your Google account</p>
              </div>
              <button className="btn btn-danger" onClick={logout}>
                Sign Out
              </button>
            </div>
          </div>

          <div className="settings-group">
            <h4>Notifications</h4>
            <div className="setting-item">
              <div className="setting-info">
                <h5>Event Reminders</h5>
                <p>Get notified about upcoming events</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h5>Birthday Alerts</h5>
                <p>Get reminded 1 day before birthdays</p>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" defaultChecked />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          <div className="settings-group">
            <h4>Data</h4>
            <div className="setting-item">
              <div className="setting-info">
                <h5>Export Data</h5>
                <p>Download your events and birthdays as JSON</p>
              </div>
              <button className="btn btn-secondary">Export</button>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h5>Clear All Data</h5>
                <p>Remove all custom events and birthdays (cannot be undone)</p>
              </div>
              <button className="btn btn-danger">Clear</button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'about' && (
        <div className="settings-panel">
          <h3>ℹ️ About Nepali Calendar</h3>

          <div className="about-content">
            <div className="about-section">
              <h4>📅 What is Nepali Calendar?</h4>
              <p>
                The Nepali calendar (Bikram Sambat or B.S.) is a lunisolar calendar used in Nepal.
                Unlike the solar Gregorian calendar, it combines lunar months with a solar year,
                creating a unique date system that shifts relative to the Western calendar each year.
              </p>
            </div>

            <div className="about-section">
              <h4>🎯 Key Features</h4>
              <ul>
                <li>✨ Sync Nepali tithis (lunar days) with your Google Calendar</li>
                <li>🏮 Automatic festival dates for major Nepali celebrations</li>
                <li>📝 Add custom events based on the lunar calendar</li>
                <li>🎂 Track birthdays that repeat yearly on lunar dates</li>
                <li>🔔 Smart reminders for all your events</li>
                <li>🔄 Seamless Google Calendar integration</li>
              </ul>
            </div>

            <div className="about-section">
              <h4>📚 Supported Festivals</h4>
              <div className="festivals-grid">
                <div className="festival-card">
                  <span className="festival-emoji">🌸</span>
                  <span className="festival-name">Prithvi Jayanti</span>
                </div>
                <div className="festival-card">
                  <span className="festival-emoji">💃</span>
                  <span className="festival-name">Teej</span>
                </div>
                <div className="festival-card">
                  <span className="festival-emoji">🏮</span>
                  <span className="festival-name">Dashain</span>
                </div>
                <div className="festival-card">
                  <span className="festival-emoji">🪔</span>
                  <span className="festival-name">Tihar</span>
                </div>
                <div className="festival-card">
                  <span className="festival-emoji">☀️</span>
                  <span className="festival-name">Chhath</span>
                </div>
                <div className="festival-card">
                  <span className="festival-emoji">🕉️</span>
                  <span className="festival-name">Maha Shivaratri</span>
                </div>
                <div className="festival-card">
                  <span className="festival-emoji">🎨</span>
                  <span className="festival-name">Holi</span>
                </div>
              </div>
            </div>

            <div className="about-section">
              <h4>💡 Learn More</h4>
              <p>
                To learn more about the Nepali calendar system and its history, visit:
                <br />
                <a href="https://en.wikipedia.org/wiki/Nepali_calendar" target="_blank" rel="noopener noreferrer">
                  Wikipedia: Nepali Calendar
                </a>
              </p>
            </div>

            <div className="about-footer">
              <p>
                <strong>Version:</strong> 1.0.0
              </p>
              <p>
                <strong>Built with:</strong> React, TypeScript, Google Calendar API
              </p>
              <p>
                Made with ❤️ for the Nepali community
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
