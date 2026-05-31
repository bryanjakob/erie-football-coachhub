-- CoachHub Staff Supabase setup
-- Run this entire file in Supabase SQL Editor after creating your project.

create extension if not exists pgcrypto;

do $$
begin
  create type coach_role as enum ('Admin', 'Head Coach', 'Varsity Coach', 'JV Coach', 'Volunteer Coach');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type attendance_status as enum ('Yes', 'No', 'Late', 'Pending');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type event_type as enum ('Workout', 'Practice', 'Staff Meeting', 'Camp', 'Game', 'Clinic');
exception
  when duplicate_object then null;
end $$;

create table if not exists coaches (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  email text unique not null,
  full_name text not null,
  role coach_role not null default 'Volunteer Coach',
  position_group text,
  active boolean not null default true,
  invited_by uuid references coaches(id),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  date timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists attendance (
  event_id uuid references events(id) on delete cascade,
  coach_id uuid references coaches(id) on delete cascade,
  status attendance_status not null default 'Pending',
  response_note text,
  updated_at timestamptz not null default now(),
  primary key (event_id, coach_id)
);

create table if not exists rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references events(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  coach_name text not null,
  response text not null check (response in ('Yes', 'No')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

alter table rsvps add column if not exists user_id uuid references auth.users(id) on delete cascade;

do $$
begin
  alter table rsvps drop constraint if exists rsvps_event_id_coach_name_key;
  alter table rsvps add constraint rsvps_event_id_user_id_key unique (event_id, user_id);
exception
  when duplicate_object then null;
end $$;

create table if not exists install_library_files (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  folder text not null,
  file_type text not null,
  storage_path text not null,
  file_size bigint,
  uploaded_by uuid references coaches(id),
  created_at timestamptz not null default now()
);

create table if not exists chat_channels (
  id uuid primary key default gen_random_uuid(),
  name text unique not null
);

create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references chat_channels(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  coach_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

alter table chat_messages add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table chat_messages add column if not exists coach_name text;
alter table chat_messages add column if not exists message text;

do $$
begin
  alter table chat_messages alter column body drop not null;
exception
  when undefined_column then null;
end $$;

do $$
begin
  update chat_messages
  set message = coalesce(message, body)
  where message is null;
exception
  when undefined_column then null;
end $$;

update chat_messages
set coach_name = coalesce(coach_name, 'Coach')
where coach_name is null;

create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  created_by uuid references coaches(id),
  created_at timestamptz not null default now()
);

insert into chat_channels (name)
values
  ('General Staff'),
  ('Offense'),
  ('Defense'),
  ('Special Teams')
on conflict (name) do nothing;

alter table coaches enable row level security;
alter table profiles enable row level security;
alter table events enable row level security;
alter table attendance enable row level security;
alter table rsvps enable row level security;
alter table install_library_files enable row level security;
alter table chat_channels enable row level security;
alter table chat_messages enable row level security;
alter table announcements enable row level security;

create or replace function public.is_staff_member()
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
  )
  or exists (
    select 1
    from profiles
    where id = auth.uid()
  );
$$;

create or replace function public.is_staff_admin()
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
      and role = 'Admin'
      and active = true
  );
$$;

create or replace function public.claim_my_coach_profile()
returns coaches
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed coaches;
begin
  update coaches
  set auth_user_id = auth.uid()
  where auth_user_id is null
    and lower(email) = lower(auth.jwt() ->> 'email')
    and active = true
  returning * into claimed;

  if claimed.id is null then
    select * into claimed
    from coaches
    where auth_user_id = auth.uid()
      and active = true
    limit 1;
  end if;

  return claimed;
end;
$$;

create or replace function public.touch_attendance_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists attendance_touch_updated_at on attendance;
create trigger attendance_touch_updated_at
before update on attendance
for each row
execute function public.touch_attendance_updated_at();

drop policy if exists "staff can read coaches" on coaches;
create policy "staff can read coaches" on coaches
for select to authenticated
using (public.is_staff_member());

drop policy if exists "admins can manage coaches" on coaches;
create policy "admins can manage coaches" on coaches
for all to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

drop policy if exists "staff can read profiles" on profiles;
create policy "staff can read profiles" on profiles
for select to authenticated
using (id = auth.uid() or public.is_staff_member());

drop policy if exists "staff can insert own profile" on profiles;
create policy "staff can insert own profile" on profiles
for insert to authenticated
with check (id = auth.uid());

drop policy if exists "staff can update own profile" on profiles;
create policy "staff can update own profile" on profiles
for update to authenticated
using (id = auth.uid() or public.is_staff_admin())
with check (id = auth.uid() or public.is_staff_admin());

drop policy if exists "staff can read events" on events;
create policy "staff can read events" on events
for select to authenticated
using (public.is_staff_member());

drop policy if exists "admins can manage events" on events;
create policy "admins can manage events" on events
for all to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

drop policy if exists "staff can read attendance" on attendance;
create policy "staff can read attendance" on attendance
for select to authenticated
using (public.is_staff_member());

drop policy if exists "staff can save own attendance" on attendance;
create policy "staff can save own attendance" on attendance
for all to authenticated
using (
  coach_id in (select id from coaches where auth_user_id = auth.uid())
  or public.is_staff_admin()
)
with check (
  coach_id in (select id from coaches where auth_user_id = auth.uid())
  or public.is_staff_admin()
);

drop policy if exists "staff can read rsvps" on rsvps;
create policy "staff can read rsvps" on rsvps
for select to authenticated
using (public.is_staff_member());

drop policy if exists "staff can save rsvps" on rsvps;
create policy "staff can save rsvps" on rsvps
for all to authenticated
using (user_id = auth.uid() or public.is_staff_admin())
with check (user_id = auth.uid() and public.is_staff_member());

drop policy if exists "staff can read install library files" on install_library_files;
create policy "staff can read install library files" on install_library_files
for select to authenticated
using (public.is_staff_member());

drop policy if exists "staff can upload install library metadata" on install_library_files;
create policy "staff can upload install library metadata" on install_library_files
for insert to authenticated
with check (public.is_staff_member());

drop policy if exists "admins can manage install library files" on install_library_files;
create policy "admins can manage install library files" on install_library_files
for all to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

drop policy if exists "staff can read chat channels" on chat_channels;
create policy "staff can read chat channels" on chat_channels
for select to authenticated
using (public.is_staff_member());

drop policy if exists "admins can manage chat channels" on chat_channels;
create policy "admins can manage chat channels" on chat_channels
for all to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

drop policy if exists "staff can read chat messages" on chat_messages;
create policy "staff can read chat messages" on chat_messages
for select to authenticated
using (public.is_staff_member());

drop policy if exists "staff can send chat messages" on chat_messages;
create policy "staff can send chat messages" on chat_messages
for insert to authenticated
with check (user_id = auth.uid() and public.is_staff_member());

drop policy if exists "admins can moderate chat messages" on chat_messages;
create policy "admins can moderate chat messages" on chat_messages
for update to authenticated
using (user_id = auth.uid() or public.is_staff_admin())
with check (user_id = auth.uid() or public.is_staff_admin());

drop policy if exists "staff can read announcements" on announcements;
create policy "staff can read announcements" on announcements
for select to authenticated
using (public.is_staff_member());

drop policy if exists "admins can manage announcements" on announcements;
create policy "admins can manage announcements" on announcements
for all to authenticated
using (public.is_staff_admin())
with check (public.is_staff_admin());

insert into storage.buckets (id, name, public)
values ('install-files', 'install-files', false)
on conflict (id) do nothing;

drop policy if exists "staff can read install objects" on storage.objects;
create policy "staff can read install objects" on storage.objects
for select to authenticated
using (bucket_id = 'install-files' and public.is_staff_member());

drop policy if exists "staff can upload install objects" on storage.objects;
create policy "staff can upload install objects" on storage.objects
for insert to authenticated
with check (bucket_id = 'install-files' and public.is_staff_member());

drop policy if exists "admins can update install objects" on storage.objects;
create policy "admins can update install objects" on storage.objects
for update to authenticated
using (bucket_id = 'install-files' and public.is_staff_admin())
with check (bucket_id = 'install-files' and public.is_staff_admin());

drop policy if exists "admins can delete install objects" on storage.objects;
create policy "admins can delete install objects" on storage.objects
for delete to authenticated
using (bucket_id = 'install-files' and public.is_staff_admin());

do $$
begin
  alter publication supabase_realtime add table profiles;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table events;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table attendance;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table rsvps;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table chat_messages;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table install_library_files;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table coaches;
exception
  when duplicate_object then null;
end $$;
