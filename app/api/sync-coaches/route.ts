import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { positionGroups, type CoachAccount, type CoachProfile, type PositionGroup } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const unassignedPositionGroup: PositionGroup = "Unassigned";

type AuthUserSummary = {
  id: string;
  email: string | null;
  fullName: string | null;
  positionGroup: PositionGroup | null;
};

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() ?? "";
}

function validPositionGroup(value?: string | null): PositionGroup | null {
  if (!value) return null;
  return positionGroups.includes(value as PositionGroup) ? (value as PositionGroup) : null;
}

function coachPositionGroup(value?: string | null) {
  return validPositionGroup(value) ?? unassignedPositionGroup;
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
    return NextResponse.json({ error: "Only active Admin coaches can sync the coach directory." }, { status: 403 });
  }

  const [
    profilesResult,
    coachesResult,
    authUsersResult
  ] = await Promise.all([
    adminClient.from("profiles").select("id,full_name,email,position_group,created_at"),
    adminClient.from("coaches").select("*").order("created_at", { ascending: true }),
    adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }
  if (coachesResult.error) {
    return NextResponse.json({ error: coachesResult.error.message }, { status: 500 });
  }

  const errors: string[] = [];
  if (authUsersResult.error) {
    errors.push(`Auth users read failed: ${authUsersResult.error.message}`);
  }

  let profiles = (profilesResult.data ?? []) as CoachProfile[];
  let coaches = (coachesResult.data ?? []) as CoachAccount[];
  const authUsers: AuthUserSummary[] = (authUsersResult.data?.users ?? []).map((user) => ({
    id: user.id,
    email: user.email ?? null,
    fullName: typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name.trim()
      : [user.user_metadata?.first_name, user.user_metadata?.last_name].filter((value) => typeof value === "string" && value.trim()).join(" ").trim() || null,
    positionGroup: coachPositionGroup(typeof user.user_metadata?.position_group === "string" ? user.user_metadata.position_group : null)
  }));
  const authEmailById = new Map(authUsers.map((user) => [user.id, normalizeEmail(user.email)]));
  const existingCoachesCount = coaches.length;
  const existingCoachKeys = new Set(
    coaches.flatMap((coach) => [normalizeEmail(coach.email), coach.auth_user_id ?? ""]).filter(Boolean)
  );
  let createdProfilesCount = 0;
  let createdCoachRecordsCount = 0;
  let syncedCoachesCount = 0;

  for (const authUser of authUsers) {
    if (profiles.some((profile) => profile.id === authUser.id)) continue;

    const email = normalizeEmail(authUser.email);
    if (!email || !authUser.fullName || !authUser.positionGroup) continue;

    const { data: profile, error } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: authUser.id,
          email,
          full_name: authUser.fullName,
          position_group: authUser.positionGroup
        },
        { onConflict: "id" }
      )
      .select("id,full_name,email,position_group,created_at")
      .single();

    if (error) {
      errors.push(`${authUser.fullName}: profile backfill failed: ${error.message}`);
      continue;
    }

    createdProfilesCount += 1;
    profiles = [...profiles, profile as CoachProfile];
  }

  for (const profile of profiles) {
    const email = normalizeEmail(profile.email) || authEmailById.get(profile.id) || "";
    const fullName = profile.full_name?.trim();
    const positionGroup = coachPositionGroup(profile.position_group);

    if (!email || !fullName) {
      errors.push(`Skipped ${fullName || profile.id}: missing email or full name.`);
      continue;
    }

    const existingCoach =
      coaches.find((coach) => coach.auth_user_id === profile.id) ??
      coaches.find((coach) => normalizeEmail(coach.email) === email) ??
      null;

    if (existingCoach) {
      const { data: updatedCoach, error } = await adminClient
        .from("coaches")
        .update({
          auth_user_id: existingCoach.auth_user_id ?? profile.id,
          email,
          full_name: fullName,
          position_group: positionGroup,
          active: true
        })
        .eq("id", existingCoach.id)
        .select("*")
        .single();

      if (error) {
        errors.push(`${fullName}: ${error.message}`);
        continue;
      }

      syncedCoachesCount += 1;
      coaches = coaches.map((coach) => coach.id === existingCoach.id ? (updatedCoach as CoachAccount) : coach);
      continue;
    }

    const wasExistingBeforeSync = existingCoachKeys.has(email) || existingCoachKeys.has(profile.id);
    const { data: insertedCoach, error } = await adminClient
      .from("coaches")
      .insert({
        auth_user_id: profile.id,
        email,
        full_name: fullName,
        position_group: positionGroup,
        role: "Coach",
        active: true
      })
      .select("*")
      .single();

    if (error) {
      errors.push(`${fullName}: ${error.message}`);
      continue;
    }

    syncedCoachesCount += 1;
    if (!wasExistingBeforeSync) createdCoachRecordsCount += 1;
    coaches = [...coaches, insertedCoach as CoachAccount];
  }

  const refreshedCoachesResult = await adminClient
    .from("coaches")
    .select("*")
    .order("created_at", { ascending: true });

  if (refreshedCoachesResult.error) {
    errors.push(`Final coaches refresh failed: ${refreshedCoachesResult.error.message}`);
  } else {
    coaches = (refreshedCoachesResult.data ?? []) as CoachAccount[];
  }

  const missingProfilesAfterSync = profiles
    .filter((profile) => {
      const email = normalizeEmail(profile.email) || authEmailById.get(profile.id) || "";
      return !coaches.some((coach) => coach.auth_user_id === profile.id || normalizeEmail(coach.email) === email);
    })
    .map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: normalizeEmail(profile.email) || authEmailById.get(profile.id) || null,
      position_group: profile.position_group
    }));

  return NextResponse.json({
    syncedCoachesCount,
    createdProfilesCount,
    createdCoachRecordsCount,
    existingCoachesCount,
    profilesCount: profiles.length,
    coachesCount: coaches.length,
    authUsersCount: authUsers.length,
    authUserEmails: authUsers.map((user) => normalizeEmail(user.email)).filter(Boolean).sort(),
    profileEmails: profiles.map((profile) => ({
      id: profile.id,
      full_name: profile.full_name,
      email: normalizeEmail(profile.email) || authEmailById.get(profile.id) || null,
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
    missingProfilesAfterSync,
    errors
  });
}
