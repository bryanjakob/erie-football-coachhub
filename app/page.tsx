"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  supabase,
  type AnnouncementRecord,
  type ChatChannelRecord,
  type ChatMessageRecord,
  type CoachAccount,
  type CoachProfile,
  type CoachRole,
  type EventType,
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
  email: string;
  password: string;
};

type ScheduleImportEvent = {
  title: string;
  description: string;
  date: string;
};

type CalendarView = "Month" | "Week" | "Agenda";

const navItems: Section[] = ["Home", "Calendar", "Attendance", "Installs", "Chats", "Admin"];
const quickLinks: Section[] = ["Calendar", "Attendance", "Installs", "Chats"];
const eventTypes: EventType[] = ["Workout", "Practice", "Staff Meeting", "Camp", "Game", "Clinic"];
const defaultChannels: StaffChannel[] = ["General Staff", "Offense", "Defense", "Special Teams"];
const coachRoles: CoachRole[] = ["Admin", "Head Coach", "Varsity Coach", "JV Coach", "Volunteer Coach"];
const logoSrc = "/erie-football-logo.png";

const summerWeekOneSchedule: ScheduleImportEvent[] = [
  {
    title: "OL/DL Camp",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 9:30-11:00 AM\nLocation: Thunderridge\nRSVP required: Yes",
    date: "2026-05-31T15:30:00.000Z"
  },
  {
    title: "Summer Workouts #1",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nRSVP required: Yes",
    date: "2026-06-01T13:00:00.000Z"
  },
  {
    title: "Summer Workout #2",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nRSVP required: Yes",
    date: "2026-06-02T13:00:00.000Z"
  },
  {
    title: "Team Pass #1",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nRSVP required: Yes",
    date: "2026-06-02T14:30:00.000Z"
  },
  {
    title: "Player Led Practice",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nRSVP required: Yes",
    date: "2026-06-03T13:00:00.000Z"
  },
  {
    title: "Summer Workout #4",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nRSVP required: Yes",
    date: "2026-06-04T13:00:00.000Z"
  },
  {
    title: "Team Pass Work #2",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nRSVP required: Yes",
    date: "2026-06-04T14:30:00.000Z"
  },
  {
    title: "Summer Workout #5 / Competition Friday",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nRSVP required: Yes",
    date: "2026-06-05T13:00:00.000Z"
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
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status]}`}>{status}</span>;
}

function RsvpSelection({ response }: { response: RSVPStatus | null }) {
  return response ? <StatusPill status={response} /> : <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-white/60 ring-1 ring-white/15">No RSVP</span>;
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
  if (kind === "Camp") return "border-white/20 bg-white/10 text-white/75";
  return "border-line bg-graphite/90 text-white/80";
}

function eventLocation(event: StaffEventRecord) {
  const locationLine = event.description?.split("\n").find((line) => line.toLowerCase().startsWith("location:"));
  return locationLine?.replace(/^location:\s*/i, "").trim() || "Not listed";
}

function eventRsvpRequired(event: StaffEventRecord) {
  return event.rsvp_required ?? true;
}

function initials(name?: string | null, email?: string | null) {
  const source = name || email || "Coach";
  return source
    .split(/[ @.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function LoginPanel({
  session,
  status,
  onLogin,
  onSignUp,
  onReset,
  onLogout
}: {
  session: Session | null;
  status: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onSignUp: (input: SignUpInput) => Promise<void>;
  onReset: (email: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signUpForm, setSignUpForm] = useState<SignUpInput>({ firstName: "", lastName: "", email: "", password: "" });

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await onLogin(email, password);
  }

  async function handleSignUp(event: FormEvent) {
    event.preventDefault();
    await onSignUp(signUpForm);
  }

  if (session) {
    return (
      <section className="rounded-lg border border-line bg-charcoal/90 p-4 shadow-glow md:p-5">
        <div className="flex items-center gap-3">
          <ErieLogo className="h-12 w-28 shrink-0" />
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">Signed In</h2>
            <p className="truncate text-sm text-white/60">{session.user.email}</p>
          </div>
          <button onClick={onLogout} className="min-h-11 rounded-lg border border-line px-4 text-sm font-bold text-white/80">Sign Out</button>
        </div>
        {status && <p className="mt-3 rounded-lg bg-graphite/80 p-3 text-sm text-white/70">{status}</p>}
      </section>
    );
  }

  return (
    <form onSubmit={mode === "signin" ? handleLogin : handleSignUp} className="rounded-lg border border-line bg-charcoal/90 p-4 shadow-glow md:p-5">
      <div className="flex items-center gap-3">
        <ErieLogo className="h-14 w-32 shrink-0" />
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
  const [calendarView, setCalendarView] = useState<CalendarView>("Month");
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(() => dateKey(new Date()));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState<EventForm>(initialEventForm);
  const [announcementBody, setAnnouncementBody] = useState("");
  const [coachForm, setCoachForm] = useState({ fullName: "", email: "", role: "Varsity Coach" as CoachRole, group: "" });
  const [profileName, setProfileName] = useState("");
  const [channelName, setChannelName] = useState<StaffChannel>("General Staff");
  const [messageBody, setMessageBody] = useState("");

  const isConfigured = Boolean(supabase);
  const isAdmin = currentCoach?.role === "Admin";

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

    const userEmail = activeSession.user.email;

    if (userEmail) {
      await client.rpc("claim_my_coach_profile");
    }

    const [
      profileResult,
      coachesResult,
      rsvpsResult,
      channelsResult,
      messagesResult,
      announcementsResult
    ] = await Promise.all([
      client.from("profiles").select("id,full_name,email,created_at").eq("id", activeSession.user.id).maybeSingle(),
      client.from("coaches").select("*").eq("active", true).order("created_at", { ascending: true }),
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

    setCoaches((coachesResult.data ?? []) as CoachAccount[]);
    setRsvps((rsvpsResult.data ?? []) as RsvpRecord[]);
    setMessages((messagesResult.data ?? []) as ChatMessageRecord[]);
    setAnnouncements((announcementsResult.data ?? []) as AnnouncementRecord[]);

    const coachAccount = ((coachesResult.data ?? []) as CoachAccount[]).find((coach) => coach.auth_user_id === activeSession.user.id) ?? null;
    const profile = (profileResult.data as CoachProfile | null) ?? null;
    setCurrentCoach(coachAccount);
    setCurrentProfile(profile);
    setProfileName(profile?.full_name ?? coachAccount?.full_name ?? "");

    const firstError = profileResult.error || coachesResult.error || rsvpsResult.error || channelsResult.error || messagesResult.error || announcementsResult.error;
    if (firstError) {
      setStatus(firstError.message);
    } else if (!profile) {
      setStatus("Complete your profile so RSVPs can attach to your coach name.");
    } else if (!coachAccount) {
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
  const needsProfile = Boolean(session && !currentProfile);

  const eventRsvpSummary = useCallback((eventId: string) => {
    const eventRsvps = rsvps.filter((rsvp) => rsvp.event_id === eventId);
    return {
      Yes: eventRsvps.filter((rsvp) => rsvp.response === "Yes").length,
      No: eventRsvps.filter((rsvp) => rsvp.response === "No").length
    } satisfies Record<RSVPStatus, number>;
  }, [rsvps]);

  const myRsvp = useCallback((eventId: string): RSVPStatus | null => {
    return rsvps.find((rsvp) => rsvp.event_id === eventId && rsvp.user_id === session?.user.id)?.response ?? null;
  }, [rsvps, session?.user.id]);

  const attendancePercent = useMemo(() => {
    const totalSlots = events.length * Math.max(coaches.length, 1);
    if (!totalSlots) return 0;
    return Math.round((rsvps.filter((rsvp) => rsvp.response === "Yes").length / totalSlots) * 100);
  }, [coaches.length, events.length, rsvps]);

  async function login(email: string, password: string) {
    const client = supabase;
    if (!client) return;
    setStatus("Signing in...");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setStatus(error ? error.message : "Signed in.");
  }

  async function signUpCoach(input: SignUpInput) {
    const client = supabase;
    if (!client) return;

    const firstName = input.firstName.trim();
    const lastName = input.lastName.trim();
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const email = input.email.trim();

    if (!firstName || !lastName || !email || !input.password) {
      setStatus("First name, last name, email, and password are required.");
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
          full_name: fullName
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

    const profilePayload = {
      id: userId,
      full_name: fullName,
      email
    };
    const profileResult = await client
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })
      .select("id,full_name,email,created_at")
      .single();

    if (profileResult.error) {
      setStatus(`Account created, but profile save failed: ${profileResult.error.message}`);
      return;
    }

    setSession(activeSession);
    setCurrentProfile(profileResult.data as CoachProfile);
    setProfileName(fullName);
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
  }

  async function completeProfile(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    const user = session?.user;
    const fullName = profileName.trim();

    if (!client || !user) {
      setStatus("Sign in before completing your profile.");
      return;
    }
    if (!fullName) {
      setStatus("Enter your full name.");
      return;
    }

    const payload = {
      id: user.id,
      full_name: fullName,
      email: user.email ?? currentCoach?.email ?? null
    };
    const { data, error } = await client
      .from("profiles")
      .upsert(payload, { onConflict: "id" })
      .select("id,full_name,email,created_at")
      .single();

    if (error) {
      setStatus(`Profile save failed: ${error.message}`);
      return;
    }

    setCurrentProfile(data as CoachProfile);
    setProfileName(fullName);
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
    if (!client) {
      setScheduleImportMessage("Supabase is not configured.");
      return;
    }
    if (!isAdmin) {
      setScheduleImportMessage("Only admins can import schedule PDFs.");
      return;
    }

    setScheduleImporting(true);
    setScheduleImportMessage("Importing Week 1 summer schedule...");

    try {
      const { data: existingRows, error: fetchError } = await client
        .schema("public")
        .from("events")
        .select("id,title,description,date,created_at")
        .order("date", { ascending: true });

      if (fetchError) {
        setScheduleImportMessage(`Schedule import failed: ${fetchError.message}`);
        return;
      }

      const existingKeys = new Set(
        ((existingRows ?? []) as StaffEventRecord[]).map((event) => `${event.title.trim().toLowerCase()}|${new Date(event.date).toISOString()}`)
      );
      const eventsToInsert = summerWeekOneSchedule.filter((event) => !existingKeys.has(`${event.title.trim().toLowerCase()}|${event.date}`));

      if (eventsToInsert.length === 0) {
        setScheduleImportMessage("Schedule already imported. No duplicate events created.");
        await fetchEvents(client);
        return;
      }

      const { error: insertError } = await client
        .schema("public")
        .from("events")
        .insert(eventsToInsert.map(({ title, description, date }) => ({ title, description, date })));

      if (insertError) {
        setScheduleImportMessage(`Schedule import failed: ${insertError.message}`);
        return;
      }

      await fetchEvents(client);
      setScheduleImportMessage(`Imported ${eventsToInsert.length} Week 1 schedule event${eventsToInsert.length === 1 ? "" : "s"}.`);
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
      setRsvpError("Sign in before saving an RSVP.");
      return;
    }
    if (!currentProfile) {
      setRsvpError("Complete your profile before saving an RSVP.");
      setStatus("Complete your profile before saving an RSVP.");
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
      const message = `RSVP save failed: ${error.message}`;
      setRsvpError(message);
      setStatus(message);
      return;
    }

    setRsvpError("");
    setStatus("RSVP saved.");
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
    () => events.find((event) => event.id === selectedEventId) ?? selectedDateEvents[0] ?? upcomingEvents[0] ?? null,
    [events, selectedDateEvents, selectedEventId, upcomingEvents]
  );

  const teamName = "Erie Football";
  const nextEvent = upcomingEvents[0];
  const totalYes = rsvps.filter((rsvp) => rsvp.response === "Yes").length;
  const totalNo = rsvps.filter((rsvp) => rsvp.response === "No").length;
  const nextSummary = nextEvent ? eventRsvpSummary(nextEvent.id) : { Yes: 0, No: 0 };

  return (
    <main className="field-markings min-h-screen pb-24 lg:pb-6">
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-lg border border-line bg-black/90 p-4 backdrop-blur lg:flex">
          <div>
            <ErieLogo className="h-20 w-full" />
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
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">{currentCoach?.role ?? "Coach Profile Needed"}</p>
            <p className="mt-1 font-black">{coachName}</p>
            <p className="text-sm text-white/50">{teamName}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-lg border border-line bg-black/85 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <ErieLogo className="h-12 w-24 shrink-0 sm:w-32" />
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide text-orange">{teamName}</p>
                  <h1 className="mt-1 truncate text-2xl font-black sm:text-3xl">{section === "Home" ? "Staff Dashboard" : section}</h1>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-graphite/70" title="Notifications"><Icon name="Bell" /></button>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-black text-ink">{initials(coachName, session?.user.email)}</div>
              </div>
            </div>
            {!isConfigured && <p className="mt-3 rounded-lg border border-orange/30 bg-orange/10 p-3 text-sm font-bold text-orange">Supabase env vars are missing. Add `.env.local` values and restart the app.</p>}
            {loading && <p className="mt-3 rounded-lg bg-white/10 p-3 text-sm text-white/70">Loading persistent staff data...</p>}
            {status && <p className="mt-3 rounded-lg bg-graphite/80 p-3 text-sm text-white/70">{status}</p>}
          </header>

          {needsProfile && (
            <form onSubmit={completeProfile} className="mb-4 rounded-lg border border-orange/30 bg-charcoal/95 p-4 shadow-glow">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-orange">Complete Profile</label>
                  <p className="mt-1 text-sm text-white/60">Enter your full name once. Your RSVPs will use this coach name automatically.</p>
                  <input value={profileName} onChange={(event) => setProfileName(event.target.value)} className="mt-3 min-h-12 w-full rounded-lg border border-line bg-graphite/80 px-4 text-sm outline-none ring-orange/40 placeholder:text-white/40 focus:ring-2" placeholder="Coach full name" required />
                </div>
                <button className="min-h-12 rounded-lg bg-orange px-5 font-black text-ink">Save Profile</button>
              </div>
            </form>
          )}

          {section === "Home" && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <LoginPanel session={session} status={status} onLogin={login} onSignUp={signUpCoach} onReset={resetPassword} onLogout={logout} />
                <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                  {nextEvent ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-orange">Next Required RSVP</p>
                          <h2 className="mt-1 text-2xl font-black">{nextEvent.title}</h2>
                          <p className="mt-1 text-sm text-white/60">{formatDateTime(nextEvent.date)}</p>
                        </div>
                        <RsvpSelection response={myRsvp(nextEvent.id)} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {(["Yes", "No"] as RSVPStatus[]).map((response) => (
                          <button key={response} onClick={() => respondToEvent(nextEvent.id, response)} className={`min-h-14 rounded-lg text-sm font-black ring-1 ${statusStyles[response]}`}>{response}</button>
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
                    <Metric label="Trend" value={`${attendancePercent}%`} tone="text-orange" />
                    <Metric label="Yes" value={`${totalYes || nextSummary.Yes}`} tone="text-orange" />
                    <Metric label="No" value={`${totalNo || nextSummary.No}`} tone="text-red-200" />
                    <Metric label="Events" value={`${events.length}`} />
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
                    Require RSVP responses
                    <input checked={eventForm.rsvpRequired} onChange={(event) => setEventForm({ ...eventForm, rsvpRequired: event.target.checked })} type="checkbox" className="h-5 w-5 accent-orange" />
                  </label>
                </div>
              </form>
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <h2 className="text-xl font-black">Live RSVP Board</h2>
                <div className="mt-4 space-y-3">
                  {eventFetchError && <p className="rounded-lg border border-red-400/30 bg-red-500/15 p-4 text-sm font-bold text-red-100">{eventFetchError}</p>}
                  {rsvpError && <p className="rounded-lg border border-red-400/30 bg-red-500/15 p-4 text-sm font-bold text-red-100">{rsvpError}</p>}
                  {!eventFetchError && events.length === 0 && <p className="rounded-lg bg-graphite/70 p-4 text-sm text-white/70">No events exist yet. Create one with the form and it will appear here after Supabase saves it.</p>}
                  {events.map((event) => (
                    <div key={event.id} className="rounded-lg bg-graphite/70 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-black">{event.title}</h3>
                          <p className="mt-1 text-sm text-white/60">{formatDateTime(event.date)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${eventRsvpRequired(event) ? "bg-orange/15 text-orange ring-orange/30" : "bg-white/10 text-white/60 ring-white/15"}`}>
                          RSVP {eventRsvpRequired(event) ? "Required" : "Optional"}
                        </span>
                      </div>
                      {event.description && <p className="mt-3 whitespace-pre-line text-sm text-white/75">{event.description}</p>}
                      <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-graphite/70 px-3 py-2 text-sm">
                        <span className="font-bold text-white/70">Your response</span>
                        {myRsvp(event.id) ? <StatusPill status={myRsvp(event.id) as RSVPStatus} /> : <span className="font-bold text-white/45">Not selected</span>}
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {(["Yes", "No"] as RSVPStatus[]).map((response) => (
                          <button key={response} onClick={() => respondToEvent(event.id, response)} className={`min-h-11 rounded-lg text-sm font-black ring-1 ${statusStyles[response]}`}>{response}</button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {section === "Calendar" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
              <section className="rounded-lg border border-line bg-charcoal/90 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Staff Calendar</h2>
                    <p className="mt-1 text-sm text-white/50">
                      {new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(calendarMonth)}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 rounded-lg border border-line bg-graphite/80 p-1 text-sm font-bold">
                    {(["Month", "Week", "Agenda"] as CalendarView[]).map((view) => (
                      <button key={view} onClick={() => setCalendarView(view)} className={`rounded-md px-3 py-2 ${calendarView === view ? "bg-orange text-ink" : "text-white/70"}`}>
                        {view === "Agenda" ? "Mobile" : view}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))} className="min-h-10 rounded-lg border border-line px-3 text-sm font-black text-white/80">Prev</button>
                  <div className="flex flex-wrap gap-2 text-xs font-black">
                    {["Workout", "Practice", "Camp", "Staff Meeting"].map((kind) => (
                      <span key={kind} className={`rounded-full border px-2 py-1 ${kind === "Workout" ? "border-orange/60 bg-orange/15 text-orange" : kind === "Practice" ? "border-white/40 bg-white/15 text-white" : kind === "Camp" ? "border-white/20 bg-white/10 text-white/70" : "border-line bg-graphite/90 text-white/75"}`}>{kind}</span>
                    ))}
                  </div>
                  <button onClick={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))} className="min-h-10 rounded-lg border border-line px-3 text-sm font-black text-white/80">Next</button>
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
                          <button key={key} onClick={() => { setSelectedDateKey(key); setSelectedEventId(dayEvents[0]?.id ?? null); }} className={`min-h-24 rounded-lg border p-2 text-left transition ${selectedDateKey === key ? "border-orange bg-orange/10" : "border-line bg-graphite/50"} ${inMonth ? "text-white" : "text-white/30"}`}>
                            <span className="text-xs font-black">{day.getDate()}</span>
                            <div className="mt-2 space-y-1">
                              {dayEvents.slice(0, 2).map((event) => (
                                <div key={event.id} className={`truncate rounded border px-1.5 py-1 text-[10px] font-black ${eventColorClass(event)}`}>{event.title}</div>
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
                        <button key={key} onClick={() => { setSelectedDateKey(key); setSelectedEventId(dayEvents[0]?.id ?? null); }} className={`min-h-36 rounded-lg border p-3 text-left ${selectedDateKey === key ? "border-orange bg-orange/10" : "border-line bg-graphite/60"}`}>
                          <div className="text-xs font-black uppercase text-white/50">{new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(day)}</div>
                          <div className="mt-1 text-lg font-black">{day.getDate()}</div>
                          <div className="mt-3 space-y-2">
                            {dayEvents.length ? dayEvents.map((event) => (
                              <div key={event.id} className={`rounded border p-2 text-xs font-black ${eventColorClass(event)}`}>
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
                    {upcomingEvents.length ? upcomingEvents.map((event) => (
                      <button key={event.id} onClick={() => { setSelectedDateKey(dateKey(event.date)); setSelectedEventId(event.id); }} className="w-full rounded-lg border border-line bg-graphite/70 p-4 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h3 className="font-black">{event.title}</h3>
                            <p className="mt-1 text-sm text-white/60">{formatDateTime(event.date)}</p>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[11px] font-black ${eventColorClass(event)}`}>{eventKind(event)}</span>
                        </div>
                      </button>
                    )) : <p className="rounded-lg bg-graphite/70 p-4 text-sm text-white/60">No upcoming events.</p>}
                  </div>
                )}
              </section>
              <section className="space-y-4">
                <div className="rounded-lg border border-line bg-charcoal/90 p-4">
                  <h2 className="text-xl font-black">Upcoming Events</h2>
                  <div className="mt-3 space-y-2">
                    {upcomingEvents.length ? upcomingEvents.slice(0, 4).map((event) => (
                      <button key={event.id} onClick={() => { setSelectedDateKey(dateKey(event.date)); setSelectedEventId(event.id); }} className="w-full rounded-lg bg-graphite/70 p-3 text-left">
                        <div className="text-sm font-black">{event.title}</div>
                        <div className="mt-1 text-xs font-bold text-white/50">{formatDateTime(event.date)}</div>
                      </button>
                    )) : <p className="rounded-lg bg-graphite/70 p-3 text-sm text-white/60">No upcoming events.</p>}
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-charcoal/90 p-4">
                  <h2 className="text-xl font-black">RSVP Summary</h2>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Metric label="Yes" value={`${selectedEvent ? eventRsvpSummary(selectedEvent.id).Yes : 0}`} tone="text-orange" />
                    <Metric label="No" value={`${selectedEvent ? eventRsvpSummary(selectedEvent.id).No : 0}`} tone="text-red-200" />
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
                      {selectedEvent.description && <p className="mt-3 whitespace-pre-line text-sm text-white/70">{selectedEvent.description}</p>}
                      <div className="mt-3 flex items-center justify-between rounded-lg bg-graphite/70 px-3 py-2 text-sm">
                        <span className="font-bold text-white/70">Your RSVP</span>
                        <RsvpSelection response={myRsvp(selectedEvent.id)} />
                      </div>
                      <button onClick={() => setSection("Attendance")} className="mt-3 min-h-11 w-full rounded-lg bg-orange px-4 font-black text-ink">Open RSVP Page</button>
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
                Installs, drill cards, scouts, and file uploads are temporarily turned off. Coach accounts, profiles, calendar events, attendance, RSVPs, and schedule visibility remain active.
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
                <h2 className="text-xl font-black">Coach Accounts</h2>
                <form onSubmit={inviteCoach} className="mt-4 grid gap-3">
                  <input value={coachForm.fullName} onChange={(event) => setCoachForm({ ...coachForm, fullName: event.target.value })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none" placeholder="Full name" required />
                  <input value={coachForm.email} onChange={(event) => setCoachForm({ ...coachForm, email: event.target.value })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none" placeholder="Email" type="email" required />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select value={coachForm.role} onChange={(event) => setCoachForm({ ...coachForm, role: event.target.value as CoachRole })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none">
                      {coachRoles.map((role) => <option key={role}>{role}</option>)}
                    </select>
                    <input value={coachForm.group} onChange={(event) => setCoachForm({ ...coachForm, group: event.target.value })} className="min-h-11 rounded-lg border border-line bg-graphite/80 px-3 text-sm outline-none" placeholder="Position group" />
                  </div>
                  <button disabled={!isAdmin} className="min-h-11 rounded-lg bg-orange px-4 font-black text-ink disabled:opacity-40">Invite Coach</button>
                </form>
                <div className="mt-4 space-y-3">
                  {coaches.map((coach) => (
                    <div key={coach.id} className="flex min-h-16 items-center justify-between gap-3 rounded-lg bg-graphite/70 px-3">
                      <div>
                        <div className="font-black">{coach.full_name}</div>
                        <div className="text-sm text-white/50">{coach.role} - {coach.position_group ?? "Staff"} - {coach.email}</div>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${coach.auth_user_id ? "bg-orange/15 text-orange ring-orange/30" : "bg-white/10 text-white/60 ring-white/15"}`}>
                        {coach.auth_user_id ? "Active" : "Pending"}
                      </span>
                    </div>
                  ))}
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
                <button type="button" onClick={importSummerSchedule} disabled={!isAdmin || scheduleImporting} className="mt-4 min-h-11 w-full rounded-lg bg-orange px-4 font-black text-ink disabled:cursor-not-allowed disabled:opacity-40">
                  {scheduleImporting ? "Importing..." : "Import Week 1 Schedule"}
                </button>
                {scheduleImportMessage && <p className="mt-3 rounded-lg bg-graphite/80 p-3 text-sm text-white/70">{scheduleImportMessage}</p>}
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
              <span className="mt-1">{item === "Attendance" ? "RSVP" : item === "Installs" ? "Files" : item}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}

