create type coach_role as enum ('Head Coach/Admin', 'Coordinator', 'Position Coach');
create type rsvp_status as enum ('Yes', 'No', 'Late', 'Pending');
create type event_type as enum ('Workout', 'Practice', 'Staff Meeting', 'Camp', 'Game', 'Clinic');

create table coaches (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role coach_role not null default 'Position Coach',
  position_group text,
  invited_by uuid references coaches(id),
  created_at timestamptz default now()
);

create table staff_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  event_type event_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  rsvp_required boolean default false,
  google_calendar_uid text,
  created_by uuid references coaches(id),
  created_at timestamptz default now()
);

create table event_rsvps (
  event_id uuid references staff_events(id) on delete cascade,
  coach_id uuid references coaches(id) on delete cascade,
  status rsvp_status not null default 'Pending',
  response_note text,
  updated_at timestamptz default now(),
  primary key (event_id, coach_id)
);

create table install_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  folder text not null,
  file_type text not null,
  storage_path text not null,
  uploaded_by uuid references coaches(id),
  created_at timestamptz default now()
);

create table chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  coach_id uuid references coaches(id),
  body text not null,
  attachment_path text,
  pinned boolean default false,
  created_at timestamptz default now()
);

create table message_reads (
  message_id uuid references chat_messages(id) on delete cascade,
  coach_id uuid references coaches(id) on delete cascade,
  read_at timestamptz default now(),
  primary key (message_id, coach_id)
);
