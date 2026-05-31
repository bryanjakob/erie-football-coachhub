"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  positionGroups,
  supabase,
  type AnnouncementRecord,
  type ChatChannelRecord,
  type ChatMessageRecord,
  type CoachAccount,
  type CoachProfile,
  type CoachRole,
  type EventType,
  type PositionGroup,
  type RsvpRecord,
  type RSVPStatus,
  type StaffChannel,
  type StaffEventRecord
} from "@/lib/supabase";

type Section = "Home" | "Calendar" | "Attendance" | "Installs" | "Chats" | "Admin";

type EventForm = {
  title: string;
  eventType: EventType;
  date: string;
  time: string;
  location: string;
  notes: string;
  rsvpRequired: boolean;
};

type SignUpInput = {
  firstName: string;
  lastName: string;
  positionGroup: PositionGroup | "";
  email: string;
  password: string;
};

type ScheduleImportEvent = {
  title: string;
  description: string;
  date: string;
};

type SyncCoachesResult = {
  syncedCoachesCount: number;
  createdProfilesCount: number;
  existingCoachesCount: number;
  profilesCount: number;
  coachesCount: number;
  authUsersCount: number;
  authUserEmails?: string[];
  profileEmails?: Array<{
    id: string;
    full_name: string;
    email: string | null;
    position_group: string | null;
  }>;
  coachEmails?: Array<{
    id: string;
    auth_user_id: string | null;
    full_name: string;
    email: string | null;
    role: string;
    position_group: string | null;
    active: boolean;
  }>;
  missingProfilesAfterSync: Array<{
    id: string;
    full_name: string;
    email: string | null;
    position_group: string | null;
  }>;
  errors: string[];
};

type CoachDirectoryDebugResult = {
  authUsersCount: number;
  profilesCount: number;
  coachesCount: number;
  authUserEmails: string[];
  profileEmails: Array<{
    id: string;
    full_name: string;
    email: string | null;
    position_group: string | null;
  }>;
  coachEmails: Array<{
    id: string;
    auth_user_id: string | null;
    full_name: string;
    email: string | null;
    role: string;
    position_group: string | null;
    active: boolean;
  }>;
  errors: string[];
};

type CalendarView = "Month" | "Week" | "Agenda";

const navItems: Section[] = ["Home", "Calendar", "Attendance", "Installs", "Chats", "Admin"];
const quickLinks: Section[] = ["Calendar", "Attendance", "Installs", "Chats"];
const eventTypes: EventType[] = ["Workout", "Practice", "Staff Meeting", "Camp", "Game", "Clinic"];
const defaultChannels: StaffChannel[] = ["General Staff", "Offense", "Defense", "Special Teams"];
const coachRoles: CoachRole[] = ["Admin", "Head Coach", "Varsity Coach", "JV Coach", "Volunteer Coach", "Coach"];
const logoSrc = "/erie-football-logo.png";

function denverTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00-06:00`).toISOString();
}

const summerWeekOneSchedule: ScheduleImportEvent[] = [
  {
    title: "OL/DL Camp",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 9:30-11:00 AM\nLocation: Thunderridge\nAttendance required",
    date: denverTimestamp("2026-05-31", "09:30")
  },
  {
    title: "Summer Workout #1",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-01", "07:00")
  },
  {
    title: "Summer Workout #2",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-02", "07:00")
  },
  {
    title: "Team Pass #1",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 8:30 AM\nAttendance required",
    date: denverTimestamp("2026-06-02", "08:30")
  },
  {
    title: "Player Led Practice",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-03", "07:00")
  },
  {
    title: "Summer Workout #4",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-04", "07:00")
  },
  {
    title: "Team Pass #2",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 8:30 AM\nAttendance required",
    date: denverTimestamp("2026-06-04", "08:30")
  },
  {
    title: "Summer Workout #5",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-05", "07:00")
  }
];

const initialEventForm: EventForm = {
  title: "",
  eventType: "Practice",
  date: "",
  time: "",
  location: "",
  notes: "",
  rsvpRequired: true
};

const statusStyles: Record<RSVPStatus, string> = {
  Yes: "bg-orange/15 text-orange ring-orange/30",
  No: "bg-red-500/15 text-red-200 ring-red-400/30"
};

const attendanceLabels: Record<RSVPStatus, string> = {
  Yes: "Attending",
  No: "Not Attending"
};

function Icon({ name }: { name: Section | "Bell" | "Lock" | "Upload" | "Download" | "Search" | "Plus" }) {
  const paths: Record<string, ReactNode> = {
    Home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
    Calendar: <path d="M7 3v4M17 3v4M4 9h16M5 5h14v16H5z" />,
    Attendance: <path d="M9 11l2 2 4-5M20 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0z" />,
    Installs: <path d="M4 5h6l2 2h8v12H4zM8 13h8M8 16h5" />,
    Chats: <path d="M4 5h16v11H8l-4 4z" />,
    Admin: <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6z" />,
    Bell: <path d="M18 16H6l2-3V9a4 4 0 0 1 8 0v4zM10 19h4" />,
    Lock: <path d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12v10H6z" />,
    Upload: <path d="M12 16V4m0 0L8 8m4-4 4 4M4 16v4h16v-4" />,
    Download: <path d="M12 4v12m0 0 4-4m-4 4-4-4M4 20h16" />,
    Search: <path d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z" />,
    Plus: <path d="M12 5v14M5 12h14" />
  };

  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg border border-line bg-graphite/70 p-3">
      <div className={`text-2xl font-black ${tone ?? "text-white"}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/50">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: RSVPStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status]}`}>{attendanceLabels[status]}</span>;
}

function RsvpSelection({ response }: { response: RSVPStatus | null }) {
  return response ? <StatusPill status={response} /> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60 ring-1 ring-white/15">No Response</span>;
}

function ErieLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-md border border-white/10 bg-white p-1.5 ${className}`}>
      <img src={logoSrc} alt="Erie Football" className="max-h-full max-w-full object-contain" />
    </div>
  );
}

function formatDateTime(value: string) {
  if (!value) return "Unscheduled";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function formatEventTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

function dateKey(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfWeek(date: Date) {
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(date, diff);
}

function calendarMonthDays(monthDate: Date) {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = startOfWeek(firstOfMonth);
  return Array.from({ length: 42 }, (_, index) => addDays(gridStart, index));
}

function eventKind(event: StaffEventRecord) {
  const text = `${event.title} ${event.description ?? ""}`.toLowerCase();
  if (text.includes("staff meeting") || text.includes("meeting")) return "Staff Meeting";
  if (text.includes("camp")) return "Camp";
  if (text.includes("practice") || text.includes("team pass")) return "Practice";
  return "Workout";
}

function eventColorClass(event: StaffEventRecord) {
  const kind = eventKind(event);
  if (kind === "Workout") return "border-orange/60 bg-orange/15 text-orange";
  if (kind === "Practice") return "border-white/40 bg-white/15 text-white";
  if (kind === "Camp") return "border-white/25 bg-white/10 text-white/75";
  return "border-line bg-graphite/90 text-white/80";
}

function eventLocation(event: StaffEventRecord) {
  const locationLine = event.description?.split("\n").find((line) => line.toLowerCase().startsWith("location:"));
  return locationLine?.replace(/^location:\s*/i, "").trim() || "Not listed";
}

function attendanceDescription(description?: string | null) {
  return description
    ?.replace(/RSVP required/gi, "Attendance required")
    .replace(/Attendance required:\s*Yes/gi, "Attendance required")
    .replace(/RSVPs/gi, "Attendance responses")
    .replace(/RSVP/gi, "Attendance");
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function coachRoleLabel(coach: CoachAccount | null) {
  return coach?.role ?? "Coach";
}

function coachHasAuthAccount(coach: CoachAccount | null, profiles: CoachProfile[], activeSession: Session | null) {
  if (!coach) return Boolean(activeSession);
  if (coach.auth_user_id) return true;

  const coachEmail = normalizeEmail(coach.email);
  if (!coachEmail) return false;

  if (normalizeEmail(activeSession?.user.email) === coachEmail) return true;

  return profiles.some((profile) => normalizeEmail(profile.email) === coachEmail);
}

function coachAccountStatus(coach: CoachAccount | null, profiles: CoachProfile[], activeSession: Session | null) {
  return coachHasAuthAccount(coach, profiles, activeSession) ? "Active" : "Pending";
}

function coachAccountUserId(coach: CoachAccount, profiles: CoachProfile[], activeSession: Session | null) {
  if (coach.auth_user_id) return coach.auth_user_id;

  const coachEmail = normalizeEmail(coach.email);
  if (!coachEmail) return null;

  if (normalizeEmail(activeSession?.user.email) === coachEmail) return activeSession?.user.id ?? null;

  return profiles.find((profile) => normalizeEmail(profile.email) === coachEmail)?.id ?? null;
}

function eventRsvpRequired(event: StaffEventRecord) {
  return event.rsvp_required ?? true;
}

function LoginPanel({
  status,
  onLogin,
  onSignUp,
  onReset
}: {
  status: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (input: SignUpInput) => Promise<void>;
  onReset: (email: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signUpForm, setSignUpForm] = useState<SignUpInput>({ firstName: "", lastName: "", positionGroup: "", email: "", password: "" });

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await onLogin(email, password);
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault();
    await onSignUp(signUpForm);
  }

  return (
    <form onSubmit={mode === "signin" ? handleLogin : handleSignUp} className="rounded-lg border border-line bg-charcoal/90 p-4 shadow-glow md:p-5">
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-lg font-black">{mode === "signin" ? "Coach Login" : "Create Coach Account"}</h2>
          <p className="text-sm text-white/60">Supabase Auth keeps coaches signed in on mobile after login.</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 rounded-lg border border-line bg-graphite/80 p-1 text-sm font-black">
        <button type="button" onClick={() => setMode("signin")} className={`min-h-10 rounded-md ${mode === "signin" ? "bg-orange text-ink" : "text-white/70"}`}>Sign In</button>
        <button type="button" onClick={() => setMode("signup")} className={`min-h-10 rounded-md ${mode === "signup" ? "bg-orange text-ink" : "text-white/70"}`}>Create Account</button>
      </div>
      {mode === "signin" ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="coach@school.edu" type="email" required />
            <input value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Password" type="password" required />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <button className="min-h-12 rounded-lg bg-orange px-5 font-black text-ink">Sign In</button>
            <button type="button" onClick={() => onReset(email)} className="min-h-12 rounded-lg border border-line px-5 font-bold text-white/80">Reset Password</button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input value={signUpForm.firstName} onChange={(event) => setSignUpForm({ ...signUpForm, firstName: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="First name" required />
            <input value={signUpForm.lastName} onChange={(event) => setSignUpForm({ ...signUpForm, lastName: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Last name" required />
            <select value={signUpForm.positionGroup} onChange={(event) => setSignUpForm({ ...signUpForm, positionGroup: event.target.value as PositionGroup })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 focus:ring-2" required>
              <option value="">Position Group</option>
              {positionGroups.map((group) => <option key={group}>{group}</option>)}
            </select>
            <input value={signUpForm.email} onChange={(event) => setSignUpForm({ ...signUpForm, email: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="coach@school.edu" type="email" required />
            <input value={signUpForm.password} onChange={(event) => setSignUpForm({ ...signUpForm, password: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Password" type="password" required minLength={6} />
          </div>
          <button className="mt-3 min-h-12 w-full rounded-lg bg-orange px-5 font-black text-ink">Create Account</button>
        </>
      )}
      {status && <p className="mt-3 rounded-lg bg-graphite/80 p-3 text-sm text-white/70">{status}</p>}
    </form>
  );
}

export default function Page() {
  const [section, setSection] = useState<Section>("Home");
  const [session, setSession] = useState<Session | null>(null);
  const [currentCoach, setCurrentCoach] = useState<CoachAccount | null>(null);
  const [currentProfile, setCurrentProfile] = useState<CoachProfile | null>(null);
  const [coaches, setCoaches] = useState<CoachAccount[]>([]);
  const [profiles, setProfiles] = useState<CoachProfile[]>([]);
  const [events, setEvents] = useState<StaffEventRecord[]>([]);
  const [rsvps, setRsvps] = useState<RsvpRecord[]>([]);
  const [rsvpError, setRsvpError] = useState("");
  const [channels, setChannels] = useState<ChatChannelRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventDebugMessage, setEventDebugMessage] = useState("");
  const [eventFetchError, setEventFetchError] = useState("");
  const [scheduleImporting, setScheduleImporting] = useState(false);
  const [scheduleImportMessage, setScheduleImportMessage] = useState("");
  const [detectedScheduleEvents, setDetectedScheduleEvents] = useState<ScheduleImportEvent[]>([]);
  const [insertedScheduleRows, setInsertedScheduleRows] = useState<StaffEventRecord[]>([]);
  const [coachSyncing, setCoachSyncing] = useState(false);
  const [coachSyncResult, setCoachSyncResult] = useState<SyncCoachesResult | null>(null);
  const [coachSyncMessage, setCoachSyncMessage] = useState("");
  const [coachDebugLoading, setCoachDebugLoading] = useState(false);
  const [coachDebugResult, setCoachDebugResult] = useState<CoachDirectoryDebugResult | null>(null);
  const [coachDebugMessage, setCoachDebugMessage] = useState("");
  const [calendarView, setCalendarView] = useState<CalendarView>("Month");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(initialEventForm);
  const [announcementBody, setAnnouncementBody] = useState("");
  const [coachForm, setCoachForm] = useState({ fullName: "", email: "", role: "Varsity Coach" as CoachRole, group: "" as PositionGroup | "" });
  const [coachEdits, setCoachEdits] = useState<Record<string, { fullName: string; positionGroup: PositionGroup | "" }>>({});
  const [profileName, setProfileName] = useState("");
  const [profilePositionGroup, setProfilePositionGroup] = useState<PositionGroup | "">("");
  const [channelName, setChannelName] = useState<StaffChannel>("General Staff");
  const [messageBody, setMessageBody] = useState("");

  const isConfigured = Boolean(supabase);
  const isAdmin = currentCoach?.role === "Admin" && currentCoach.active;
  const profilesMissingFromCoaches = useMemo(() => {
    return profiles.filter((profile) => {
      const profileEmail = normalizeEmail(profile.email);
      return !coaches.some((coach) => coach.auth_user_id === profile.id || (profileEmail && normalizeEmail(coach.email) === profileEmail));
    });
  }, [coaches, profiles]);

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.name === channelName) ?? channels[0],
    [channelName, channels]
  );

  const fetchEvents = useCallback(async (client: NonNullable<typeof supabase>) => {
    console.log("CoachHub fetchEvents before query", {
      schema: "public",
      table: "events",
      columns: "id,title,description,date,created_at",
      order: "date.asc"
    });

    const { data, error } = await client
      .schema("public")
      .from("events")
      .select("id,title,description,date,created_at")
      .order("date", { ascending: true });

    console.log("CoachHub fetchEvents after query", { data, error });

    if (error) {
      const message = `Events fetch failed: ${error.message}`;
      setEventFetchError(message);
      return [];
    }

    const rows = (data ?? []) as StaffEventRecord[];
    setEvents(rows);
    setEventFetchError("");
    return rows;
  }, []);

  const loadData = useCallback(async (activeSession: Session | null) => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      return;
    }

    setLoading(true);
    await fetchEvents(client);

    if (!activeSession) {
      setLoading(false);
      return;
    }

    const sessionEmail = activeSession.user.email;

    if (sessionEmail) {
      await client.rpc("claim_my_coach_profile");
    }

    const [
      profileResult,
      profilesResult,
      coachesResult,
      rsvpsResult,
      channelsResult,
      messagesResult,
      announcementsResult
    ] = await Promise.all([
      client.from("profiles").select("id,full_name,email,position_group,created_at").eq("id", activeSession.user.id).maybeSingle(),
      client.from("profiles").select("id,full_name,email,position_group,created_at"),
      client.from("coaches").select("*").order("created_at", { ascending: true }),
      client.schema("public").from("rsvps").select("id,event_id,user_id,coach_name,response,created_at"),
      client.from("chat_channels").select("*").order("name", { ascending: true }),
      client.from("chat_messages").select("id,channel_id,user_id,coach_name,message,created_at").order("created_at", { ascending: true }),
      client.from("announcements").select("*").order("created_at", { ascending: false }).limit(8)
    ]);

    await client.from("chat_channels").upsert(defaultChannels.map((name) => ({ name })), { onConflict: "name" });
    const refreshedChannels = await client.from("chat_channels").select("*").in("name", defaultChannels);
    const orderedChannels = defaultChannels
      .map((name) => ((refreshedChannels.data ?? []) as ChatChannelRecord[]).find((channel) => channel.name === name))
      .filter(Boolean) as ChatChannelRecord[];
    setChannels(orderedChannels);

    const coachRows = (coachesResult.data ?? []) as CoachAccount[];
    const profileRows = (profilesResult.data ?? []) as CoachProfile[];
    setCoaches(coachRows);
    setProfiles(profileRows);
    setRsvps((rsvpsResult.data ?? []) as RsvpRecord[]);
    setMessages((messagesResult.data ?? []) as ChatMessageRecord[]);
    setAnnouncements((announcementsResult.data ?? []) as AnnouncementRecord[]);

    const userEmail = normalizeEmail(activeSession.user.email);
    const coachAccount =
      coachRows.find((coach) => coach.auth_user_id === activeSession.user.id) ??
      coachRows.find((coach) => normalizeEmail(coach.email) === userEmail) ??
      null;
    const profile = (profileResult.data as CoachProfile | null) ?? null;
    let resolvedCoachAccount = coachAccount;
    if (profile?.position_group && activeSession.access_token && (!resolvedCoachAccount || !resolvedCoachAccount.auth_user_id)) {
      try {
        const ensuredAccount = await ensureCoachAccount(profile.full_name, profile.position_group, activeSession.access_token);
        if (ensuredAccount.coach) {
          resolvedCoachAccount = ensuredAccount.coach;
          setCoaches((existingCoaches) => {
            const nextCoaches = [
              ...existingCoaches.filter((coach) => coach.id !== ensuredAccount.coach?.id),
              ensuredAccount.coach
            ];
            return (nextCoaches.filter(Boolean) as CoachAccount[]).sort((a, b) => a.created_at.localeCompare(b.created_at));
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Coach directory sync failed.";
        console.warn("CoachHub ensure coach account failed", error);
        setStatus(`Coach directory sync failed: ${message}`);
      }
    }

    setCurrentCoach(resolvedCoachAccount);
    setCurrentProfile(profile);
    setProfileName(profile?.full_name ?? resolvedCoachAccount?.full_name ?? "");
    setProfilePositionGroup(profile?.position_group ?? (resolvedCoachAccount?.position_group as PositionGroup | null) ?? "");

    const firstError = profileResult.error || profilesResult.error || coachesResult.error || rsvpsResult.error || channelsResult.error || messagesResult.error || announcementsResult.error;
    if (firstError) {
      setStatus(firstError.message);
    } else if (!profile) {
      setStatus("Complete your profile so attendance responses can attach to your coach name.");
    } else if (!resolvedCoachAccount) {
      setStatus("Signed in as a coach. Admin features require staff role assignment.");
    } else {
      setStatus("");
    }

    setLoading(false);
  }, [fetchEvents]);

  useEffect(() => {
    const client = supabase;
    if (!client) {
      setLoading(false);
      setStatus("Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart Next.js.");
      return;
    }

    void fetchEvents(client);

    client.auth.getSession().then(({ data }) => {
      setSession(data.session);
      void loadData(data.session);
    });

    const { data: authListener } = client.auth.onAuthStateChange((_event, activeSession) => {
      setSession(activeSession);
      setCurrentCoach(null);
      setCurrentProfile(null);
      void loadData(activeSession);
    });

    return () => authListener.subscription.unsubscribe();
  }, [fetchEvents, loadData]);

  useEffect(() => {
    const client = supabase;
    if (!client || !session) return;

    const channel = client
      .channel("coachhub-persistent-data")
      .on("postgres_changes", { event: "*", schema: "public", table: "events" }, () => void fetchEvents(client))
      .on("postgres_changes", { event: "*", schema: "public", table: "rsvps" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "coaches" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => void loadData(session))
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchEvents, loadData, session]);

  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.date).getTime() >= Date.now() - 86400000),
    [events]
  );

  const coachName = currentProfile?.full_name ?? currentCoach?.full_name ?? session?.user.email ?? "Coach";
  const needsProfile = Boolean(session && (!currentProfile || !currentProfile.position_group));

  const eventAttendanceDetails = useCallback((eventId: string) => {
    const formatCoachName = (name: string, coach?: CoachAccount | null, profile?: CoachProfile | null) => {
      const suffix = coach?.position_group || profile?.position_group;
      return suffix ? `${name} - ${suffix}` : name;
    };

    const coachForRsvp = (record: RsvpRecord) => {
      const responseName = normalizeEmail(record.coach_name);
      const profile = profiles.find((coachProfile) => coachProfile.id === record.user_id);
      return coaches.find((coach) => coach.auth_user_id === record.user_id) ??
        coaches.find((coach) => normalizeEmail(coach.email) === normalizeEmail(profile?.email)) ??
        coaches.find((coach) => normalizeEmail(coach.full_name) === responseName) ??
        null;
    };

    const profileForRsvp = (record: RsvpRecord) => {
      const responseName = normalizeEmail(record.coach_name);
      return profiles.find((profile) => profile.id === record.user_id) ??
        profiles.find((profile) => normalizeEmail(profile.full_name) === responseName) ??
        null;
    };

    const profileForCoach = (coach: CoachAccount) => {
      return profiles.find((profile) => normalizeEmail(profile.email) === normalizeEmail(coach.email)) ?? null;
    };

    const activeCoachForRsvp = (record: RsvpRecord) => {
      const coach = coachForRsvp(record);
      return coach?.active ? coach : null;
    };

    const uniqueNames = (records: RsvpRecord[]) => {
      const names = new Map<string, string>();
      records.forEach((record) => {
        const coach = coachForRsvp(record);
        const profile = profileForRsvp(record);
        const name = record.coach_name?.trim() || "Coach";
        names.set(record.user_id || normalizeEmail(name), formatCoachName(name, coach, profile));
      });
      return Array.from(names.values()).sort((a, b) => a.localeCompare(b));
    };

    const eventRsvps = rsvps.filter((rsvp) => rsvp.event_id === eventId);
    const activeRsvps = eventRsvps.filter((rsvp) => activeCoachForRsvp(rsvp));
    const attending = uniqueNames(activeRsvps.filter((rsvp) => rsvp.response === "Yes"));
    const notAttending = uniqueNames(activeRsvps.filter((rsvp) => rsvp.response === "No"));
    const respondedUserIds = new Set(activeRsvps.map((rsvp) => rsvp.user_id).filter(Boolean));
    const respondedNames = new Set(activeRsvps.map((rsvp) => normalizeEmail(rsvp.coach_name)).filter(Boolean));
    const activeCoaches = coaches.filter((coach) => coach.active);
    const noResponse = activeCoaches
      .filter((coach) => {
        const coachUserId = coachAccountUserId(coach, profiles, session);
        if (coachUserId && respondedUserIds.has(coachUserId)) return false;
        return !respondedNames.has(normalizeEmail(coach.full_name));
      })
      .map((coach) => formatCoachName(coach.full_name, coach, profileForCoach(coach)))
      .sort((a, b) => a.localeCompare(b));

    return {
      attending,
      notAttending,
      noResponse,
      totalCoaches: attending.length + notAttending.length + noResponse.length
    };
  }, [coaches, profiles, rsvps, session]);

  const myRsvp = useCallback((eventId: string): RSVPStatus | null => {
    return rsvps.find((rsvp) => rsvp.event_id === eventId && rsvp.user_id === session?.user.id)?.response ?? null;
  }, [rsvps, session?.user.id]);

  async function login(email: string, password: string) {
    const client = supabase;
    if (!client) return;
    setStatus("Signing in...");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setStatus(error ? error.message : "Signed in.");
  }

  async function ensureCoachAccount(fullName: string, positionGroup: PositionGroup, token: string) {
    const response = await fetch("/api/ensure-coach-account", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ fullName, positionGroup })
    });
    const result = (await response.json()) as { coach?: CoachAccount; profile?: CoachProfile; error?: string };

    if (!response.ok || result.error) {
      throw new Error(result.error ?? "Coach account save failed.");
    }

    return {
      coach: result.coach ?? null,
      profile: result.profile ?? null
    };
  }

  async function signUpCoach(input: SignUpInput) {
    const client = supabase;
    if (!client) return;

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const positionGroup = input.positionGroup;
    const email = input.email.trim();

    if (!firstName || !lastName || !positionGroup || !email || !input.password) {
      setStatus("First name, last name, position group, email, and password are required.");
      return;
    }

    setStatus("Creating coach account...");
    const { data, error } = await client.auth.signUp({
      email,
      password: input.password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: fullName,
          position_group: positionGroup
        }
      }
    });

    if (error) {
      setStatus(error.message);
      return;
    }

    let activeSession = data.session;
    if (!activeSession) {
      const loginResult = await client.auth.signInWithPassword({ email, password: input.password });
      if (loginResult.error) {
        setStatus("Account created. Check your email to confirm the account, then sign in.");
        return;
      }
      activeSession = loginResult.data.session;
    }

    const userId = activeSession?.user.id ?? data.user?.id;
    if (!userId) {
      setStatus("Account created. Sign in to finish your profile.");
      return;
    }

    let coachRecord: CoachAccount | null = null;
    let profileRecord: CoachProfile | null = null;
    if (activeSession?.access_token) {
      try {
        const ensuredAccount = await ensureCoachAccount(fullName, positionGroup, activeSession.access_token);
        coachRecord = ensuredAccount.coach;
        profileRecord = ensuredAccount.profile;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Profile and coach directory save failed.";
        setStatus(`Account created, but profile sync failed: ${message}`);
        return;
      }
    }

    setSession(activeSession);
    setCurrentProfile(profileRecord);
    setCurrentCoach(coachRecord);
    setProfileName(fullName);
    setProfilePositionGroup(positionGroup);
    setStatus("Coach account created.");
    await loadData(activeSession);
  }

  async function resetPassword(email: string) {
    const client = supabase;
    if (!client) return;
    if (!email) {
      setStatus("Enter your email before requesting a reset.");
      return;
    }
    const { error } = await client.auth.resetPasswordForEmail(email);
    setStatus(error ? error.message : "Password reset email sent.");
  }

  async function logout() {
    const client = supabase;
    if (!client) return;
    await client.auth.signOut();
    setSession(null);
    setCurrentCoach(null);
    setCurrentProfile(null);
    setProfiles([]);
  }

  async function completeProfile(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    const user = session?.user;
    const fullName = profileName.trim();
    const positionGroup = profilePositionGroup;

    if (!client || !user) {
      setStatus("Sign in before completing your profile.");
      return;
    }
    if (!fullName || !positionGroup) {
      setStatus("Enter your full name and position group.");
      return;
    }

    let coachRecord: CoachAccount | null = null;
    let profileRecord: CoachProfile | null = null;
    if (session.access_token) {
      try {
        const ensuredAccount = await ensureCoachAccount(fullName, positionGroup, session.access_token);
        coachRecord = ensuredAccount.coach;
        profileRecord = ensuredAccount.profile;
      } catch (ensureError) {
        const message = ensureError instanceof Error ? ensureError.message : "Profile and coach directory save failed.";
        setStatus(`Profile save failed: ${message}`);
        return;
      }
    }

    setCurrentProfile(profileRecord);
    if (coachRecord) setCurrentCoach(coachRecord);
    setProfileName(fullName);
    setProfilePositionGroup(positionGroup);
    setStatus("Profile saved.");
    await loadData(session);
  }

  async function createEvent(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    setEventDebugMessage("Create event clicked.");

    if (!client) {
      const message = "Supabase is not configured.";
      setStatus(message);
      setEventDebugMessage(message);
      return;
    }
    if (!eventForm.title || !eventForm.date || !eventForm.time) {
      const message = "Title, date, and time are required.";
      setStatus(message);
      setEventDebugMessage(message);
      return;
    }

    const eventDate = new Date(`${eventForm.date}T${eventForm.time}`);
    if (Number.isNaN(eventDate.getTime())) {
      const message = "Enter a valid event date and time.";
      setStatus(message);
      setEventDebugMessage(message);
      return;
    }

    const description = [eventForm.location, eventForm.notes].filter(Boolean).join("\n\n");
    const payload = {
      title: eventForm.title,
      description,
      date: eventDate.toISOString()
    };

    setEventSubmitting(true);
    setStatus("Creating event...");
    setEventDebugMessage("Creating event...");
    console.log("CoachHub createEvent before insert", payload);

    try {
      const { data, error } = await client.schema("public").from("events").insert(payload).select("id,title,description,date,created_at").single();
      console.log("CoachHub createEvent after insert", { data, error });

      if (error) {
        const message = `Event insert failed: ${error.message}`;
        setStatus(message);
        setEventDebugMessage(message);
        return;
      }

      setEventForm(initialEventForm);
      if (data) {
        const insertedEvent = data as StaffEventRecord;
        setEvents((existingEvents) =>
          [...existingEvents.filter((existingEvent) => existingEvent.id !== insertedEvent.id), insertedEvent].sort(
            (firstEvent, secondEvent) => new Date(firstEvent.date).getTime() - new Date(secondEvent.date).getTime()
          )
        );
      }
      await fetchEvents(client);
      setStatus("Event created");
      setEventDebugMessage("Event created");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown event insert error.";
      console.log("CoachHub createEvent exception", error);
      setStatus(message);
      setEventDebugMessage(message);
    } finally {
      setEventSubmitting(false);
    }
  }

  async function importSummerSchedule() {
    const client = supabase;
    const token = session?.access_token;
    if (!client) {
      setScheduleImportMessage("Supabase is not configured.");
      return;
    }
    if (!token) {
      setScheduleImportMessage("Sign in before importing the Week 1 schedule.");
      return;
    }

    setScheduleImporting(true);
    setScheduleImportMessage("Parsing Week 1 schedule PDF...");
    setInsertedScheduleRows([]);

    try {
      const response = await fetch("/api/import-week1-schedule", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = (await response.json()) as {
        error?: string;
        detectedEvents?: ScheduleImportEvent[];
        insertedRows?: StaffEventRecord[];
        verifiedRows?: StaffEventRecord[];
        deletedRows?: number;
      };

      if (!response.ok || result.error) {
        setScheduleImportMessage(`Schedule import failed: ${result.error ?? response.statusText}`);
        return;
      }

      const detectedRows = result.detectedEvents ?? [];
      const savedRows = result.insertedRows ?? [];
      setDetectedScheduleEvents(detectedRows);
      setInsertedScheduleRows(savedRows);
      console.log("CoachHub parsed Week 1 PDF events", detectedRows);
      console.log("CoachHub inserted Week 1 event rows", savedRows);
      await fetchEvents(client);
      setScheduleImportMessage(`Inserted ${savedRows.length} Week 1 rows into public.events. Verified ${result.verifiedRows?.length ?? 0} Week 1 rows in the table. Removed ${result.deletedRows ?? 0} existing row${result.deletedRows === 1 ? "" : "s"}.`);
    } catch (error) {
      setScheduleImportMessage(error instanceof Error ? error.message : "Unknown schedule import error.");
    } finally {
      setScheduleImporting(false);
    }
  }

  async function respondToEvent(eventId: string, response: RSVPStatus) {
    const client = supabase;
    const user = session?.user;
    if (!client) {
      setRsvpError("Supabase is not configured.");
      return;
    }
    if (!user) {
      setRsvpError("Sign in before saving attendance.");
      return;
    }
    if (!currentProfile) {
      setRsvpError("Complete your profile before saving attendance.");
      setStatus("Complete your profile before saving attendance.");
      return;
    }

    const payload = {
      event_id: eventId,
      user_id: user.id,
      coach_name: currentProfile.full_name,
      response
    };

    const { data, error } = await client
      .schema("public")
      .from("rsvps")
      .upsert(payload, { onConflict: "event_id,user_id" })
      .select("id,event_id,user_id,coach_name,response,created_at")
      .single();

    if (error) {
      const message = `Attendance save failed: ${error.message}`;
      setRsvpError(message);
      setStatus(message);
      return;
    }

    setRsvpError("");
    setStatus("Attendance saved.");
    if (data) {
      const savedRsvp = data as RsvpRecord;
      setRsvps((existingRsvps) => [
        ...existingRsvps.filter((rsvp) => !(rsvp.event_id === savedRsvp.event_id && rsvp.user_id === savedRsvp.user_id)),
        savedRsvp
      ]);
    }
  }

  async function postAnnouncement(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    if (!client || !currentCoach || !isAdmin || !announcementBody.trim()) return;
    const { error } = await client.from("announcements").insert({ body: announcementBody.trim(), created_by: currentCoach.id });
    setStatus(error ? error.message : "Announcement saved.");
    if (!error) setAnnouncementBody("");
    await loadData(session);
  }

  async function inviteCoach(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    if (!client || !currentCoach || !isAdmin) return;
    if (!coachForm.group) {
      setStatus("Choose a position group before inviting a coach.");
      return;
    }
    const token = session?.access_token;
    if (!token) return;
    const response = await fetch("/api/invite-coach", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        fullName: coachForm.fullName,
        email: coachForm.email,
        role: coachForm.role,
        positionGroup: coachForm.group
      })
    });
    const result = (await response.json()) as { error?: string };
    const error = result.error;
    setStatus(error ? error : "Coach account created and Supabase Auth invite sent.");
    if (!error) setCoachForm({ fullName: "", email: "", role: "Varsity Coach", group: "" });
    await loadData(session);
  }

  async function syncCoachesFromProfiles() {
    const token = session?.access_token;
    if (!token || !isAdmin) {
      setCoachSyncMessage("Only an active Admin coach can sync the coach directory.");
      return;
    }

    setCoachSyncing(true);
    setCoachSyncMessage("Syncing profiles into Coach Accounts...");
    setCoachSyncResult(null);

    try {
      const response = await fetch("/api/sync-coaches", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = (await response.json()) as Partial<SyncCoachesResult> & { error?: string };

      if (!response.ok || result.error) {
        setCoachSyncMessage(`Coach sync failed: ${result.error ?? response.statusText}`);
        return;
      }

      const syncResult = result as SyncCoachesResult;
      setCoachSyncResult(syncResult);
      setCoachSyncMessage(`Synced ${syncResult.syncedCoachesCount} coach${syncResult.syncedCoachesCount === 1 ? "" : "es"}. Existing before sync: ${syncResult.existingCoachesCount}.`);
      setCoachDebugResult({
        authUsersCount: syncResult.authUsersCount,
        profilesCount: syncResult.profilesCount,
        coachesCount: syncResult.coachesCount,
        authUserEmails: syncResult.authUserEmails ?? [],
        profileEmails: syncResult.profileEmails ?? [],
        coachEmails: syncResult.coachEmails ?? [],
        errors: syncResult.errors
      });
      await loadData(session);
    } catch (error) {
      setCoachSyncMessage(error instanceof Error ? `Coach sync failed: ${error.message}` : "Coach sync failed.");
    } finally {
      setCoachSyncing(false);
    }
  }

  async function refreshCoachDirectoryDebug() {
    const token = session?.access_token;
    if (!token || !isAdmin) {
      setCoachDebugMessage("Only an active Admin coach can view directory debug data.");
      return;
    }

    setCoachDebugLoading(true);
    setCoachDebugMessage("Reading Supabase Auth users, profiles, and coaches...");

    try {
      const response = await fetch("/api/coach-directory-debug", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const result = (await response.json()) as Partial<CoachDirectoryDebugResult> & { error?: string };

      if (!response.ok || result.error) {
        setCoachDebugMessage(`Directory debug failed: ${result.error ?? response.statusText}`);
        return;
      }

      setCoachDebugResult(result as CoachDirectoryDebugResult);
      setCoachDebugMessage("Directory debug refreshed.");
    } catch (error) {
      setCoachDebugMessage(error instanceof Error ? `Directory debug failed: ${error.message}` : "Directory debug failed.");
    } finally {
      setCoachDebugLoading(false);
    }
  }

  async function updateCoachActive(coach: CoachAccount, active: boolean) {
    const client = supabase;
    if (!client || !isAdmin) return;

    const { error } = await client
      .from("coaches")
      .update({ active })
      .eq("id", coach.id);

    if (error) {
      setStatus(`Coach status update failed: ${error.message}`);
      return;
    }

    setCoaches((existingCoaches) =>
      existingCoaches.map((existingCoach) =>
        existingCoach.id === coach.id ? { ...existingCoach, active } : existingCoach
      )
    );
    setStatus(`${coach.full_name} marked ${active ? "active" : "inactive"}.`);
    await loadData(session);
  }

  async function updateCoachDirectoryDetails(coach: CoachAccount) {
    const client = supabase;
    if (!client || !isAdmin) return;

    const edit = coachEdits[coach.id];
    const fullName = edit?.fullName.trim() || coach.full_name;
    const positionGroup = edit?.positionGroup || (coach.position_group as PositionGroup | null);

    if (!fullName || !positionGroup) {
      setStatus("Coach name and position group are required.");
      return;
    }

    const { data, error } = await client
      .from("coaches")
      .update({
        full_name: fullName,
        position_group: positionGroup
      })
      .eq("id", coach.id)
      .select("*")
      .single();

    if (error) {
      setStatus(`Coach update failed: ${error.message}`);
      return;
    }

    await client
      .from("profiles")
      .update({
        full_name: fullName,
        position_group: positionGroup
      })
      .eq("email", coach.email);

    const updatedCoach = data as CoachAccount;
    setCoaches((existingCoaches) =>
      existingCoaches.map((existingCoach) =>
        existingCoach.id === updatedCoach.id ? updatedCoach : existingCoach
      )
    );
    setCoachEdits((existingEdits) => {
      const nextEdits = { ...existingEdits };
      delete nextEdits[coach.id];
      return nextEdits;
    });
    setStatus(`${fullName} updated.`);
    await loadData(session);
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    const user = session?.user;
    if (!client || !user || !selectedChannel || !messageBody.trim()) return;
    if (!currentProfile) {
      setStatus("Complete your profile before sending chat messages.");
      return;
    }
    const { error } = await client.from("chat_messages").insert({
      channel_id: selectedChannel.id,
      user_id: user.id,
      coach_name: currentProfile.full_name,
      message: messageBody.trim()
    });
    setStatus(error ? error.message : "Message saved.");
    if (!error) {
      setMessageBody("");
    }
    await loadData(session);
  }

  const currentMessages = useMemo(
    () => messages.filter((message) => message.channel_id === selectedChannel?.id),
    [messages, selectedChannel]
  );

  const eventsByDate = useMemo(() => {
    return events.reduce<Record<string, StaffEventRecord[]>>((groupedEvents, event) => {
      const key = dateKey(event.date);
      groupedEvents[key] = [...(groupedEvents[key] ?? []), event];
      groupedEvents[key].sort((firstEvent, secondEvent) => new Date(firstEvent.date).getTime() - new Date(secondEvent.date).getTime());
      return groupedEvents;
    }, {});
  }, [events]);

  const monthDays = useMemo(() => calendarMonthDays(calendarMonth), [calendarMonth]);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(new Date(selectedDateKey)), index)), [selectedDateKey]);
  const selectedDateEvents = eventsByDate[selectedDateKey] ?? [];
  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? selectedDateEvents[0] ?? upcomingEvents[0] ?? events[0] ?? null,
    [events, selectedDateEvents, selectedEventId, upcomingEvents]
  );

  const teamName = "Erie Football";
  const pageTitle = section === "Home" ? "Staff Dashboard" : section;
  const coachEmail = currentProfile?.email ?? currentCoach?.email ?? session?.user.email ?? "";
  const coachPositionGroup = currentProfile?.position_group ?? currentCoach?.position_group ?? "";
  const nextEvent = upcomingEvents[0];
  const myCompletedRsvps = events.filter((event) => Boolean(myRsvp(event.id))).length;
  const myPendingRsvps = Math.max(events.length - myCompletedRsvps, 0);
  const coachRole = coachRoleLabel(currentCoach);
  const currentCoachStatus = coachAccountStatus(currentCoach, profiles, session);
  const schedulePreviewRows = detectedScheduleEvents.length ? detectedScheduleEvents : summerWeekOneSchedule;
  const availabilitySummary = useMemo(() => {
    return events.reduce(
      (summary, event) => {
        const attendance = eventAttendanceDetails(event.id);
        return {
          attending: summary.attending + attendance.attending.length,
          notAttending: summary.notAttending + attendance.notAttending.length,
          noResponse: summary.noResponse + attendance.noResponse.length,
          totalCoaches: summary.totalCoaches + attendance.totalCoaches
        };
      },
      { attending: 0, notAttending: 0, noResponse: 0, totalCoaches: 0 }
    );
  }, [eventAttendanceDetails, events]);

  return (
    <main className="field-markings min-h-screen pb-24 lg:pb-6">
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-lg border border-line bg-black/90 p-4 backdrop-blur lg:flex">
          <div>
            <ErieLogo className="h-14 w-full" />
            <div className="mt-4 border-l-4 border-orange pl-3">
              <h1 className="text-lg font-black uppercase tracking-wide">CoachHub</h1>
              <p className="text-xs font-bold uppercase tracking-wide text-white/45">Erie Staff Only</p>
            </div>
          </div>
          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => (
              <button key={item} onClick={() => setSection(item)} className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-left font-bold ${section === item ? "bg-orange text-ink" : "text-white/70 hover:bg-white/10"}`}>
                <Icon name={item} />
                {item}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border border-line bg-graphite/70 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-xs font-bold uppercase tracking-wide text-white/40">{coachRole}</p>
              {session && <span className="rounded-full bg-orange/15 px-2 py-0.5 text-[10px] font-black uppercase text-orange ring-1 ring-orange/30">{currentCoachStatus}</span>}
            </div>
            <p className="mt-1 font-black">{coachName}</p>
            {coachPositionGroup && <p className="text-xs font-black uppercase tracking-wide text-orange">{coachPositionGroup}</p>}
            {coachEmail && <p className="truncate text-xs font-bold text-white/45">{coachEmail}</p>}
            <p className="text-sm text-white/50">{teamName}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-lg border border-line bg-black/85 p-4 backdrop-blur">
            <h1 className="truncate text-2xl font-black sm:text-3xl">{pageTitle}</h1>
            {!isConfigured && <p className="mt-3 rounded-lg border border-orange/30 bg-orange/10 p-3 text-sm font-bold text-orange">Supabase env vars are missing. Add `.env.local` values and restart the app.</p>}
            {loading && <p className="mt-3 rounded-lg bg-white/10 p-3 text-sm text-white/70">Loading persistent staff data...</p>}
            {status && <p className="mt-3 rounded-lg bg-graphite/80 p-3 text-sm text-white/70">{status}</p>}
          </header>

          {needsProfile && (
            <form onSubmit={completeProfile} className="mb-4 rounded-lg border border-orange/30 bg-charcoal/95 p-4 shadow-glow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-orange">Complete Profile</label>
                  <p className="mt-1 text-sm text-white/60">Enter your full name and position group once. Attendance responses will use this coach profile automatically.</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="min-h-12 w-full rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Coach full name" required />
                    <select value={profilePositionGroup} onChange={(event) => setProfilePositionGroup(event.target.value as PositionGroup)} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 focus:ring-2" required>
                      <option value="">Position Group</option>
                      {positionGroups.map((group) => <option key={group}>{group}</option>)}
                    </select>
                  </div>
                </div>
                <button className="min-h-12 rounded-lg bg-orange px-5 font-black text-ink">Save Profile</button>
              </div>
            </form>
          )}

          {section === "Home" && (
            <div className="grid gap-4 lg:grid-cols-[1.25fr_0.75fr]">
              <div className="space-y-4">
                {session ? (
                  <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-orange">Welcome Back</p>
                    <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <h2 className="text-2xl font-black">{coachName}</h2>
                        {coachPositionGroup && <p className="mt-1 text-sm font-black text-orange">{coachName} - {coachPositionGroup}</p>}
                        <p className="mt-1 text-sm font-bold text-white/55">{coachRole} - {currentCoachStatus} - {teamName}</p>
                        {coachEmail && <p className="mt-1 text-sm text-white/50">{coachEmail}</p>}
                      </div>
                      <button onClick={logout} className="min-h-10 rounded-lg border border-line px-4 text-sm font-bold text-white/80">Sign Out</button>
                    </div>
                  </section>
                ) : (
                  <LoginPanel status={status} onLogin={login} onSignUp={signUpCoach} onReset={resetPassword} />
                )}
                <section className="rounded-lg border border-orange/30 bg-charcoal/95 p-4 shadow-glow">
                  {nextEvent ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-orange">Next Required Attendance</p>
                          <h2 className="mt-2 text-3xl font-black">{nextEvent.title}</h2>
                          <p className="mt-1 text-base font-bold text-white/65">{formatDateTime(nextEvent.date)}</p>
                        </div>
                        <RsvpSelection response={myRsvp(nextEvent.id)} />
                      </div>
                      <div className="mt-5 grid grid-cols-2 gap-2">
                        {(["Yes", "No"] as RSVPStatus[]).map((response) => (
                          <button key={response} onClick={() => respondToEvent(nextEvent.id, response)} className={`min-h-14 rounded-lg text-base font-black ring-1 ${statusStyles[response]}`}>{attendanceLabels[response]}</button>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-white/70">No upcoming events yet. Admins can create one from Attendance.</p>
                  )}
                </section>
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {quickLinks.map((item) => (
                    <button key={item} onClick={() => setSection(item)} className="min-h-24 rounded-lg border border-line bg-charcoal/90 p-3 text-left transition hover:border-orange/60">
                      <Icon name={item} />
                      <span className="mt-3 block text-sm font-black">{item}</span>
                    </button>
                  ))}
                </section>
              </div>
              <div className="space-y-4">
                <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                  <h2 className="text-lg font-black">Attendance Summary</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Metric label="My Attendance Completed" value={`${myCompletedRsvps}`} tone="text-orange" />
                    <Metric label="No Response" value={`${myPendingRsvps}`} tone={myPendingRsvps ? "text-red-200" : "text-orange"} />
                    <Metric label="Total Events" value={`${events.length}`} />
                  </div>
                </section>
                <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                  <h2 className="text-lg font-black">Announcements</h2>
                  <div className="mt-3 space-y-3">
                    {announcements.length ? announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-lg bg-graphite/70 p-3 text-sm text-white/75">{announcement.body}</div>
                    )) : <p className="text-sm text-white/60">No announcements yet.</p>}
                  </div>
                </section>
              </div>
            </div>
          )}

          {section === "Attendance" && (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <form onSubmit={createEvent} className="rounded-lg border border-line bg-charcoal/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Create Event</h2>
                  <button type="submit" disabled={eventSubmitting} className="grid h-11 w-11 place-items-center rounded-lg bg-orange text-ink disabled:cursor-wait disabled:opacity-60" title="Create event">
                    {eventSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> : <Icon name="Plus" />}
                  </button>
                </div>
                {eventDebugMessage && <p className="mt-3 rounded-lg border border-line bg-graphite/80 p-3 text-sm font-bold text-white/80">{eventDebugMessage}</p>}
                <div className="mt-4 grid gap-3">
                  <input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Title" required />
                  <select value={eventForm.eventType} onChange={(event) => setEventForm({ ...eventForm, eventType: event.target.value as EventType })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 focus:ring-2">
                    {eventTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 focus:ring-2" type="date" required />
                    <input value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 focus:ring-2" type="time" required />
                  </div>
                  <input value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Location" />
                  <textarea value={eventForm.notes} onChange={(event) => setEventForm({ ...eventForm, notes: event.target.value })} className="min-h-24 rounded-lg border border-line bg-graphite/80 px-4 py-3 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Notes" />
                  <label className="flex min-h-12 items-center justify-between rounded-lg border border-line bg-graphite/80 px-4 text-sm font-bold">
                    Require attendance responses
                    <input checked={eventForm.rsvpRequired} onChange={(event) => setEventForm({ ...eventForm, rsvpRequired: event.target.checked })} type="checkbox" className="h-5 w-5 accent-orange" />
                  </label>
                </div>
              </form>
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <h2 className="text-xl font-black">Coach Availability</h2>
                <p className="mt-1 text-xs font-black uppercase tracking-wide text-white/45">Counting active coaches only</p>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div className="rounded-lg border border-green-500/25 bg-green-500/10 px-3 py-2">
                    <div className="text-lg font-black text-green-300">{availabilitySummary.attending}</div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-green-200/70">Attending</div>
                  </div>
                  <div className="rounded-lg border border-red-400/25 bg-red-500/10 px-3 py-2">
                    <div className="text-lg font-black text-red-200">{availabilitySummary.notAttending}</div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-red-100/70">Not Attending</div>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/5 px-3 py-2">
                    <div className="text-lg font-black text-white/75">{availabilitySummary.noResponse}</div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-white/45">No Response</div>
                  </div>
                  <div className="rounded-lg border border-line bg-graphite/70 px-3 py-2">
                    <div className="text-lg font-black text-white">{availabilitySummary.totalCoaches}</div>
                    <div className="text-[11px] font-black uppercase tracking-wide text-white/45">Total Coaches</div>
                  </div>
                </div>
                <div className="mt-4 space-y-3">
                  {eventFetchError && <p className="rounded-lg border border-red-400/30 bg-red-500/15 p-4 text-sm font-bold text-red-100">{eventFetchError}</p>}
                  {rsvpError && <p className="rounded-lg border border-red-400/30 bg-red-500/15 p-4 text-sm font-bold text-red-100">{rsvpError}</p>}
                  {!eventFetchError && events.length === 0 && <p className="rounded-lg bg-graphite/70 p-4 text-sm text-white/70">No events exist yet. Create one with the form and it will appear here after Supabase saves it.</p>}
                  {events.map((event) => {
                    const attendance = eventAttendanceDetails(event.id);

                    return (
                      <div key={event.id} className="rounded-lg border border-line bg-graphite/65 p-3">
                        <div className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-start">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black">{event.title}</h3>
                              <RsvpSelection response={myRsvp(event.id)} />
                            </div>
                            <p className="mt-1 text-sm font-bold text-white/60">{formatDateTime(event.date)}</p>
                            <p className="mt-1 text-xs font-bold uppercase tracking-wide text-white/40">Location: {eventLocation(event)}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:w-48">
                            {(["Yes", "No"] as RSVPStatus[]).map((response) => (
                              <button key={response} onClick={() => respondToEvent(event.id, response)} className={`min-h-10 rounded-lg text-sm font-black ring-1 ${statusStyles[response]}`}>{attendanceLabels[response]}</button>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-3">
                          {[
                            { label: "Attending", names: attendance.attending, accent: "border-green-500/30 bg-green-500/10", tone: "text-green-300" },
                            { label: "Not Attending", names: attendance.notAttending, accent: "border-red-400/30 bg-red-500/10", tone: "text-red-200" },
                            { label: "No Response", names: attendance.noResponse, accent: "border-white/15 bg-white/5", tone: "text-white/60" }
                          ].map((group) => (
                            <div key={group.label} className={`rounded-lg border px-3 py-2 ${group.accent}`}>
                              <div className={`flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide ${group.tone}`}>
                                <span>{group.label}</span>
                                <span>{group.names.length}</span>
                              </div>
                              <div className="mt-1.5 space-y-0.5">
                                {group.names.length ? group.names.map((name) => (
                                  <div key={name} className="truncate text-sm font-bold text-white/75">{name}</div>
                                )) : <div className="text-sm text-white/35">None</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 grid grid-cols-2 gap-1.5 text-center text-[11px] font-black uppercase tracking-wide sm:grid-cols-4">
                          <div className="rounded-md bg-green-500/10 px-2 py-1 text-green-300">Attending {attendance.attending.length}</div>
                          <div className="rounded-md bg-red-500/10 px-2 py-1 text-red-200">Not Attending {attendance.notAttending.length}</div>
                          <div className="rounded-md bg-white/5 px-2 py-1 text-white/55">No Response {attendance.noResponse.length}</div>
                          <div className="rounded-md bg-black/20 px-2 py-1 text-white/65">Total {attendance.totalCoaches}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {section === "Calendar" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-orange">Erie Football</p>
                    <h2 className="mt-1 text-xl font-black">Staff Calendar</h2>
                    <p className="mt-1 text-sm text-white/50">
                      {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarMonth)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 rounded-lg border border-line bg-graphite/80 p-1 text-sm font-bold">
                    {(["Month", "Week", "Agenda"] as CalendarView[]).map((view) => (
                      <button key={view} type="button" onClick={() => setCalendarView(view)} className={`rounded-md px-3 py-2 ${calendarView === view ? "bg-orange text-ink" : "text-white/70"}`}>
                        {view === "Agenda" ? "Mobile" : view}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="min-h-10 rounded-lg border border-line px-3 text-sm font-black text-white/80">Prev</button>
                  <div className="flex flex-wrap justify-center gap-2 text-xs font-black">
                    {["Workout", "Practice", "Camp", "Staff Meeting"].map((kind) => (
                      <span key={kind} className={`rounded-full border px-2 py-1 ${kind === "Workout" ? "border-orange/60 bg-orange/15 text-orange" : kind === "Practice" ? "border-white/40 bg-white/15 text-white" : kind === "Camp" ? "border-white/20 bg-white/10 text-white/70" : "border-line bg-graphite/90 text-white/75"}`}>{kind}</span>
                    ))}
                  </div>
                  <button type="button" onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="min-h-10 rounded-lg border border-line px-3 text-sm font-black text-white/80">Next</button>
                </div>

                {calendarView === "Month" && (
                  <div className="mt-4">
                    <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-black uppercase tracking-wide text-white/45">
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day}>{day}</div>)}
                    </div>
                    <div className="mt-2 grid grid-cols-7 gap-1">
                      {monthDays.map((day) => {
                        const key = dateKey(day);
                        const dayEvents = eventsByDate[key] ?? [];
                        const inMonth = day.getMonth() === calendarMonth.getMonth();
                        return (
                          <button key={key} type="button" onClick={() => { setSelectedDateKey(key); setSelectedEventId(dayEvents[0]?.id ?? null); }} className={`min-h-24 rounded-lg border p-2 text-left transition ${selectedDateKey === key ? "border-orange bg-orange/10" : "border-line bg-graphite/50"} ${inMonth ? "text-white" : "text-white/30"}`}>
                            <span className="text-xs font-black">{day.getDate()}</span>
                            <div className="mt-2 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div key={event.id} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedDateKey(key); setSelectedEventId(event.id); }} className={`truncate rounded border px-1.5 py-1 text-[10px] font-black ${eventColorClass(event)}`}>{event.title}</div>
                              ))}
                              {dayEvents.length > 2 && <div className="text-[10px] font-bold text-white/50">+{dayEvents.length - 2} more</div>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {calendarView === "Week" && (
                  <div className="mt-4 grid gap-2 md:grid-cols-7">
                    {weekDays.map((day) => {
                      const key = dateKey(day);
                      const dayEvents = eventsByDate[key] ?? [];
                      return (
                        <button key={key} type="button" onClick={() => { setSelectedDateKey(key); setSelectedEventId(dayEvents[0]?.id ?? null); }} className={`min-h-36 rounded-lg border p-3 text-left ${selectedDateKey === key ? "border-orange bg-orange/10" : "border-line bg-graphite/60"}`}>
                          <div className="text-xs font-black uppercase text-white/50">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</div>
                          <div className="mt-1 text-lg font-black">{day.getDate()}</div>
                          <div className="mt-3 space-y-2">
                            {dayEvents.length ? dayEvents.map((event) => (
                              <div key={event.id} onClick={(clickEvent) => { clickEvent.stopPropagation(); setSelectedDateKey(key); setSelectedEventId(event.id); }} className={`rounded border p-2 text-xs font-black ${eventColorClass(event)}`}>
                                <div>{formatEventTime(event.date)}</div>
                                <div className="mt-1 line-clamp-2">{event.title}</div>
                              </div>
                            )) : <div className="text-xs text-white/40">No events</div>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {calendarView === "Agenda" && (
                  <div className="mt-4 space-y-3">
                    {events.length ? events.map((event) => (
                      <button key={event.id} type="button" onClick={() => { setSelectedDateKey(dateKey(event.date)); setSelectedEventId(event.id); setCalendarMonth(new Date(event.date)); }} className="w-full rounded-lg border border-line bg-graphite/70 p-4 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black">{event.title}</h3>
                            <p className="mt-1 text-sm text-white/60">{formatDateTime(event.date)}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${eventColorClass(event)}`}>{eventKind(event)}</span>
                        </div>
                      </button>
                    )) : <p className="rounded-lg bg-graphite/70 p-4 text-sm text-white/60">No events found in public.events.</p>}
                  </div>
                )}
              </section>
              <section className="space-y-4">
                <div className="rounded-lg border border-line bg-charcoal/90 p-4">
                  <h2 className="text-xl font-black">Upcoming Events</h2>
                  <div className="mt-3 space-y-2">
                    {events.length ? events.slice(0, 4).map((event) => (
                      <button key={event.id} type="button" onClick={() => { setSelectedDateKey(dateKey(event.date)); setSelectedEventId(event.id); setCalendarMonth(new Date(event.date)); }} className="w-full rounded-lg bg-graphite/70 p-3 text-left">
                        <div className="text-sm font-black">{event.title}</div>
                        <div className="mt-1 text-xs font-bold text-white/50">{formatDateTime(event.date)}</div>
                      </button>
                    )) : <p className="rounded-lg bg-graphite/70 p-3 text-sm text-white/60">No events found.</p>}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-charcoal/90 p-4">
                  <h2 className="text-xl font-black">Event Details</h2>
                  {selectedEvent ? (
                    <div className="mt-3">
                      <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${eventColorClass(selectedEvent)}`}>{eventKind(selectedEvent)}</span>
                      <h3 className="mt-3 text-lg font-black">{selectedEvent.title}</h3>
                      <p className="mt-1 text-sm text-white/60">{formatDateTime(selectedEvent.date)}</p>
                      <p className="mt-2 text-sm font-bold text-white/70">Location: {eventLocation(selectedEvent)}</p>
                      {selectedEvent.description && <p className="mt-3 whitespace-pre-line text-sm text-white/70">{attendanceDescription(selectedEvent.description)}</p>}
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-graphite/70 px-3 py-2 text-sm">
                        <span className="font-bold text-white/70">My Attendance</span>
                        <RsvpSelection response={myRsvp(selectedEvent.id)} />
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <Metric label="Attending" value={`${eventAttendanceDetails(selectedEvent.id).attending.length}`} tone="text-orange" />
                        <Metric label="Not Attending" value={`${eventAttendanceDetails(selectedEvent.id).notAttending.length}`} tone="text-red-200" />
                        <Metric label="No Response" value={`${eventAttendanceDetails(selectedEvent.id).noResponse.length}`} />
                        <Metric label="Total Coaches" value={`${eventAttendanceDetails(selectedEvent.id).totalCoaches}`} />
                      </div>
                      <button type="button" onClick={() => setSection("Attendance")} className="mt-3 min-h-11 w-full rounded-lg bg-orange px-4 font-black text-ink">Open Attendance Page</button>
                    </div>
                  ) : <p className="mt-3 text-sm text-white/60">Select a date or event to view details.</p>}
                </div>
              </section>
            </div>
          )}

          {section === "Installs" && (
            <section className="rounded-lg border border-line bg-charcoal/90 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-orange">Install Library</p>
                  <h2 className="mt-1 text-2xl font-black">Coming Soon</h2>
                </div>
                <span className="rounded-full bg-orange/15 px-3 py-1 text-xs font-black text-orange ring-1 ring-orange/30">Disabled</span>
              </div>
              <p className="mt-4 rounded-lg bg-graphite/70 p-4 text-sm text-white/70">
                Installs, drill cards, scouts, and file uploads are temporarily turned off. Coach accounts, profiles, calendar events, attendance responses, and schedule visibility remain active.
              </p>
            </section>
          )}

          {section === "Chats" && (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <section className="rounded-lg border border-line bg-charcoal/90 p-3">
                <h2 className="px-1 pb-2 text-lg font-black">Channels</h2>
                <div className="grid gap-2">
                  {(channels.length ? channels : defaultChannels.map((name, index) => ({ id: `${index}`, name } as ChatChannelRecord))).map((channel) => (
                    <button key={channel.id} onClick={() => setChannelName(channel.name)} className={`min-h-12 rounded-lg px-3 text-left text-sm font-black ${channel.name === channelName ? "bg-orange text-ink" : "bg-graphite/70 text-white/75"}`}>{channel.name}</button>
                  ))}
                </div>
              </section>
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">{channelName}</h2>
                  <span className="rounded-full bg-orange/15 px-3 py-1 text-xs font-black text-orange">Realtime</span>
                </div>
                <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto pr-1">
                  {currentMessages.length ? currentMessages.map((message) => (
                    <div key={message.id} className="rounded-lg bg-graphite/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-black">{message.coach_name}</span>
                        <span className="text-xs font-bold text-white/40">{formatDateTime(message.created_at)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-white/75">{message.message}</p>
                    </div>
                  )) : <p className="rounded-lg bg-graphite/70 p-4 text-sm text-white/60">No messages yet. Start the conversation for this channel.</p>}
                </div>
                <form onSubmit={sendMessage} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="min-h-12 rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder={`Message ${channelName}`} />
                  <button disabled={!session || !currentProfile || !messageBody.trim()} className="min-h-12 rounded-lg bg-orange px-5 font-black text-ink disabled:cursor-not-allowed disabled:opacity-40">Send</button>
                </form>
              </section>
            </div>
          )}

          {section === "Admin" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <h2 className="text-xl font-black">Coach Directory Management</h2>
                <p className="mt-1 text-sm text-white/55">Manually manage active staff status. Coaches are never deactivated automatically.</p>
                <div className="mt-4 rounded-lg border border-orange/25 bg-orange/10 p-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wide text-orange">Sync Coaches</h3>
                      <p className="mt-1 text-xs leading-5 text-white/60">Admin repair tool: reads profiles, checks auth users when available, and upserts missing profile records into Coach Accounts as active coaches.</p>
                    </div>
                    <button
                      type="button"
                      onClick={syncCoachesFromProfiles}
                      disabled={!isAdmin || coachSyncing}
                      className="min-h-10 rounded-lg bg-orange px-4 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {coachSyncing ? "Syncing..." : "Sync Coaches"}
                    </button>
                  </div>
                  {coachSyncMessage && <p className="mt-3 rounded-lg bg-black/25 p-3 text-sm font-bold text-white/75">{coachSyncMessage}</p>}
                  <div className="mt-3 grid gap-2 text-xs font-bold text-white/65 sm:grid-cols-3">
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-lg font-black text-white">{coachDebugResult?.authUsersCount ?? "-"}</div>
                      <div className="uppercase tracking-wide text-white/40">Auth users</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-lg font-black text-white">{coachDebugResult?.profilesCount ?? profiles.length}</div>
                      <div className="uppercase tracking-wide text-white/40">Profiles</div>
                    </div>
                    <div className="rounded-lg border border-white/10 bg-black/20 p-3">
                      <div className="text-lg font-black text-white">{coachDebugResult?.coachesCount ?? coaches.length}</div>
                      <div className="uppercase tracking-wide text-white/40">Coaches</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={refreshCoachDirectoryDebug}
                    disabled={!isAdmin || coachDebugLoading}
                    className="mt-3 min-h-10 w-full rounded-lg border border-line px-4 text-sm font-black text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {coachDebugLoading ? "Reading Debug Data..." : "Refresh Directory Debug"}
                  </button>
                  {coachDebugMessage && <p className="mt-3 rounded-lg bg-black/25 p-3 text-sm font-bold text-white/65">{coachDebugMessage}</p>}
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <h4 className="text-xs font-black uppercase tracking-wide text-white/45">Emails Found In Profiles</h4>
                    {coachDebugResult?.profileEmails.length ? (
                      <div className="mt-2 space-y-1">
                        {coachDebugResult.profileEmails.map((profile) => (
                          <div key={profile.id} className="text-xs font-bold text-white/70">
                            {profile.email ?? "No email"} - {profile.full_name} - {profile.position_group ?? "No position"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-bold text-white/50">No profile emails loaded. Refresh debug data to read profiles with the server key.</p>
                    )}
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <h4 className="text-xs font-black uppercase tracking-wide text-white/45">Emails Found In Coaches</h4>
                    {coachDebugResult?.coachEmails.length ? (
                      <div className="mt-2 space-y-1">
                        {coachDebugResult.coachEmails.map((coach) => (
                          <div key={coach.id} className="text-xs font-bold text-white/70">
                            {coach.email ?? "No email"} - {coach.full_name} - {coach.position_group ?? "No position"} - {coach.active ? "Active" : "Inactive"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-bold text-white/50">No coach emails loaded. Refresh debug data to read coaches with the server key.</p>
                    )}
                  </div>
                  <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3">
                    <h4 className="text-xs font-black uppercase tracking-wide text-white/45">Profiles Missing From Coaches</h4>
                    {profilesMissingFromCoaches.length > 0 ? (
                      <div className="mt-2 space-y-1">
                        {profilesMissingFromCoaches.map((profile) => (
                          <div key={profile.id} className="text-xs font-bold text-white/70">
                            {profile.full_name} - {profile.position_group ?? "Position Group Needed"} - {profile.email ?? "No email"}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs font-bold text-white/50">No profiles are missing from Coach Accounts in the current app data.</p>
                    )}
                  </div>
                  {coachSyncResult && (
                    <div className="mt-3 rounded-lg border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/65">
                      <div className="font-black text-white">Last Sync Result</div>
                      <div>Synced coaches: {coachSyncResult.syncedCoachesCount}</div>
                      <div>Profiles created from Auth users: {coachSyncResult.createdProfilesCount ?? 0}</div>
                      <div>Existing coaches before sync: {coachSyncResult.existingCoachesCount}</div>
                      <div>Profiles read: {coachSyncResult.profilesCount}</div>
                      <div>Coach accounts after sync: {coachSyncResult.coachesCount}</div>
                      <div>Auth users read: {coachSyncResult.authUsersCount}</div>
                      <div>Missing after sync: {coachSyncResult.missingProfilesAfterSync.length}</div>
                      {coachSyncResult.errors.length > 0 && (
                        <div className="mt-2 rounded-lg border border-red-400/25 bg-red-500/10 p-2 text-red-100">
                          <div className="font-black">Errors</div>
                          {coachSyncResult.errors.map((error) => <div key={error}>{error}</div>)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <form onSubmit={inviteCoach} className="mt-4 grid gap-3">
                  <input value={coachForm.fullName} onChange={(event) => setCoachForm({ ...coachForm, fullName: event.target.value })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none" placeholder="Full name" required />
                  <input value={coachForm.email} onChange={(event) => setCoachForm({ ...coachForm, email: event.target.value })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none" placeholder="Email" type="email" required />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select value={coachForm.role} onChange={(event) => setCoachForm({ ...coachForm, role: event.target.value as CoachRole })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none">
                      {coachRoles.map((role) => <option key={role}>{role}</option>)}
                    </select>
                    <select value={coachForm.group} onChange={(event) => setCoachForm({ ...coachForm, group: event.target.value as PositionGroup })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none" required>
                      <option value="">Position Group</option>
                      {positionGroups.map((group) => <option key={group}>{group}</option>)}
                    </select>
                  </div>
                  <button disabled={!isAdmin} className="min-h-11 rounded-lg bg-orange px-4 font-black text-ink disabled:opacity-40">Invite Coach</button>
                </form>
                <div className="mt-4 space-y-3">
                  <div className="hidden grid-cols-[1fr_1fr_0.8fr_auto] gap-3 px-3 text-xs font-black uppercase tracking-wide text-white/35 md:grid">
                    <span>Name</span>
                    <span>Email</span>
                    <span>Position Group</span>
                    <span>Status</span>
                  </div>
                  {coaches.map((coach) => {
                    const accountStatus = coachAccountStatus(coach, profiles, session);
                    const isActiveAccount = accountStatus === "Active";
                    const coachProfile = profiles.find((profile) => normalizeEmail(profile.email) === normalizeEmail(coach.email));
                    const displayPositionGroup = coach.position_group ?? coachProfile?.position_group ?? "Position Group Needed";
                    const edit = coachEdits[coach.id] ?? { fullName: coach.full_name, positionGroup: (displayPositionGroup === "Position Group Needed" ? "" : displayPositionGroup) as PositionGroup | "" };

                    return (
                      <div key={coach.id} className={`grid gap-3 rounded-lg px-3 py-3 md:grid-cols-[1fr_1fr_0.8fr_auto] md:items-center ${coach.active ? "bg-graphite/70" : "border border-white/10 bg-black/25 opacity-70"}`}>
                        <div className="min-w-0">
                          <div className="text-[11px] font-black uppercase tracking-wide text-white/35 md:hidden">Name</div>
                          <input
                            value={edit.fullName}
                            onChange={(event) => setCoachEdits((existingEdits) => ({ ...existingEdits, [coach.id]: { ...edit, fullName: event.target.value } }))}
                            className="min-h-10 w-full rounded-lg border border-line bg-black/20 px-3 text-sm font-black outline-none ring-orange/40 focus:ring-2"
                          />
                          <div className="text-xs font-bold text-white/45">{coach.role}</div>
                        </div>
                        <div className="min-w-0">
                          <div className="text-[11px] font-black uppercase tracking-wide text-white/35 md:hidden">Email</div>
                          <div className="truncate text-sm font-bold text-white/65">{coach.email}</div>
                        </div>
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-wide text-white/35 md:hidden">Position Group</div>
                          <select
                            value={edit.positionGroup}
                            onChange={(event) => setCoachEdits((existingEdits) => ({ ...existingEdits, [coach.id]: { ...edit, positionGroup: event.target.value as PositionGroup } }))}
                            className="min-h-10 w-full rounded-lg border border-line bg-black/20 px-3 text-sm font-black text-orange outline-none ring-orange/40 focus:ring-2"
                          >
                            <option value="">Position Group</option>
                            {positionGroups.map((group) => <option key={group}>{group}</option>)}
                          </select>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${coach.active ? "bg-green-500/10 text-green-300 ring-green-400/25" : "bg-white/10 text-white/55 ring-white/15"}`}>
                            {coach.active ? "Active" : "Inactive"}
                          </span>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${isActiveAccount ? "bg-orange/15 text-orange ring-orange/30" : "bg-white/10 text-white/60 ring-white/15"}`}>
                            {accountStatus}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCoachActive(coach, !coach.active)}
                            disabled={!isAdmin}
                            className="min-h-9 rounded-lg border border-line px-3 text-xs font-black text-white/75 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Mark {coach.active ? "Inactive" : "Active"}
                          </button>
                          <button
                            type="button"
                            onClick={() => updateCoachDirectoryDetails(coach)}
                            disabled={!isAdmin}
                            className="min-h-9 rounded-lg bg-orange px-3 text-xs font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <h2 className="text-xl font-black">Import Schedule PDF</h2>
                <p className="mt-2 text-sm text-white/60">
                  Imports Week 1 events from the 2026 Summer Workout Outline PDF into Supabase. The importer checks existing title and date/time values first, so running it again will not create duplicates.
                </p>
                <div className="mt-4 rounded-lg border border-line bg-graphite/70 p-3">
                  <div className="text-sm font-black text-white">2026 Summer Workout Outline - Week 1</div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-white/45">May 31-June 6</div>
                </div>
                <div className="mt-4">
                  <h3 className="text-xs font-black uppercase tracking-wide text-orange">Detected Events Preview</h3>
                  <div className="mt-2 space-y-2">
                    {schedulePreviewRows.map((event) => (
                      <div key={`${event.title}-${event.date}`} className="rounded-lg border border-line bg-graphite/60 p-3">
                        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                          <p className="font-black">{event.title}</p>
                          <p className="shrink-0 text-xs font-bold text-white/50">{formatDateTime(event.date)}</p>
                        </div>
                        <p className="mt-2 whitespace-pre-line text-xs leading-5 text-white/60">{attendanceDescription(event.description)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <button type="button" onClick={importSummerSchedule} disabled={!session || scheduleImporting} className="mt-4 min-h-11 w-full rounded-lg bg-orange px-4 font-black text-ink disabled:cursor-not-allowed disabled:opacity-40">
                  {scheduleImporting ? "Importing..." : "Import Week 1 Schedule"}
                </button>
                {scheduleImportMessage && <p className="mt-3 rounded-lg bg-graphite/80 p-3 text-sm text-white/70">{scheduleImportMessage}</p>}
                {insertedScheduleRows.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-xs font-black uppercase tracking-wide text-orange">Actual Rows Inserted</h3>
                    <div className="mt-2 space-y-2">
                      {insertedScheduleRows.map((event) => (
                        <div key={event.id} className="rounded-lg border border-orange/30 bg-orange/10 p-3">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <p className="font-black">{event.title}</p>
                            <p className="shrink-0 text-xs font-bold text-white/60">{formatDateTime(event.date)}</p>
                          </div>
                          <p className="mt-1 text-[11px] font-bold text-white/45">id: {event.id}</p>
                          {event.description && <p className="mt-2 whitespace-pre-line text-xs leading-5 text-white/65">{attendanceDescription(event.description)}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <h2 className="text-xl font-black">Announcements</h2>
                <form onSubmit={postAnnouncement} className="mt-4 grid gap-3">
                  <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} className="min-h-28 rounded-lg border border-line bg-graphite/80 px-4 py-3 text-sm outline-none" placeholder="Staff announcement" />
                  <button disabled={!isAdmin} className="min-h-11 rounded-lg bg-orange px-4 font-black text-ink disabled:opacity-40">Send Announcement</button>
                </form>
                <div className="mt-4 grid gap-3">
                  {["Create/edit events", "Manage attendance", "Upload install files", "Moderate chats", "Review push notifications"].map((action) => (
                    <div key={action} className="min-h-14 rounded-lg border border-line bg-graphite/70 px-4 py-4 text-left font-bold text-white/80">{action}</div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-black/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
          {navItems.map((item) => (
            <button key={item} onClick={() => setSection(item)} className={`grid min-h-14 place-items-center rounded-lg text-[11px] font-bold ${section === item ? "bg-orange text-ink" : "text-white/60"}`}>
              <Icon name={item} />
              <span className="mt-1">{item === "Installs" ? "Files" : item}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

