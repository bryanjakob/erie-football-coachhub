"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  installBucket,
  supabase,
  type AnnouncementRecord,
  type ChatChannelRecord,
  type ChatMessageRecord,
  type CoachAccount,
  type CoachRole,
  type AttendanceRecord,
  type EventType,
  type InstallLibraryFileRecord,
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

const navItems: Section[] = ["Home", "Calendar", "Attendance", "Installs", "Chats", "Admin"];
const quickLinks: Section[] = ["Calendar", "Attendance", "Installs", "Chats"];
const eventTypes: EventType[] = ["Workout", "Practice", "Staff Meeting", "Camp", "Game", "Clinic"];
const folders = ["All", "Fronts", "Coverages", "Blitzes", "Run Fits", "Practice Plans", "Drill Cards", "Opponent Scouts"];
const defaultChannels: StaffChannel[] = ["Full Staff", "Defensive Staff", "Offensive Staff", "DBs", "LBs", "DL", "Special Teams"];
const coachRoles: CoachRole[] = ["Admin", "Head Coach", "Varsity Coach", "JV Coach", "Volunteer Coach"];

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
  Yes: "bg-lime/15 text-lime ring-lime/30",
  No: "bg-red-500/15 text-red-200 ring-red-400/30",
  Late: "bg-gold/15 text-gold ring-gold/30",
  Pending: "bg-white/10 text-white/60 ring-white/15"
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
    <div className="rounded-lg border border-line bg-white/[0.045] p-3">
      <div className={`text-2xl font-black ${tone ?? "text-white"}`}>{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase tracking-wide text-white/50">{label}</div>
    </div>
  );
}

function StatusPill({ status }: { status: RSVPStatus }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-bold ring-1 ${statusStyles[status]}`}>{status}</span>;
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

function eventRsvpRequired(event: StaffEventRecord) {
  return event.rsvp_required ?? true;
}

function fileTypeFromMime(mime: string) {
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("image")) return "Image";
  if (mime.includes("video")) return "Video";
  return "File";
}

function fileSize(size: number | null) {
  if (!size) return "Stored";
  if (size > 1024 * 1024) return `${(size / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(size / 1024))} KB`;
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
  onReset,
  onLogout
}: {
  session: Session | null;
  status: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onReset: (email: string) => Promise<void>;
  onLogout: () => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    await onLogin(email, password);
  }

  if (session) {
    return (
      <section className="rounded-lg border border-line bg-white/[0.055] p-4 shadow-glow md:p-5">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime text-ink">
            <Icon name="Lock" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-black">Signed In</h2>
            <p className="truncate text-sm text-white/60">{session.user.email}</p>
          </div>
          <button onClick={onLogout} className="min-h-11 rounded-lg border border-line px-4 text-sm font-bold text-white/80">Sign Out</button>
        </div>
        {status && <p className="mt-3 rounded-lg bg-ink/60 p-3 text-sm text-white/70">{status}</p>}
      </section>
    );
  }

  return (
    <form onSubmit={handleLogin} className="rounded-lg border border-line bg-white/[0.055] p-4 shadow-glow md:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime text-ink">
          <Icon name="Lock" />
        </div>
        <div>
          <h2 className="text-lg font-black">Invite-Only Login</h2>
          <p className="text-sm text-white/60">Supabase Auth keeps coaches signed in on mobile after login.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="coach@school.edu" type="email" required />
        <input value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="Password" type="password" required />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button className="min-h-12 rounded-lg bg-lime px-5 font-black text-ink">Sign In</button>
        <button type="button" onClick={() => onReset(email)} className="min-h-12 rounded-lg border border-line px-5 font-bold text-white/80">Reset Password</button>
      </div>
      {status && <p className="mt-3 rounded-lg bg-ink/60 p-3 text-sm text-white/70">{status}</p>}
    </form>
  );
}

export default function Page() {
  const [section, setSection] = useState<Section>("Home");
  const [session, setSession] = useState<Session | null>(null);
  const [currentCoach, setCurrentCoach] = useState<CoachAccount | null>(null);
  const [coaches, setCoaches] = useState<CoachAccount[]>([]);
  const [events, setEvents] = useState<StaffEventRecord[]>([]);
  const [rsvps, setRsvps] = useState<AttendanceRecord[]>([]);
  const [installFiles, setInstallFiles] = useState<InstallLibraryFileRecord[]>([]);
  const [channels, setChannels] = useState<ChatChannelRecord[]>([]);
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [announcements, setAnnouncements] = useState<AnnouncementRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventDebugMessage, setEventDebugMessage] = useState("");
  const [eventFetchError, setEventFetchError] = useState("");
  const [eventForm, setEventForm] = useState<EventForm>(initialEventForm);
  const [announcementBody, setAnnouncementBody] = useState("");
  const [coachForm, setCoachForm] = useState({ fullName: "", email: "", role: "Varsity Coach" as CoachRole, group: "" });
  const [folder, setFolder] = useState("All");
  const [installTitle, setInstallTitle] = useState("");
  const [installFolder, setInstallFolder] = useState("Fronts");
  const [installUpload, setInstallUpload] = useState<File | null>(null);
  const [installQuery, setInstallQuery] = useState("");
  const [channelName, setChannelName] = useState<StaffChannel>("Full Staff");
  const [messageBody, setMessageBody] = useState("");
  const [messageUpload, setMessageUpload] = useState<File | null>(null);

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
      coachesResult,
      rsvpsResult,
      filesResult,
      channelsResult,
      messagesResult,
      announcementsResult
    ] = await Promise.all([
      client.from("coaches").select("*").eq("active", true).order("created_at", { ascending: true }),
      client.from("attendance").select("*"),
      client.from("install_library_files").select("*").order("created_at", { ascending: false }),
      client.from("chat_channels").select("*").order("name", { ascending: true }),
      client.from("chat_messages").select("*, coaches(full_name)").order("created_at", { ascending: true }),
      client.from("announcements").select("*").order("created_at", { ascending: false }).limit(8)
    ]);

    if (channelsResult.data?.length === 0) {
      await client.from("chat_channels").upsert(defaultChannels.map((name) => ({ name })), { onConflict: "name" });
      const refreshedChannels = await client.from("chat_channels").select("*").order("name", { ascending: true });
      setChannels((refreshedChannels.data ?? []) as ChatChannelRecord[]);
    } else {
      setChannels((channelsResult.data ?? []) as ChatChannelRecord[]);
    }

    setCoaches((coachesResult.data ?? []) as CoachAccount[]);
    setRsvps((rsvpsResult.data ?? []) as AttendanceRecord[]);
    setInstallFiles((filesResult.data ?? []) as InstallLibraryFileRecord[]);
    setMessages((messagesResult.data ?? []) as ChatMessageRecord[]);
    setAnnouncements((announcementsResult.data ?? []) as AnnouncementRecord[]);

    const profile = ((coachesResult.data ?? []) as CoachAccount[]).find((coach) => coach.auth_user_id === activeSession.user.id) ?? null;
    setCurrentCoach(profile);

    const firstError = coachesResult.error || rsvpsResult.error || filesResult.error || channelsResult.error || messagesResult.error || announcementsResult.error;
    if (firstError) {
      setStatus(firstError.message);
    } else if (!profile) {
      setStatus("Signed in, but no active coach profile matches this email. Add the coach in Admin or bootstrap the first Admin row in Supabase.");
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
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "install_library_files" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "coaches" }, () => void loadData(session))
      .on("postgres_changes", { event: "*", schema: "public", table: "announcements" }, () => void loadData(session))
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [fetchEvents, loadData, session]);

  const upcomingEvents = useMemo(
    () => events.filter((event) => new Date(event.date).getTime() >= Date.now() - 86400000).slice(0, 3),
    [events]
  );

  const eventRsvpSummary = useCallback((eventId: string) => {
    const eventRsvps = rsvps.filter((rsvp) => rsvp.event_id === eventId);
    const summary = { Yes: 0, No: 0, Late: 0, Pending: 0 } satisfies Record<RSVPStatus, number>;
    for (const coach of coaches) {
      const response = eventRsvps.find((rsvp) => rsvp.coach_id === coach.id);
      summary[response?.status ?? "Pending"] += 1;
    }
    return summary;
  }, [coaches, rsvps]);

  const myRsvp = useCallback((eventId: string): RSVPStatus => {
    if (!currentCoach) return "Pending";
    return rsvps.find((rsvp) => rsvp.event_id === eventId && rsvp.coach_id === currentCoach.id)?.status ?? "Pending";
  }, [currentCoach, rsvps]);

  const attendancePercent = useMemo(() => {
    const totalSlots = events.length * Math.max(coaches.length, 1);
    if (!totalSlots) return 0;
    const yesLike = rsvps.filter((rsvp) => rsvp.status === "Yes" || rsvp.status === "Late").length;
    return Math.round((yesLike / totalSlots) * 100);
  }, [coaches.length, events.length, rsvps]);

  async function login(email: string, password: string) {
    const client = supabase;
    if (!client) return;
    setStatus("Signing in...");
    const { error } = await client.auth.signInWithPassword({ email, password });
    setStatus(error ? error.message : "Signed in.");
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

  async function respondToEvent(eventId: string, response: RSVPStatus) {
    const client = supabase;
    if (!client || !currentCoach) return;
    const { error } = await client.from("attendance").upsert({
      event_id: eventId,
      coach_id: currentCoach.id,
      status: response,
      updated_at: new Date().toISOString()
    });
    setStatus(error ? error.message : "RSVP saved.");
    await loadData(session);
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

  async function uploadInstall(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    if (!client || !currentCoach || !installUpload) return;
    const cleanName = installUpload.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${installFolder}/${Date.now()}-${cleanName}`;
    const upload = await client.storage.from(installBucket).upload(path, installUpload);
    if (upload.error) {
      setStatus(upload.error.message);
      return;
    }
    const { error } = await client.from("install_library_files").insert({
      title: installTitle || installUpload.name,
      folder: installFolder,
      file_type: fileTypeFromMime(installUpload.type),
      storage_path: path,
      file_size: installUpload.size,
      uploaded_by: currentCoach.id
    });
    setStatus(error ? error.message : "Install file uploaded and saved.");
    if (!error) {
      setInstallTitle("");
      setInstallUpload(null);
    }
    await loadData(session);
  }

  async function downloadInstall(path: string) {
    const client = supabase;
    if (!client) return;
    const { data, error } = await client.storage.from(installBucket).createSignedUrl(path, 60);
    if (error) {
      setStatus(error.message);
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function sendMessage(event: FormEvent) {
    event.preventDefault();
    const client = supabase;
    if (!client || !currentCoach || !selectedChannel || !messageBody.trim()) return;
    let attachmentPath: string | null = null;
    if (messageUpload) {
      const cleanName = messageUpload.name.replace(/[^a-zA-Z0-9._-]/g, "-");
      attachmentPath = `chat/${Date.now()}-${cleanName}`;
      const upload = await client.storage.from(installBucket).upload(attachmentPath, messageUpload);
      if (upload.error) {
        setStatus(upload.error.message);
        return;
      }
    }
    const { error } = await client.from("chat_messages").insert({
      channel_id: selectedChannel.id,
      coach_id: currentCoach.id,
      body: messageBody.trim(),
      attachment_path: attachmentPath
    });
    setStatus(error ? error.message : "Message saved.");
    if (!error) {
      setMessageBody("");
      setMessageUpload(null);
    }
    await loadData(session);
  }

  async function togglePinned(message: ChatMessageRecord) {
    const client = supabase;
    if (!client || !isAdmin) return;
    const { error } = await client.from("chat_messages").update({ pinned: !message.pinned }).eq("id", message.id);
    setStatus(error ? error.message : "Message moderation saved.");
    await loadData(session);
  }

  const filteredFiles = useMemo(
    () => installFiles.filter((file) => (folder === "All" || file.folder === folder) && file.title.toLowerCase().includes(installQuery.toLowerCase())),
    [folder, installFiles, installQuery]
  );

  const currentMessages = useMemo(
    () => messages.filter((message) => message.channel_id === selectedChannel?.id),
    [messages, selectedChannel]
  );

  const coachName = currentCoach?.full_name ?? session?.user.email ?? "Coach";
  const teamName = "Erie Football";
  const nextEvent = upcomingEvents[0];
  const nextSummary = nextEvent ? eventRsvpSummary(nextEvent.id) : { Yes: 0, No: 0, Late: 0, Pending: 0 };

  return (
    <main className="field-markings min-h-screen pb-24 lg:pb-6">
      <div className="mx-auto flex w-full max-w-7xl gap-4 px-3 py-3 sm:px-4 lg:px-6">
        <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 flex-col rounded-lg border border-line bg-ink/80 p-4 backdrop-blur lg:flex">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-lime text-lg font-black text-ink">CH</div>
            <div>
              <h1 className="text-lg font-black">CoachHub</h1>
              <p className="text-xs font-bold uppercase tracking-wide text-white/40">Staff Only</p>
            </div>
          </div>
          <nav className="mt-8 grid gap-2">
            {navItems.map((item) => (
              <button key={item} onClick={() => setSection(item)} className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-left font-bold ${section === item ? "bg-lime text-ink" : "text-white/70 hover:bg-white/10"}`}>
                <Icon name={item} />
                {item}
              </button>
            ))}
          </nav>
          <div className="mt-auto rounded-lg border border-line bg-white/[0.045] p-3">
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">{currentCoach?.role ?? "Coach Profile Needed"}</p>
            <p className="mt-1 font-black">{coachName}</p>
            <p className="text-sm text-white/50">{teamName}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-lg border border-line bg-ink/75 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-lime">{teamName}</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">{section === "Home" ? "Staff Dashboard" : section}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white/[0.045]" title="Notifications"><Icon name="Bell" /></button>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-black text-ink">{initials(currentCoach?.full_name, session?.user.email)}</div>
              </div>
            </div>
            {!isConfigured && <p className="mt-3 rounded-lg border border-gold/30 bg-gold/10 p-3 text-sm font-bold text-gold">Supabase env vars are missing. Add `.env.local` values and restart the app.</p>}
            {loading && <p className="mt-3 rounded-lg bg-white/10 p-3 text-sm text-white/70">Loading persistent staff data...</p>}
            {status && <p className="mt-3 rounded-lg bg-ink/60 p-3 text-sm text-white/70">{status}</p>}
          </header>

          {section === "Home" && (
            <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
              <div className="space-y-4">
                <LoginPanel session={session} status={status} onLogin={login} onReset={resetPassword} onLogout={logout} />
                <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                  {nextEvent ? (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-lime">Next Required RSVP</p>
                          <h2 className="mt-1 text-2xl font-black">{nextEvent.title}</h2>
                          <p className="mt-1 text-sm text-white/60">{formatDateTime(nextEvent.date)}</p>
                        </div>
                        <StatusPill status={myRsvp(nextEvent.id)} />
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-2">
                        {(["Yes", "Late", "No"] as RSVPStatus[]).map((response) => (
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
                    <button key={item} onClick={() => setSection(item)} className="min-h-24 rounded-lg border border-line bg-white/[0.055] p-3 text-left transition hover:border-lime/60">
                      <Icon name={item} />
                      <span className="mt-3 block text-sm font-black">{item}</span>
                    </button>
                  ))}
                </section>
              </div>
              <div className="space-y-4">
                <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                  <h2 className="text-lg font-black">Attendance Summary</h2>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Metric label="Trend" value={`${attendancePercent}%`} tone="text-lime" />
                    <Metric label="Yes" value={`${nextSummary.Yes}`} tone="text-lime" />
                    <Metric label="Late" value={`${nextSummary.Late}`} tone="text-gold" />
                    <Metric label="Pending" value={`${nextSummary.Pending}`} />
                  </div>
                </section>
                <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                  <h2 className="text-lg font-black">Announcements</h2>
                  <div className="mt-3 space-y-3">
                    {announcements.length ? announcements.map((announcement) => (
                      <div key={announcement.id} className="rounded-lg bg-ink/50 p-3 text-sm text-white/75">{announcement.body}</div>
                    )) : <p className="text-sm text-white/60">No announcements yet.</p>}
                  </div>
                </section>
              </div>
            </div>
          )}

          {section === "Attendance" && (
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <form onSubmit={createEvent} className="rounded-lg border border-line bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Create Event</h2>
                  <button type="submit" disabled={eventSubmitting} className="grid h-11 w-11 place-items-center rounded-lg bg-lime text-ink disabled:cursor-wait disabled:opacity-60" title="Create event">
                    {eventSubmitting ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink/30 border-t-ink" /> : <Icon name="Plus" />}
                  </button>
                </div>
                {eventDebugMessage && <p className="mt-3 rounded-lg border border-line bg-ink/70 p-3 text-sm font-bold text-white/80">{eventDebugMessage}</p>}
                <div className="mt-4 grid gap-3">
                  <input value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="Title" required />
                  <select value={eventForm.eventType} onChange={(event) => setEventForm({ ...eventForm, eventType: event.target.value as EventType })} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 focus:ring-2">
                    {eventTypes.map((type) => <option key={type}>{type}</option>)}
                  </select>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input value={eventForm.date} onChange={(event) => setEventForm({ ...eventForm, date: event.target.value })} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 focus:ring-2" type="date" required />
                    <input value={eventForm.time} onChange={(event) => setEventForm({ ...eventForm, time: event.target.value })} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 focus:ring-2" type="time" required />
                  </div>
                  <input value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="Location" />
                  <textarea value={eventForm.notes} onChange={(event) => setEventForm({ ...eventForm, notes: event.target.value })} className="min-h-24 rounded-lg border border-line bg-ink/70 px-4 py-3 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="Notes" />
                  <label className="flex min-h-12 items-center justify-between rounded-lg border border-line bg-ink/70 px-4 text-sm font-bold">
                    Require RSVP responses
                    <input checked={eventForm.rsvpRequired} onChange={(event) => setEventForm({ ...eventForm, rsvpRequired: event.target.checked })} type="checkbox" className="h-5 w-5 accent-lime" />
                  </label>
                </div>
              </form>
              <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                <h2 className="text-xl font-black">Live RSVP Board</h2>
                <div className="mt-4 space-y-3">
                  {eventFetchError && <p className="rounded-lg border border-red-400/30 bg-red-500/15 p-4 text-sm font-bold text-red-100">{eventFetchError}</p>}
                  {!eventFetchError && events.length === 0 && <p className="rounded-lg bg-ink/50 p-4 text-sm text-white/70">No events exist yet. Create one with the form and it will appear here after Supabase saves it.</p>}
                  {events.map((event) => (
                    <div key={event.id} className="rounded-lg bg-ink/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-black">{event.title}</h3>
                          <p className="mt-1 text-sm text-white/60">{formatDateTime(event.date)}</p>
                        </div>
                        <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ring-1 ${eventRsvpRequired(event) ? "bg-lime/15 text-lime ring-lime/30" : "bg-white/10 text-white/60 ring-white/15"}`}>
                          RSVP {eventRsvpRequired(event) ? "Required" : "Optional"}
                        </span>
                      </div>
                      {event.description && <p className="mt-3 whitespace-pre-line text-sm text-white/75">{event.description}</p>}
                      <div className="mt-3 grid grid-cols-3 gap-2">
                        {(["Yes", "Late", "No"] as RSVPStatus[]).map((response) => (
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
              <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Staff Calendar</h2>
                  <div className="grid grid-cols-3 rounded-lg border border-line bg-ink/70 p-1 text-sm font-bold">
                    {["Month", "Week", "Mobile"].map((view) => <button key={view} className="rounded-md px-3 py-2 first:bg-lime first:text-ink">{view}</button>)}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  {events.map((event) => (
                    <article key={event.id} className="rounded-lg border border-line bg-ink/50 p-4">
                      <span className="rounded bg-white/10 px-2 py-1 text-xs font-bold">Event</span>
                      <h3 className="mt-3 text-lg font-black">{event.title}</h3>
                      <p className="mt-1 text-sm text-white/60">{formatDateTime(event.date)}</p>
                      <p className="mt-2 whitespace-pre-line text-sm text-white/70">{event.description}</p>
                    </article>
                  ))}
                </div>
              </section>
              <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                <h2 className="text-xl font-black">Google Calendar</h2>
                <p className="mt-3 text-sm text-white/60">Every event is stored with stable timestamps and optional Google Calendar UID support in Supabase. Add an API route or Edge Function to expose an authenticated ICS feed when you are ready.</p>
              </section>
            </div>
          )}

          {section === "Installs" && (
            <section className="rounded-lg border border-line bg-white/[0.055] p-4">
              <form onSubmit={uploadInstall} className="flex flex-wrap items-end gap-3">
                <div className="min-w-48 flex-1">
                  <label className="text-xs font-bold uppercase tracking-wide text-white/40">Title</label>
                  <input value={installTitle} onChange={(event) => setInstallTitle(event.target.value)} className="mt-1 min-h-11 w-full rounded-lg border border-line bg-ink/70 px-3 text-sm outline-none" placeholder="Install title" />
                </div>
                <div>
                  <label className="text-xs font-bold uppercase tracking-wide text-white/40">Folder</label>
                  <select value={installFolder} onChange={(event) => setInstallFolder(event.target.value)} className="mt-1 min-h-11 rounded-lg border border-line bg-ink/70 px-3 text-sm outline-none">
                    {folders.filter((item) => item !== "All").map((item) => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <input onChange={(event) => setInstallUpload(event.target.files?.[0] ?? null)} className="min-h-11 rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm" type="file" />
                <button disabled={!installUpload} className="flex min-h-11 items-center gap-2 rounded-lg bg-lime px-4 font-black text-ink disabled:opacity-40"><Icon name="Upload" /> Upload</button>
              </form>
              <div className="mt-4 flex min-h-12 items-center gap-3 rounded-lg border border-line bg-ink/70 px-4">
                <Icon name="Search" />
                <input value={installQuery} onChange={(event) => setInstallQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-white/40" placeholder="Search installs, scouts, drill cards" />
              </div>
              <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
                {folders.map((item) => (
                  <button key={item} onClick={() => setFolder(item)} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-bold ${folder === item ? "bg-lime text-ink" : "border border-line bg-ink/60 text-white/70"}`}>{item}</button>
                ))}
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {filteredFiles.map((file) => (
                  <article key={file.id} className="rounded-lg border border-line bg-ink/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-black">{file.title}</h3>
                        <p className="mt-1 text-sm text-white/50">{file.folder} - {file.file_type} - {fileSize(file.file_size)}</p>
                      </div>
                      <button type="button" onClick={() => downloadInstall(file.storage_path)} className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line" title={`Download ${file.title}`}><Icon name="Download" /></button>
                    </div>
                    <div className="mt-4 text-xs font-bold uppercase tracking-wide text-white/40">Uploaded {formatDateTime(file.created_at)}</div>
                  </article>
                ))}
              </div>
            </section>
          )}

          {section === "Chats" && (
            <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
              <section className="rounded-lg border border-line bg-white/[0.055] p-3">
                <h2 className="px-1 pb-2 text-lg font-black">Channels</h2>
                <div className="grid gap-2">
                  {(channels.length ? channels : defaultChannels.map((name, index) => ({ id: `${index}`, name } as ChatChannelRecord))).map((channel) => (
                    <button key={channel.id} onClick={() => setChannelName(channel.name)} className={`min-h-12 rounded-lg px-3 text-left text-sm font-black ${channel.name === channelName ? "bg-lime text-ink" : "bg-ink/50 text-white/75"}`}>{channel.name}</button>
                  ))}
                </div>
              </section>
              <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">{channelName}</h2>
                  <span className="rounded-full bg-lime/15 px-3 py-1 text-xs font-black text-lime">Realtime</span>
                </div>
                <div className="mt-4 space-y-3">
                  {currentMessages.map((message) => (
                    <div key={message.id} className="rounded-lg bg-ink/50 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-black">{message.coaches?.full_name ?? "Coach"}</span>
                        <span className="text-xs font-bold text-white/40">{formatDateTime(message.created_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/75">{message.body}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.pinned && <span className="rounded bg-gold/15 px-2 py-1 text-xs font-black text-gold">Pinned</span>}
                        {message.attachment_path && <button onClick={() => downloadInstall(message.attachment_path ?? "")} className="rounded bg-white/10 px-2 py-1 text-xs font-black">Attachment</button>}
                        {isAdmin && <button onClick={() => togglePinned(message)} className="rounded border border-line px-2 py-1 text-xs font-black">{message.pinned ? "Unpin" : "Pin"}</button>}
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input value={messageBody} onChange={(event) => setMessageBody(event.target.value)} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder={`Message ${channelName}`} />
                  <input onChange={(event) => setMessageUpload(event.target.files?.[0] ?? null)} className="min-h-12 rounded-lg border border-line bg-ink/70 px-3 py-2 text-sm" type="file" />
                  <button className="min-h-12 rounded-lg bg-lime px-5 font-black text-ink">Send</button>
                </form>
              </section>
            </div>
          )}

          {section === "Admin" && (
            <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
              <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                <h2 className="text-xl font-black">Coach Accounts</h2>
                <form onSubmit={inviteCoach} className="mt-4 grid gap-3">
                  <input value={coachForm.fullName} onChange={(event) => setCoachForm({ ...coachForm, fullName: event.target.value })} className="min-h-11 rounded-lg border border-line bg-ink/70 px-3 text-sm outline-none" placeholder="Full name" required />
                  <input value={coachForm.email} onChange={(event) => setCoachForm({ ...coachForm, email: event.target.value })} className="min-h-11 rounded-lg border border-line bg-ink/70 px-3 text-sm outline-none" placeholder="Email" type="email" required />
                  <div className="grid gap-3 sm:grid-cols-2">
                    <select value={coachForm.role} onChange={(event) => setCoachForm({ ...coachForm, role: event.target.value as CoachRole })} className="min-h-11 rounded-lg border border-line bg-ink/70 px-3 text-sm outline-none">
                      {coachRoles.map((role) => <option key={role}>{role}</option>)}
                    </select>
                    <input value={coachForm.group} onChange={(event) => setCoachForm({ ...coachForm, group: event.target.value })} className="min-h-11 rounded-lg border border-line bg-ink/70 px-3 text-sm outline-none" placeholder="Position group" />
                  </div>
                  <button disabled={!isAdmin} className="min-h-11 rounded-lg bg-lime px-4 font-black text-ink disabled:opacity-40">Invite Coach</button>
                </form>
                <div className="mt-4 space-y-3">
                  {coaches.map((coach) => (
                    <div key={coach.id} className="flex min-h-16 items-center justify-between gap-3 rounded-lg bg-ink/50 px-3">
                      <div>
                        <div className="font-black">{coach.full_name}</div>
                        <div className="text-sm text-white/50">{coach.role} - {coach.position_group ?? "Staff"} - {coach.email}</div>
                      </div>
                      <StatusPill status={coach.auth_user_id ? "Yes" : "Pending"} />
                    </div>
                  ))}
                </div>
              </section>
              <section className="rounded-lg border border-line bg-white/[0.055] p-4">
                <h2 className="text-xl font-black">Announcements</h2>
                <form onSubmit={postAnnouncement} className="mt-4 grid gap-3">
                  <textarea value={announcementBody} onChange={(event) => setAnnouncementBody(event.target.value)} className="min-h-28 rounded-lg border border-line bg-ink/70 px-4 py-3 text-sm outline-none" placeholder="Staff announcement" />
                  <button disabled={!isAdmin} className="min-h-11 rounded-lg bg-lime px-4 font-black text-ink disabled:opacity-40">Send Announcement</button>
                </form>
                <div className="mt-4 grid gap-3">
                  {["Create/edit events", "Manage attendance", "Upload install files", "Moderate chats", "Review push notifications"].map((action) => (
                    <div key={action} className="min-h-14 rounded-lg border border-line bg-ink/50 px-4 py-4 text-left font-bold text-white/80">{action}</div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-ink/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-6 gap-1">
          {navItems.map((item) => (
            <button key={item} onClick={() => setSection(item)} className={`grid min-h-14 place-items-center rounded-lg text-[11px] font-bold ${section === item ? "bg-lime text-ink" : "text-white/60"}`}>
              <Icon name={item} />
              <span className="mt-1">{item === "Attendance" ? "RSVP" : item === "Installs" ? "Files" : item}</span>
            </button>
          ))}
        </div>
      </nav>
    </main>
  );
}
