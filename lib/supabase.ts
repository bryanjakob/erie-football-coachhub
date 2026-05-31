import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const installBucket = "install-files";

export type CoachRole = "Admin" | "Head Coach" | "Varsity Coach" | "JV Coach" | "Volunteer Coach";

export type RSVPStatus = "Yes" | "No";

export type EventType = "Workout" | "Practice" | "Staff Meeting" | "Camp" | "Game" | "Clinic";

export type StaffChannel =
  | "General Staff"
  | "Offense"
  | "Defense"
  | "Special Teams";

export type CoachAccount = {
  id: string;
  auth_user_id: string | null;
  email: string;
  full_name: string;
  role: CoachRole;
  position_group: string | null;
  active: boolean;
  created_at: string;
};

export type CoachProfile = {
  id: string;
  full_name: string;
  email: string | null;
  created_at: string;
};

export type StaffEventRecord = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  rsvp_required?: boolean | null;
  created_at: string;
};

export type RsvpRecord = {
  id: string;
  event_id: string;
  user_id: string;
  coach_name: string;
  response: RSVPStatus;
  created_at: string;
};

export type InstallLibraryFileRecord = {
  id: string;
  title: string;
  folder: string;
  file_type: string;
  storage_path: string;
  file_size: number | null;
  uploaded_by: string | null;
  created_at: string;
};

export type ChatChannelRecord = {
  id: string;
  name: StaffChannel;
};

export type ChatMessageRecord = {
  id: string;
  channel_id: string;
  user_id: string;
  coach_name: string;
  message: string;
  created_at: string;
};

export type AnnouncementRecord = {
  id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};
