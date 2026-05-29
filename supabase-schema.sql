create extension if not exists pgcrypto;

create type coach_role as enum ('Head Coach/Admin', 'Coordinator', 'Position Coach');
create type rsvp_status as enum ('Yes', 'No', 'Late', 'Pending');
create type event_type as enum ('Workout', 'Practice', 'Staff Meeting', 'Camp', 'Game', 'Clinic');

create table coaches (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  full_name text not null,
  role coach_role not null default 'Position Coach',
  position_group text,
  active boolean not null default true,
  invited_by uuid references coaches(id),
  created_at timestamptz default now()
);

create table announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_by uuid references coaches(id),
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
  file_size bigint,
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

insert into chat_channels (name)
values
  ('Full Staff'),
  ('Defensive Staff'),
  ('Offensive Staff'),
  ('DBs'),
  ('LBs'),
  ('DL'),
  ('Special Teams')
on conflict (name) do nothing;

alter table coaches enable row level security;
alter table announcements enable row level security;
alter table staff_events enable row level security;
alter table event_rsvps enable row level security;
alter table install_files enable row level security;
alter table chat_channels enable row level security;
alter table chat_messages enable row level security;
alter table message_reads enable row level security;

create or replace function is_staff_member()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from coaches
    where auth_user_id = auth.uid()
      and active = true
  );
$$;

create or replace function is_staff_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from coaches
    where auth_user_id = auth.uid()
      and role = 'Head Coach/Admin'
      and active = true
  );
$$;

create policy "staff can read coaches" on coaches
for select to authenticated
using (is_staff_member() or auth_user_id = auth.uid());

create policy "users can claim matching coach profile" on coaches
for update to authenticated
using (lower(email) = lower(auth.jwt() ->> 'email'))
with check (auth_user_id = auth.uid());

create policy "admins can manage coaches" on coaches
for all to authenticated
using (is_staff_admin())
with check (is_staff_admin());

create policy "staff can read announcements" on announcements
for select to authenticated
using (is_staff_member());

create policy "admins can manage announcements" on announcements
for all to authenticated
using (is_staff_admin())
with check (is_staff_admin());

create policy "staff can read events" on staff_events
for select to authenticated
using (is_staff_member());

create policy "admins can manage events" on staff_events
for all to authenticated
using (is_staff_admin())
with check (is_staff_admin());

create policy "staff can read rsvps" on event_rsvps
for select to authenticated
using (is_staff_member());

create policy "staff can upsert own rsvp" on event_rsvps
for all to authenticated
using (
  coach_id in (select id from coaches where auth_user_id = auth.uid())
  or is_staff_admin()
)
with check (
  coach_id in (select id from coaches where auth_user_id = auth.uid())
  or is_staff_admin()
);

create policy "staff can read install files" on install_files
for select to authenticated
using (is_staff_member());

create policy "staff can upload install metadata" on install_files
for insert to authenticated
with check (is_staff_member());

create policy "admins can manage install files" on install_files
for all to authenticated
using (is_staff_admin())
with check (is_staff_admin());

create policy "staff can read channels" on chat_channels
for select to authenticated
using (is_staff_member());

create policy "admins can manage channels" on chat_channels
for all to authenticated
using (is_staff_admin())
with check (is_staff_admin());

create policy "staff can read messages" on chat_messages
for select to authenticated
using (is_staff_member());

create policy "staff can send messages" on chat_messages
for insert to authenticated
with check (coach_id in (select id from coaches where auth_user_id = auth.uid()));

create policy "admins can moderate messages" on chat_messages
for update to authenticated
using (is_staff_admin())
with check (is_staff_admin());

create policy "staff can manage own reads" on message_reads
for all to authenticated
using (coach_id in (select id from coaches where auth_user_id = auth.uid()))
with check (coach_id in (select id from coaches where auth_user_id = auth.uid()));

insert into storage.buckets (id, name, public)
values ('install-files', 'install-files', false)
on conflict (id) do nothing;

create policy "staff can read install objects" on storage.objects
for select to authenticated
using (bucket_id = 'install-files' and public.is_staff_member());

create policy "staff can upload install objects" on storage.objects
for insert to authenticated
with check (bucket_id = 'install-files' and public.is_staff_member());

create policy "admins can update install objects" on storage.objects
for update to authenticated
using (bucket_id = 'install-files' and public.is_staff_admin())
with check (bucket_id = 'install-files' and public.is_staff_admin());

create policy "admins can delete install objects" on storage.objects
for delete to authenticated
using (bucket_id = 'install-files' and public.is_staff_admin());
