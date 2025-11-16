/**
 * Export Data Utility
 * Exports events, birthdays, and settings as JSON
 */

import type { NepaliCalendarEvent, LunarBirthday } from '../services/nepaliEventService';

export interface ExportData {
  version: string;
  exportedAt: string;
  data: {
    events: NepaliCalendarEvent[];
    birthdays: LunarBirthday[];
    syncMappings: Record<string, string>;
    syncConfig: any;
  };
}

/**
 * Read data from localStorage
 */
function getLocalStorageData() {
  const events: NepaliCalendarEvent[] = [];
  const birthdays: LunarBirthday[] = [];
  let syncMappings: Record<string, string> = {};
  let syncConfig: any = {
    calendarId: 'primary',
    syncFestivals: true,
    syncCustomEvents: true,
    syncBirthdays: true,
    daysInAdvance: 90,
    maxBirthdaysToSync: 3,
  };

  try {
    const eventsJson = localStorage.getItem('nepali_events');
    if (eventsJson) {
      events.push(...JSON.parse(eventsJson));
    }
  } catch (e) {
    console.error('Error reading events:', e);
  }

  try {
    const birthdaysJson = localStorage.getItem('nepali_birthdays');
    if (birthdaysJson) {
      birthdays.push(...JSON.parse(birthdaysJson));
    }
  } catch (e) {
    console.error('Error reading birthdays:', e);
  }

  try {
    const mappingsJson = localStorage.getItem('nepali_calendar_sync_mappings');
    if (mappingsJson) {
      syncMappings = JSON.parse(mappingsJson);
    }
  } catch (e) {
    console.error('Error reading sync mappings:', e);
  }

  try {
    const configJson = localStorage.getItem('nepali_calendar_sync_config');
    if (configJson) {
      syncConfig = JSON.parse(configJson);
    }
  } catch (e) {
    console.error('Error reading sync config:', e);
  }

  return { events, birthdays, syncMappings, syncConfig };
}

/**
 * Create export data object
 */
function createExportData(): ExportData {
  const { events, birthdays, syncMappings, syncConfig } = getLocalStorageData();

  return {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    data: {
      events,
      birthdays,
      syncMappings,
      syncConfig,
    },
  };
}

/**
 * Download data as JSON file
 */
export function exportDataAsJSON(): void {
  try {
    const exportData = createExportData();
    const jsonString = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `nepali-calendar-export-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Error exporting data:', e);
    throw new Error(`Failed to export data: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Download data as CSV (flattened format)
 */
export function exportDataAsCSV(): void {
  try {
    const { events, birthdays } = getLocalStorageData();
    let csv = 'Type,Name/Title,Nepali Date,Gregorian Date,Description\n';

    // Add events
    events.forEach(event => {
      const nepaliDate = `${event.nepaliDate.year}-${String(event.nepaliDate.month).padStart(2, '0')}-${String(event.nepaliDate.day).padStart(2, '0')}`;
      const gregorianDate = `${event.gregorianDate.year}-${String(event.gregorianDate.month).padStart(2, '0')}-${String(event.gregorianDate.day).padStart(2, '0')}`;
      const description = (event.description || '').replace(/"/g, '""');
      csv += `"Event","${event.title}","${nepaliDate}","${gregorianDate}","${description}"\n`;
    });

    // Add birthdays
    birthdays.forEach(birthday => {
      const nepaliDate = `${birthday.nepaliDate.year}-${String(birthday.nepaliDate.month).padStart(2, '0')}-${String(birthday.nepaliDate.day).padStart(2, '0')}`;
      const gregorianDate = `${birthday.gregorianBirthDate.year}-${String(birthday.gregorianBirthDate.month).padStart(2, '0')}-${String(birthday.gregorianBirthDate.day).padStart(2, '0')}`;
      const note = birthday.isTithiBased ? `Tithi-based (${birthday.tithiNumber})` : '';
      csv += `"Birthday","${birthday.name}","${nepaliDate}","${gregorianDate}","${note}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `nepali-calendar-export-${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (e) {
    console.error('Error exporting CSV:', e);
    throw new Error(`Failed to export CSV: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Import data from JSON file
 */
export async function importDataFromJSON(file: File): Promise<ExportData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content) as ExportData;

        // Validate structure
        if (!data.version || !data.data) {
          throw new Error('Invalid export file format');
        }

        if (!Array.isArray(data.data.events) || !Array.isArray(data.data.birthdays)) {
          throw new Error('Invalid data structure in export file');
        }

        resolve(data);
      } catch (e) {
        reject(new Error(`Failed to import data: ${e instanceof Error ? e.message : String(e)}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file);
  });
}

/**
 * Restore data from import (overwrites existing)
 */
export function restoreDataFromImport(exportData: ExportData): void {
  try {
    if (exportData.data.events && Array.isArray(exportData.data.events)) {
      localStorage.setItem('nepali_events', JSON.stringify(exportData.data.events));
    }

    if (exportData.data.birthdays && Array.isArray(exportData.data.birthdays)) {
      localStorage.setItem('nepali_birthdays', JSON.stringify(exportData.data.birthdays));
    }

    if (exportData.data.syncMappings && typeof exportData.data.syncMappings === 'object') {
      localStorage.setItem('nepali_calendar_sync_mappings', JSON.stringify(exportData.data.syncMappings));
    }

    if (exportData.data.syncConfig && typeof exportData.data.syncConfig === 'object') {
      localStorage.setItem('nepali_calendar_sync_config', JSON.stringify(exportData.data.syncConfig));
    }
  } catch (e) {
    throw new Error(`Failed to restore data: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/**
 * Get data summary
 */
export function getExportSummary() {
  const { events, birthdays, syncMappings } = getLocalStorageData();
  const festivals = events.filter(e => e.isFestival);
  const customEvents = events.filter(e => !e.isFestival);

  return {
    festivals: festivals.length,
    customEvents: customEvents.length,
    birthdays: birthdays.length,
    syncMappings: Object.keys(syncMappings).length,
    total: events.length + birthdays.length,
  };
}
