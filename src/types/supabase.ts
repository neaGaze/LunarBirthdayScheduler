// Database types matching Supabase schema

export interface DbUser {
  id: string;
  google_id: string;
  email: string;
  name: string | null;
  created_at: string;
  last_login: string;
}

export interface DbEvent {
  id: string;
  user_id: string;
  title: string;
  nepali_year: number;
  nepali_month: number;
  nepali_day: number;
  gregorian_year: number;
  gregorian_month: number;
  gregorian_day: number;
  description: string | null;
  is_festival: boolean;
  is_lunar_event: boolean;
  reminder_enabled: boolean;
  reminder_minutes: number;
  recurring_pattern: 'yearly' | 'monthly' | null;
  recurring_end_year: number | null;
  recurring_end_month: number | null;
  recurring_end_day: number | null;
  festival_is_multi_day: boolean;
  festival_start_day: number | null;
  festival_end_day: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbBirthday {
  id: string;
  user_id: string;
  name: string;
  nepali_year: number;
  nepali_month: number;
  nepali_day: number;
  gregorian_year: number;
  gregorian_month: number;
  gregorian_day: number;
  is_tithi_based: boolean;
  tithi_number: number | null;
  reminder_enabled: boolean;
  reminder_minutes: number;
  created_at: string;
  updated_at: string;
}

export interface DbSyncMapping {
  id: string;
  user_id: string;
  local_event_id: string;
  google_event_id: string;
  calendar_id: string;
  event_type: 'event' | 'birthday';
  created_at: string;
}

export interface DbUserSettings {
  user_id: string;
  calendar_id: string;
  sync_festivals: boolean;
  sync_custom_events: boolean;
  sync_birthdays: boolean;
  days_in_advance: number;
  max_birthdays_to_sync: number;
  updated_at: string;
}

// Insert types (include id to allow client-generated IDs)
export type DbEventInsert = Omit<DbEvent, 'created_at' | 'updated_at'>;
export type DbBirthdayInsert = Omit<DbBirthday, 'created_at' | 'updated_at'>;
export type DbSyncMappingInsert = Omit<DbSyncMapping, 'id' | 'created_at'>;
export type DbUserSettingsInsert = Omit<DbUserSettings, 'updated_at'>;

// Update types (all fields optional except id)
export type DbEventUpdate = Partial<Omit<DbEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type DbBirthdayUpdate = Partial<Omit<DbBirthday, 'id' | 'user_id' | 'created_at' | 'updated_at'>>;
export type DbUserSettingsUpdate = Partial<Omit<DbUserSettings, 'user_id' | 'updated_at'>>;
