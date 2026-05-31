import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { CoachAccount, CoachProfile } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase server environment variables are missing." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing Supabase access token." }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: userResult, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userResult.user?.email) {
    return NextResponse.json({ error: "Invalid Supabase session." }, { status: 401 });
  }

  const requesterEmail = normalizeEmail(userResult.user.email);
  const { data: requesterRows, error: requesterError } = await adminClient
    .from("coaches")
    .select("id,role,active")
    .or(`auth_user_id.eq.${userResult.user.id},email.eq.${requesterEmail}`)
    .limit(5);

  if (requesterError) {
    return NextResponse.json({ error: requesterError.message }, { status: 500 });
  }

  const requester = requesterRows?.find((coach) => coach.role === "Admin" && coach.active);
  if (!requester) {
    return NextResponse.json({ error: "Only active Admin coaches can view directory debug data." }, { status: 403 });
  }

  const [profilesResult, coachesResult, authUsersResult] = await Promise.all([
    adminClient.from("profiles").select("id,full_name,email,position_group,created_at").order("created_at", { ascending: true }),
    adminClient.from("coaches").select("*").order("created_at", { ascending: true }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  const errors = [
    profilesResult.error ? `Profiles read failed: ${profilesResult.error.message}` : "",
    coachesResult.error ? `Coaches read failed: ${coachesResult.error.message}` : "",
    authUsersResult.error ? `Auth users read failed: ${authUsersResult.error.message}` : ""
  ].filter(Boolean);

  const profiles = (profilesResult.data ?? []) as CoachProfile[];
  const coaches = (coachesResult.data ?? []) as CoachAccount[];
  const authUsers = authUsersResult.data?.users ?? [];

  return NextResponse.json({
    authUsersCount: authUsers.length,
    profilesCount: profiles.length,
    coachesCount: coaches.length,
    authUserEmails: authUsers.map((user) => normalizeEmail(user.email)).filter(Boolean).sort(),
    profileEmails: profiles.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: normalizeEmail(profile.email) || null,
      position_group: profile.position_group
    })),
    coachEmails: coaches.map((coach) => ({
      id: coach.id,
      auth_user_id: coach.auth_user_id,
      full_name: coach.full_name,
      email: normalizeEmail(coach.email) || null,
      role: coach.role,
      position_group: coach.position_group,
      active: coach.active
    })),
    errors
  });
}
