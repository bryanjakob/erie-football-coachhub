import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { positionGroups, type CoachRole } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const roles: CoachRole[] = ["Admin", "Head Coach", "Varsity Coach", "JV Coach", "Volunteer Coach"];

export async function POST(request: Request) {
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: "Supabase server environment variables are missing." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  const token = authorization?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing Supabase access token." }, { status: 401 });
  }

  const body = (await request.json()) as {
    fullName?: string;
    email?: string;
    role?: CoachRole;
    positionGroup?: string;
  };

  if (!body.fullName || !body.email || !body.role || !roles.includes(body.role) || !body.positionGroup || !positionGroups.includes(body.positionGroup as (typeof positionGroups)[number])) {
    return NextResponse.json({ error: "Full name, email, role, and position group are required." }, { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  const { data: userResult, error: userError } = await adminClient.auth.getUser(token);
  if (userError || !userResult.user) {
    return NextResponse.json({ error: "Invalid Supabase session." }, { status: 401 });
  }

  const { data: requester, error: requesterError } = await adminClient
    .from("coaches")
    .select("id, role, active")
    .eq("auth_user_id", userResult.user.id)
    .maybeSingle();

  if (requesterError) {
    return NextResponse.json({ error: requesterError.message }, { status: 500 });
  }

  if (!requester || requester.role !== "Admin" || !requester.active) {
    return NextResponse.json({ error: "Only active Admin coaches can invite staff." }, { status: 403 });
  }

  const { data: coach, error: coachError } = await adminClient
    .from("coaches")
    .upsert(
      {
        email: body.email.toLowerCase(),
        full_name: body.fullName,
        role: body.role,
        position_group: body.positionGroup,
        invited_by: requester.id,
        active: true
      },
      { onConflict: "email" }
    )
    .select("id")
    .single();

  if (coachError) {
    return NextResponse.json({ error: coachError.message }, { status: 500 });
  }

  const { error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(body.email, {
    data: {
      coach_id: coach.id,
      role: body.role,
      position_group: body.positionGroup
    }
  });

  if (inviteError && !inviteError.message.toLowerCase().includes("already registered")) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
