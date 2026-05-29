"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { CoachRole, RSVPStatus, StaffChannel } from "@/lib/supabase";

type Section = "Home" | "Calendar" | "Attendance" | "Installs" | "Chats" | "Admin";

type EventType = "Workout" | "Practice" | "Staff Meeting" | "Camp" | "Game" | "Clinic";

type StaffEvent = {
  id: number;
  title: string;
  type: EventType;
  date: string;
  time: string;
  location: string;
  notes: string;
  required: boolean;
  yes: number;
  no: number;
  late: number;
  pending: number;
};

type InstallFile = {
  title: string;
  folder: string;
  type: "PDF" | "Image" | "Video" | "Screenshot";
  updated: string;
  size: string;
};

const navItems: Section[] = ["Home", "Calendar", "Attendance", "Installs", "Chats", "Admin"];

const quickLinks: Section[] = ["Calendar", "Attendance", "Installs", "Chats"];

const coach = {
  name: "Coach Daniels",
  role: "Head Coach/Admin" as CoachRole,
  team: "North Valley Football",
  initials: "CD"
};

const events: StaffEvent[] = [
  {
    id: 1,
    title: "Varsity Summer Lift",
    type: "Workout",
    date: "Today",
    time: "6:15 AM",
    location: "Weight Room",
    notes: "Bring attendance groups. OL/DL finish with sled pushes.",
    required: true,
    yes: 9,
    no: 1,
    late: 2,
    pending: 2
  },
  {
    id: 2,
    title: "Defensive Install: Field Pressure",
    type: "Practice",
    date: "Fri, May 29",
    time: "4:00 PM",
    location: "Team Room",
    notes: "Review blitz tape before walkthrough.",
    required: true,
    yes: 11,
    no: 0,
    late: 1,
    pending: 2
  },
  {
    id: 3,
    title: "7v7 Camp Staff Meeting",
    type: "Staff Meeting",
    date: "Mon, Jun 1",
    time: "7:30 PM",
    location: "Fieldhouse",
    notes: "Finalize rotations, water stations, and install limits.",
    required: false,
    yes: 10,
    no: 2,
    late: 0,
    pending: 2
  }
];

const announcements = [
  "Update attendance before leaving campus today.",
  "Opponent scout folder has new clips from East Ridge.",
  "Special Teams will meet 20 minutes before Friday walkthrough."
];

const attendanceNames = [
  ["Coach Price", "Yes"],
  ["Coach Miller", "Yes"],
  ["Coach Lopez", "Late"],
  ["Coach Reed", "No"],
  ["Coach Hampton", "Pending"],
  ["Coach Avery", "Pending"]
] as const;

const installs: InstallFile[] = [
  { title: "Mint Front Checks", folder: "Fronts", type: "PDF", updated: "Today", size: "4.8 MB" },
  { title: "Cover 7 Match Rules", folder: "Coverages", type: "PDF", updated: "Yesterday", size: "6.1 MB" },
  { title: "Boundary Fire Zone", folder: "Blitzes", type: "Video", updated: "May 24", size: "128 MB" },
  { title: "Inside Zone Fits", folder: "Run Fits", type: "Image", updated: "May 22", size: "2.2 MB" },
  { title: "Practice Plan Week 1", folder: "Practice Plans", type: "PDF", updated: "May 21", size: "1.7 MB" },
  { title: "DB Press Drill Cards", folder: "Drill Cards", type: "Screenshot", updated: "May 19", size: "900 KB" },
  { title: "East Ridge Scout", folder: "Opponent Scouts", type: "PDF", updated: "May 18", size: "9.4 MB" }
];

const folders = ["All", "Fronts", "Coverages", "Blitzes", "Run Fits", "Practice Plans", "Drill Cards", "Opponent Scouts"];

const channels: StaffChannel[] = ["Full Staff", "Defensive Staff", "Offensive Staff", "DBs", "LBs", "DL", "Special Teams"];

const messages = [
  { channel: "Full Staff", from: "Head Coach", body: "Pinning updated June calendar. RSVP for all required dates.", time: "9:02 AM", pinned: true, reads: 13 },
  { channel: "Defensive Staff", from: "DC", body: "Uploaded pressure install. Check the field/boundary tags before Friday.", time: "8:41 AM", pinned: false, reads: 7 },
  { channel: "Special Teams", from: "STC", body: "Need punt shield alignment screenshots from last clinic.", time: "Yesterday", pinned: false, reads: 5 }
];

const coaches = [
  { name: "Marcus Daniels", role: "Head Coach/Admin", group: "Program" },
  { name: "Ty Price", role: "Coordinator", group: "Defense" },
  { name: "Grant Miller", role: "Coordinator", group: "Offense" },
  { name: "Eli Lopez", role: "Position Coach", group: "DBs" },
  { name: "Andre Reed", role: "Position Coach", group: "DL" }
];

const statusStyles: Record<RSVPStatus, string> = {
  Yes: "bg-lime/15 text-lime ring-lime/30",
  No: "bg-red-500/15 text-red-200 ring-red-400/30",
  Late: "bg-gold/15 text-gold ring-gold/30",
  Pending: "bg-white/10 text-white/60 ring-white/15"
};

function Icon({ name }: { name: Section | "Bell" | "Lock" | "Upload" | "Download" | "Search" | "Plus" }) {
  const common = "h-5 w-5";
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
    <svg className={common} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

function LoginPanel() {
  return (
    <section className="rounded-lg border border-line bg-white/[0.055] p-4 shadow-glow md:p-5">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg bg-lime text-ink">
          <Icon name="Lock" />
        </div>
        <div>
          <h2 className="text-lg font-black">Invite-Only Login</h2>
          <p className="text-sm text-white/60">Supabase Auth ready for magic links, passwords, reset flow, and persistent mobile sessions.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <input className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="coach@school.edu" />
        <input className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="Password" type="password" />
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
        <button className="min-h-12 rounded-lg bg-lime px-5 font-black text-ink">Sign In</button>
        <button className="min-h-12 rounded-lg border border-line px-5 font-bold text-white/80">Reset Password</button>
      </div>
    </section>
  );
}

function HomeScreen({ setSection }: { setSection: (section: Section) => void }) {
  const nextEvent = events[0];
  return (
    <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-4">
        <LoginPanel />
        <section className="rounded-lg border border-line bg-white/[0.055] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-lime">Next Required RSVP</p>
              <h2 className="mt-1 text-2xl font-black">{nextEvent.title}</h2>
              <p className="mt-1 text-sm text-white/60">{nextEvent.date} at {nextEvent.time} · {nextEvent.location}</p>
            </div>
            <StatusPill status="Pending" />
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {(["Yes", "Late", "No"] as RSVPStatus[]).map((status) => (
              <button key={status} className={`min-h-14 rounded-lg text-sm font-black ring-1 ${statusStyles[status]}`}>{status}</button>
            ))}
          </div>
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
            <Metric label="Yes" value="71%" tone="text-lime" />
            <Metric label="Late" value="14%" tone="text-gold" />
            <Metric label="No" value="7%" tone="text-red-200" />
            <Metric label="Pending" value="8%" />
          </div>
        </section>
        <section className="rounded-lg border border-line bg-white/[0.055] p-4">
          <h2 className="text-lg font-black">Announcements</h2>
          <div className="mt-3 space-y-3">
            {announcements.map((item) => (
              <div key={item} className="rounded-lg bg-ink/50 p-3 text-sm text-white/75">{item}</div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function AttendanceScreen() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Create Event</h2>
          <button className="grid h-11 w-11 place-items-center rounded-lg bg-lime text-ink" title="Create event"><Icon name="Plus" /></button>
        </div>
        <div className="mt-4 grid gap-3">
          {["Title", "Date", "Time", "Location"].map((field) => (
            <input key={field} className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder={field} />
          ))}
          <textarea className="min-h-24 rounded-lg border border-line bg-ink/70 px-4 py-3 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder="Notes" />
          <label className="flex min-h-12 items-center justify-between rounded-lg border border-line bg-ink/70 px-4 text-sm font-bold">
            Require RSVP responses
            <input type="checkbox" className="h-5 w-5 accent-lime" defaultChecked />
          </label>
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <h2 className="text-xl font-black">Live RSVP Board</h2>
        <div className="mt-4 space-y-3">
          {attendanceNames.map(([name, status]) => (
            <div key={name} className="flex min-h-14 items-center justify-between rounded-lg bg-ink/50 px-3">
              <span className="font-bold">{name}</span>
              <StatusPill status={status} />
            </div>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          <Metric label="Yes" value="9" tone="text-lime" />
          <Metric label="Late" value="2" tone="text-gold" />
          <Metric label="No" value="1" tone="text-red-200" />
          <Metric label="Open" value="2" />
        </div>
      </section>
    </div>
  );
}

function CalendarScreen() {
  const days = Array.from({ length: 35 }, (_, index) => index + 1);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-black">May 2026</h2>
          <div className="grid grid-cols-3 rounded-lg border border-line bg-ink/70 p-1 text-sm font-bold">
            {["Month", "Week", "Mobile"].map((view) => <button key={view} className="rounded-md px-3 py-2 first:bg-lime first:text-ink">{view}</button>)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase text-white/40">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <div key={day}>{day}</div>)}
        </div>
        <div className="mt-2 grid grid-cols-7 gap-2">
          {days.map((day) => (
            <button key={day} className={`min-h-20 rounded-lg border border-line p-2 text-left text-sm ${[28, 29, 31].includes(day) ? "bg-lime/10 ring-1 ring-lime/30" : "bg-ink/50"}`}>
              <span className="font-black">{day}</span>
              {day === 28 && <span className="mt-2 block rounded bg-lime px-1.5 py-1 text-xs font-black text-ink">Lift</span>}
              {day === 29 && <span className="mt-2 block rounded bg-gold px-1.5 py-1 text-xs font-black text-ink">Install</span>}
              {day === 31 && <span className="mt-2 block rounded bg-white/15 px-1.5 py-1 text-xs font-black">Clinic</span>}
            </button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <h2 className="text-xl font-black">Event Details</h2>
        <div className="mt-4 space-y-3">
          {events.map((event) => (
            <div key={event.id} className="rounded-lg bg-ink/50 p-3">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-black">{event.title}</h3>
                <span className="rounded bg-white/10 px-2 py-1 text-xs font-bold">{event.type}</span>
              </div>
              <p className="mt-2 text-sm text-white/60">{event.date} · {event.time} · {event.location}</p>
              <p className="mt-2 text-sm text-white/70">{event.notes}</p>
            </div>
          ))}
        </div>
        <button className="mt-4 min-h-12 w-full rounded-lg border border-lime/40 bg-lime/10 font-black text-lime">Export Google Calendar Feed</button>
      </section>
    </div>
  );
}

function InstallScreen() {
  const [folder, setFolder] = useState("All");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => installs.filter((file) => (folder === "All" || file.folder === folder) && file.title.toLowerCase().includes(query.toLowerCase())), [folder, query]);

  return (
    <section className="rounded-lg border border-line bg-white/[0.055] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">Install Library</h2>
        <button className="flex min-h-11 items-center gap-2 rounded-lg bg-lime px-4 font-black text-ink"><Icon name="Upload" /> Upload</button>
      </div>
      <div className="mt-4 flex min-h-12 items-center gap-3 rounded-lg border border-line bg-ink/70 px-4">
        <Icon name="Search" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-sm outline-none placeholder:text-white/40" placeholder="Search installs, scouts, drill cards" />
      </div>
      <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1">
        {folders.map((item) => (
          <button key={item} onClick={() => setFolder(item)} className={`min-h-11 shrink-0 rounded-lg px-4 text-sm font-bold ${folder === item ? "bg-lime text-ink" : "border border-line bg-ink/60 text-white/70"}`}>{item}</button>
        ))}
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((file) => (
          <article key={file.title} className="rounded-lg border border-line bg-ink/50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-black">{file.title}</h3>
                <p className="mt-1 text-sm text-white/50">{file.folder} · {file.type} · {file.size}</p>
              </div>
              <button className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-line" title={`Download ${file.title}`}><Icon name="Download" /></button>
            </div>
            <div className="mt-4 flex items-center justify-between text-xs font-bold uppercase tracking-wide text-white/40">
              <span>Updated {file.updated}</span>
              <span>Mobile view</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ChatsScreen() {
  const [channel, setChannel] = useState<StaffChannel>("Full Staff");
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="rounded-lg border border-line bg-white/[0.055] p-3">
        <h2 className="px-1 pb-2 text-lg font-black">Channels</h2>
        <div className="grid gap-2">
          {channels.map((item) => (
            <button key={item} onClick={() => setChannel(item)} className={`min-h-12 rounded-lg px-3 text-left text-sm font-black ${channel === item ? "bg-lime text-ink" : "bg-ink/50 text-white/75"}`}>{item}</button>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">{channel}</h2>
          <span className="rounded-full bg-lime/15 px-3 py-1 text-xs font-black text-lime">Realtime</span>
        </div>
        <div className="mt-4 space-y-3">
          {messages.map((message) => (
            <div key={`${message.from}-${message.time}`} className="rounded-lg bg-ink/50 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-black">{message.from}</span>
                <span className="text-xs font-bold text-white/40">{message.time} · {message.reads} read</span>
              </div>
              <p className="mt-2 text-sm text-white/75">{message.body}</p>
              {message.pinned && <span className="mt-3 inline-block rounded bg-gold/15 px-2 py-1 text-xs font-black text-gold">Pinned</span>}
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
          <input className="min-h-12 rounded-lg border border-line bg-ink/70 px-4 text-sm outline-none ring-lime/40 placeholder:text-white/40 focus:ring-2" placeholder={`Message ${channel}`} />
          <button className="min-h-12 rounded-lg border border-line px-4 font-bold">Attach</button>
          <button className="min-h-12 rounded-lg bg-lime px-5 font-black text-ink">Send</button>
        </div>
      </section>
    </div>
  );
}

function AdminScreen() {
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-black">Coach Accounts</h2>
          <button className="min-h-11 rounded-lg bg-lime px-4 font-black text-ink">Invite Coach</button>
        </div>
        <div className="mt-4 space-y-3">
          {coaches.map((item) => (
            <div key={item.name} className="flex min-h-16 items-center justify-between gap-3 rounded-lg bg-ink/50 px-3">
              <div>
                <div className="font-black">{item.name}</div>
                <div className="text-sm text-white/50">{item.role} · {item.group}</div>
              </div>
              <button className="rounded-lg border border-line px-3 py-2 text-sm font-bold text-white/70">Edit</button>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-lg border border-line bg-white/[0.055] p-4">
        <h2 className="text-xl font-black">Admin Controls</h2>
        <div className="mt-4 grid gap-3">
          {["Send announcement", "Create or edit events", "Manage attendance records", "Upload install files", "Moderate pinned chats", "Review push notifications"].map((action) => (
            <button key={action} className="min-h-14 rounded-lg border border-line bg-ink/50 px-4 text-left font-bold text-white/80">{action}</button>
          ))}
        </div>
      </section>
    </div>
  );
}

function CurrentSection({ section, setSection }: { section: Section; setSection: (section: Section) => void }) {
  if (section === "Home") return <HomeScreen setSection={setSection} />;
  if (section === "Calendar") return <CalendarScreen />;
  if (section === "Attendance") return <AttendanceScreen />;
  if (section === "Installs") return <InstallScreen />;
  if (section === "Chats") return <ChatsScreen />;
  return <AdminScreen />;
}

export default function Page() {
  const [section, setSection] = useState<Section>("Home");

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
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">{coach.role}</p>
            <p className="mt-1 font-black">{coach.name}</p>
            <p className="text-sm text-white/50">{coach.team}</p>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="mb-4 rounded-lg border border-line bg-ink/75 p-4 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-lime">{coach.team}</p>
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">{section === "Home" ? "Staff Dashboard" : section}</h1>
              </div>
              <div className="flex items-center gap-2">
                <button className="grid h-11 w-11 place-items-center rounded-lg border border-line bg-white/[0.045]" title="Notifications"><Icon name="Bell" /></button>
                <div className="grid h-11 w-11 place-items-center rounded-lg bg-white text-sm font-black text-ink">{coach.initials}</div>
              </div>
            </div>
          </header>
          <CurrentSection section={section} setSection={setSection} />
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
