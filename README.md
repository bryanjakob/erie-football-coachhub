# CoachHub Staff

A mobile-first Next.js and Tailwind prototype for a private high school football coaching staff hub.

## What is included

- Invite-only login screen with password reset and persistent-session positioning for Supabase Auth.
- Staff dashboard with upcoming events, attendance summaries, announcements, and quick links.
- RSVP attendance board with Yes, No, Late, and Pending status treatment.
- Monthly calendar, event detail panel, and Google Calendar feed export affordance.
- Install library with football folders, upload/download actions, search, and filters.
- Staff chat channels for Full Staff, Defensive Staff, Offensive Staff, DBs, LBs, DL, and Special Teams.
- Admin panel for coach invites, role management, attendance, files, announcements, and moderation.
- Supabase schema in `supabase-schema.sql` for auth-linked coaches, events, RSVPs, install files, chat, and read receipts.

## Local setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Supabase setup

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the SQL editor.
3. Add the values from Supabase project settings to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Create the first Supabase Auth user for the head coach.
5. Bootstrap the first admin coach row in the SQL editor, replacing the email and auth user id:

```sql
insert into coaches (auth_user_id, email, full_name, role, position_group)
values ('AUTH_USER_UUID', 'coach@school.edu', 'Head Coach', 'Head Coach/Admin', 'Program');
```

6. Configure Auth email templates for coach invites and password resets.
7. For new coaches, create their coach account in the Admin screen, then invite that same email from Supabase Auth or a future Edge Function. When they sign in, the app claims the matching coach profile and all data persists after refresh.

## Deployment

Deploy to Vercel and add the same Supabase environment variables in the Vercel project settings.
