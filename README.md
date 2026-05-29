# CoachHub Staff

A mobile-first private staff hub for Erie Football coaches. The app uses Next.js, Tailwind CSS, Supabase Auth, Supabase Postgres, Supabase Realtime, and Supabase Storage.

## Features

- Supabase Auth login, password reset, persistent mobile sessions, and invite-only coach accounts.
- Admin coach invite flow using a server-only Supabase service role key.
- Roles: Admin, Head Coach, Varsity Coach, JV Coach, Volunteer Coach.
- Persistent tables for coaches, events, attendance, chat messages, and install library files.
- Realtime refresh for events, attendance, chat messages, install files, coaches, and announcements.
- Private Supabase Storage bucket for install files and chat attachments.

## Local Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## 1. Create The Tables In Supabase

1. Open your Supabase project.
2. Go to `SQL Editor`.
3. Create a new query.
4. Paste the contents of `supabase-schema.sql`.
5. Click `Run`.

The script creates:

- `coaches`
- `events`
- `attendance`
- `chat_messages`
- `install_library_files`
- Supporting tables: `chat_channels` and `announcements`
- Role/status/event enums
- Row Level Security policies
- Realtime publication entries
- Private Storage bucket: `install-files`
- Storage policies for authenticated staff
- RPC helper: `claim_my_coach_profile`

## 2. Run SQL Scripts

Run `supabase-schema.sql` once for a fresh project. It is written to be safely rerunnable for normal setup changes.

Important: if your Supabase project already has conflicting enum values from an older prototype, create a fresh project or manually drop the older prototype tables/enums first.

## 3. Disable Public Signups

In Supabase:

1. Go to `Authentication`.
2. Open `Providers`.
3. Open `Email`.
4. Turn off public email signups if your dashboard exposes that toggle.
5. Keep email login and invite emails enabled.

The app itself does not expose a signup screen. New coach access is created only through the Admin invite flow.

## 4. Add Environment Variables

Create `.env.local` for local development:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

Find these in Supabase under `Project Settings` > `API`.

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client code. It is used only by `app/api/invite-coach/route.ts`.

## 5. Create The First Admin Account

1. In Supabase, go to `Authentication` > `Users`.
2. Click `Add user`.
3. Create the first admin user with email and password.
4. Copy that user's UUID.
5. Run this SQL, replacing the UUID and email:

```sql
insert into coaches (auth_user_id, email, full_name, role, position_group)
values (
  'AUTH_USER_UUID',
  'admin@school.edu',
  'Admin Coach',
  'Admin',
  'Program'
)
on conflict (email) do update
set
  auth_user_id = excluded.auth_user_id,
  full_name = excluded.full_name,
  role = excluded.role,
  position_group = excluded.position_group,
  active = true;
```

6. Sign into the app with that admin email and password.
7. Open `Admin`.
8. Invite additional coaches by email and assign their role.

When invited coaches accept the Supabase Auth invite and sign in, the app claims their matching row in `coaches` and all their events, attendance, chat, and files persist after refresh.

## 6. Connect Supabase To Vercel

1. Push this repository to GitHub.
2. In Vercel, create a new project from the GitHub repository.
3. Open the Vercel project settings.
4. Go to `Environment Variables`.
5. Add:

```bash
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

6. Redeploy the Vercel project after adding variables.

## 7. Supabase Auth URL Settings

In Supabase:

1. Go to `Authentication` > `URL Configuration`.
2. Set `Site URL` to your Vercel production URL.
3. Add redirect URLs for local and production:

```text
http://localhost:3000
https://YOUR-VERCEL-PROJECT.vercel.app
```

## Data Persistence

All app screens use live Supabase queries. There is no mock/demo data in the application runtime. Data remains after refresh because it is stored in Supabase Postgres or Supabase Storage.
