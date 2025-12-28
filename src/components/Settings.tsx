import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { migrateToSupabase, isMigrationDone, resetMigrationFlag, type MigrationProgress } from '../utils/migrateToSupabase';
import {
  exportDataAsJSON,
  exportDataAsCSV,
  getExportSummary,
  importDataFromJSON,
  restoreDataFromImport,
  type ExportData
} from '../utils/exportData';
import {
  getUserSettings,
  upsertUserSettings,
  syncConfigToDb,
  dbToSyncConfig,
} from '../services/supabaseService';
import packageJson from '../../package.json';
import './Settings.css';

const SYNC_CONFIG_KEY = 'nepali_calendar_sync_config';

const DEFAULT_SYNC_CONFIG = {
  calendarId: 'primary',
  syncFestivals: true,
  syncCustomEvents: true,
  syncBirthdays: true,
  daysInAdvance: 90,
  maxBirthdaysToSync: 3,
  eventSyncYears: 1,
};

const Settings: React.FC = () => {
  const { logout, isSyncing, syncResult, syncEvents, festivals, events, birthdays, supabaseUserId, supabaseAccessToken, showNotification, dataSyncStatus, isAuthenticated, hasGoogleCalendarAccess, reconnectGoogleCalendar } = useApp();

  // Load initial state from localStorage or use defaults
  const [syncConfig, setSyncConfig] = useState(() => {
    const stored = localStorage.getItem(SYNC_CONFIG_KEY);
    if (stored) {
      try {
        return { ...DEFAULT_SYNC_CONFIG, ...JSON.parse(stored) };
      } catch (e) {
        console.error('Failed to parse stored sync config:', e);
      }
    }
    return DEFAULT_SYNC_CONFIG;
  });

  const [activeTab, setActiveTab] = useState<'sync' | 'settings' | 'about'>('sync');
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationProgress, setMigrationProgress] = useState<MigrationProgress | null>(null);
  const [migrationDone, setMigrationDone] = useState(isMigrationDone());
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sync config from Supabase when user is authenticated
  useEffect(() => {
    const loadCloudSettings = async () => {
      if (!supabaseUserId || settingsLoaded) return;

      setIsLoadingSettings(true);
      try {
        const cloudSettings = await getUserSettings(supabaseUserId);
        if (cloudSettings) {
          const config = dbToSyncConfig(cloudSettings);
          setSyncConfig(config);
          // Also update localStorage
          localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));
          console.log('[Settings] Loaded sync config from cloud');
        }
      } catch (error) {
        console.error('[Settings] Failed to load cloud settings:', error);
      } finally {
        setIsLoadingSettings(false);
        setSettingsLoaded(true);
      }
    };

    loadCloudSettings();
  }, [supabaseUserId, settingsLoaded]);

  // Save sync config to localStorage and Supabase whenever it changes
  const saveSyncConfig = useCallback(async (config: typeof syncConfig) => {
    // Always save to localStorage
    localStorage.setItem(SYNC_CONFIG_KEY, JSON.stringify(config));

    // Save to Supabase if authenticated
    if (supabaseUserId) {
      try {
        await upsertUserSettings(supabaseUserId, syncConfigToDb(config));
        console.log('[Settings] Saved sync config to cloud');
      } catch (error) {
        console.error('[Settings] Failed to save to cloud:', error);
      }
    }
  }, [supabaseUserId]);

  // Debounced save effect
  useEffect(() => {
    if (!settingsLoaded) return; // Don't save until initial load is done

    const timeoutId = setTimeout(() => {
      saveSyncConfig(syncConfig);
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [syncConfig, saveSyncConfig, settingsLoaded]);

  const handleSyncConfigChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setSyncConfig({
      ...syncConfig,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'daysInAdvance' || name === 'maxBirthdaysToSync' || name === 'eventSyncYears'
            ? parseInt(value)
            : value,
    });
  };

  const handleSync = async () => {
    await syncEvents(syncConfig);
  };

  const handleLogout = async () => {
    console.log('[Settings] Logout initiated');
    setIsLoggingOut(true);
    try {
      console.log('[Settings] Calling logout function');
      await logout();
      console.log('[Settings] Logout complete, reloading page');
      // Reload page to clear all state and session
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (error) {
      console.error('[Settings] Logout error:', error);
      showNotification('error', 'Failed to logout');
      setIsLoggingOut(false);
    }
  };

  const handleMigrate = async (force: boolean = false) => {
    console.log('[Settings] handleMigrate called, force:', force);
    console.log('[Settings] Using cached accessToken:', !!supabaseAccessToken, 'userId:', supabaseUserId);
    setIsMigrating(true);
    setMigrationProgress(null);

    // If forcing, reset the migration flag first
    if (force) {
      resetMigrationFlag();
      setMigrationDone(false);
    }

    // Use access token from context (already cached from auth init)
    if (!supabaseAccessToken) {
      console.error('[Settings] No access token in context!');
      showNotification('error', 'Not authenticated. Please refresh and try again.');
      setIsMigrating(false);
      return;
    }

    console.log('[Settings] About to call migrateToSupabase...');
    const result = await migrateToSupabase((progress) => {
      console.log('[Settings] Migration progress:', progress);
      setMigrationProgress(progress);
    }, supabaseUserId || undefined, force, supabaseAccessToken);
    console.log('[Settings] migrateToSupabase returned:', result);

    if (result.success) {
      setMigrationDone(true);
      showNotification('success', result.message);
    } else {
      showNotification('error', result.message);
    }

    setIsMigrating(false);
  };

  const handleExportJSON = () => {
    try {
      exportDataAsJSON();
      setShowExportMenu(false);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const handleExportCSV = () => {
    try {
      exportDataAsCSV();
      setShowExportMenu(false);
    } catch (e) {
      console.error('Export failed:', e);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportMessage(null);

    try {
      const data = await importDataFromJSON(file);
      restoreDataFromImport(data);
      setImportMessage({
        type: 'success',
        message: `Successfully imported ${data.data.events.length} events and ${data.data.birthdays.length} birthdays. Refresh the page to see changes.`
      });
    } catch (e) {
      setImportMessage({
        type: 'error',
        message: `Import failed: ${e instanceof Error ? e.message : String(e)}`
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const exportSummary = getExportSummary();

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
              <label htmlFor="eventSyncYears">Custom events sync duration</label>
              <div className="input-group">
                <input
                  type="number"
                  id="eventSyncYears"
                  name="eventSyncYears"
                  value={syncConfig.eventSyncYears}
                  onChange={handleSyncConfigChange}
                  min="1"
                  max="10"
                />
                <span>years</span>
              </div>
              <p className="field-desc">Number of years to create recurring custom events in Google Calendar</p>
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

          {/* Google Calendar Access Warning */}
          {isAuthenticated && !hasGoogleCalendarAccess && (
            <div className="sync-result warning" style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
              <div className="result-icon">⚠️</div>
              <div className="result-content">
                <h5>Google Calendar Session Expired</h5>
                <p>Your Google Calendar access token has expired. Please reconnect to sync events.</p>
                <button
                  className="btn btn-primary"
                  onClick={reconnectGoogleCalendar}
                  style={{ marginTop: '12px' }}
                >
                  🔗 Reconnect Google Calendar
                </button>
              </div>
            </div>
          )}

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
            disabled={isSyncing || !hasGoogleCalendarAccess}
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
              <button
                className="btn btn-danger"
                onClick={handleLogout}
                disabled={isLoggingOut}
              >
                {isLoggingOut ? '⏳ Signing out...' : 'Sign Out'}
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

            {/* Data Sync Status Indicator */}
            <div className="setting-item" style={{
              borderLeft: dataSyncStatus.source === 'supabase' ? '4px solid #2196F3' : '4px solid #9e9e9e',
              paddingLeft: '16px',
              backgroundColor: dataSyncStatus.source === 'supabase' ? '#e3f2fd' : '#f5f5f5'
            }}>
              <div className="setting-info">
                <h5>
                  {dataSyncStatus.isLoading ? '⏳ Syncing...' :
                   dataSyncStatus.source === 'supabase' ? '☁️ Cloud Connected' :
                   dataSyncStatus.source === 'localStorage' ? '💾 Local Storage' : '⚠️ No Data Source'}
                </h5>
                <p>
                  {dataSyncStatus.isLoading ? 'Loading your data from the cloud...' :
                   dataSyncStatus.source === 'supabase' ? 'Data syncs across all your devices in real-time' :
                   dataSyncStatus.source === 'localStorage' ? 'Data is stored locally on this device only' :
                   'Sign in to enable cloud sync'}
                </p>
                {dataSyncStatus.lastSynced && (
                  <p style={{ fontSize: '0.85em', color: '#666', marginTop: '4px' }}>
                    Last synced: {dataSyncStatus.lastSynced.toLocaleTimeString()}
                  </p>
                )}
                {dataSyncStatus.error && (
                  <p style={{ fontSize: '0.85em', color: '#d32f2f', marginTop: '4px' }}>
                    ⚠️ {dataSyncStatus.error}
                  </p>
                )}
              </div>
              {dataSyncStatus.source === 'supabase' && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 12px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '0.85em',
                  fontWeight: '500'
                }}>
                  <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#fff',
                    animation: 'pulse 2s infinite'
                  }}></span>
                  Live
                </span>
              )}
            </div>

            {!migrationDone && (
              <div className="setting-item" style={{ borderLeft: '4px solid #4CAF50', paddingLeft: '16px', backgroundColor: '#f0f8f0' }}>
                <div className="setting-info">
                  <h5>☁️ Migrate to Cloud Storage</h5>
                  <p>Move your events and birthdays to Supabase for cloud sync and backup</p>
                  {migrationProgress && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '0.9em', color: '#666' }}>{migrationProgress.message}</p>
                      {migrationProgress.total > 0 && (
                        <div style={{
                          width: '100%',
                          height: '8px',
                          backgroundColor: '#ddd',
                          borderRadius: '4px',
                          overflow: 'hidden',
                          marginTop: '8px'
                        }}>
                          <div style={{
                            width: `${(migrationProgress.current / migrationProgress.total) * 100}%`,
                            height: '100%',
                            backgroundColor: '#4CAF50',
                            transition: 'width 0.3s'
                          }}></div>
                        </div>
                      )}
                      {migrationProgress.status === 'error' && migrationProgress.errorDetails && (
                        <p style={{ color: 'red', fontSize: '0.85em', marginTop: '8px' }}>
                          Error: {migrationProgress.errorDetails}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => handleMigrate(false)}
                  disabled={isMigrating}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isMigrating ? (
                    <>
                      <span className="spinner"></span>
                      Migrating...
                    </>
                  ) : (
                    '→ Migrate Now'
                  )}
                </button>
              </div>
            )}

            {migrationDone && (
              <div className="setting-item" style={{ borderLeft: '4px solid #4CAF50', paddingLeft: '16px', backgroundColor: '#e8f5e9' }}>
                <div className="setting-info">
                  <h5>✅ Cloud Storage Enabled</h5>
                  <p>Your data is synced to Supabase and backed up in the cloud</p>
                  <p style={{ fontSize: '0.85em', color: '#666', marginTop: '8px' }}>
                    Local data: {events.length} events, {birthdays.length} birthdays
                  </p>
                  {migrationProgress && (
                    <div style={{ marginTop: '12px' }}>
                      <p style={{ fontSize: '0.9em', color: '#666' }}>{migrationProgress.message}</p>
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-secondary"
                  onClick={() => handleMigrate(true)}
                  disabled={isMigrating}
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {isMigrating ? (
                    <>
                      <span className="spinner"></span>
                      Syncing...
                    </>
                  ) : (
                    '🔄 Re-sync'
                  )}
                </button>
              </div>
            )}

            <div className="setting-item">
              <div className="setting-info">
                <h5>📥 Export Data</h5>
                <p>Download your events, birthdays, and settings</p>
                {exportSummary.total > 0 && (
                  <p style={{ fontSize: '0.85em', color: '#666', marginTop: '8px' }}>
                    {exportSummary.festivals} festivals · {exportSummary.customEvents} events · {exportSummary.birthdays} birthdays
                  </p>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowExportMenu(!showExportMenu)}
                >
                  ↓ Export
                </button>
                {showExportMenu && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      backgroundColor: 'white',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      zIndex: 1000,
                      minWidth: '200px',
                      marginTop: '4px'
                    }}
                  >
                    <button
                      onClick={handleExportJSON}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.95em',
                        borderBottom: '1px solid #eee',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      📄 JSON (complete backup)
                    </button>
                    <button
                      onClick={handleExportCSV}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '12px 16px',
                        border: 'none',
                        background: 'none',
                        textAlign: 'left',
                        cursor: 'pointer',
                        fontSize: '0.95em',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
                    >
                      📊 CSV (spreadsheet)
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <h5>📤 Import Data</h5>
                <p>Restore events and birthdays from a backup file</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
              <button
                className="btn btn-secondary"
                onClick={handleImportClick}
                disabled={isImporting}
              >
                {isImporting ? 'Importing...' : '↑ Import'}
              </button>
              {importMessage && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '4px',
                    backgroundColor: importMessage.type === 'success' ? '#d4edda' : '#f8d7da',
                    color: importMessage.type === 'success' ? '#155724' : '#721c24',
                    fontSize: '0.9em'
                  }}
                >
                  {importMessage.type === 'success' ? '✅' : '❌'} {importMessage.message}
                </div>
              )}
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
                <strong>Version:</strong> {packageJson.version}
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
