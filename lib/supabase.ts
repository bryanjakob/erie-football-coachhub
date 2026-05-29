import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase =
  supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export type CoachRole = "Head Coach/Admin" | "Coordinator" | "Position Coach";

export type RSVPStatus = "Yes" | "No" | "Late" | "Pending";

export type StaffChannel =
  | "Full Staff"
  | "Defensive Staff"
  | "Offensive Staff"
  | "DBs"
  | "LBs"
  | "DL"
  | "Special Teams";
