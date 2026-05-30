import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export const installBucket = "install-files";

export type CoachRole = "Admin" | "Head Coach" | "Varsity Coach" | "JV Coach" | "Volunteer Coach";

export type RSVPStatus = "Yes" | "No" | "Late" | "Pending";

export type EventType = "Workout" | "Practice" | "Staff Meeting" | "Camp" | "Game" | "Clinic";

export type StaffChannel =
  | "Full Staff"
  | "Defensive Staff"
  | "Offensive Staff"
  | "DBs"
  | "LBs"
  | "DL"
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

export type StaffEventRecord = {
  id: string;
  title: string;
  description: string | null;
  date: string;
  created_at: string;
};

export type AttendanceRecord = {
  event_id: string;
  coach_id: string;
  status: RSVPStatus;
  response_note: string | null;
  updated_at: string;
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
  coach_id: string | null;
  body: string;
  attachment_path: string | null;
  pinned: boolean;
  created_at: string;
  coaches?: Pick<CoachAccount, "full_name"> | null;
};

export type AnnouncementRecord = {
  id: string;
  body: string;
  created_by: string | null;
  created_at: string;
};
