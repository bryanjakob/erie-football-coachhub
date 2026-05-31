import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { positionGroups, type PositionGroup } from "@/lib/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

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
    positionGroup?: PositionGroup;
  };

  const fullName = body.fullName?.trim();
  const positionGroup = body.positionGroup;

  if (!fullName || !positionGroup || !positionGroups.includes(positionGroup)) {
    return NextResponse.json({ error: "Full name and a valid position group are required." }, { status: 400 });
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

  const email = userResult.user.email.toLowerCase();

  const { error: profileError } = await adminClient
    .from("profiles")
    .upsert(
      {
        id: userResult.user.id,
        email,
        full_name: fullName,
        position_group: positionGroup
      },
      { onConflict: "id" }
    );

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const { data: existingCoach, error: existingCoachError } = await adminClient
    .from("coaches")
    .select("*")
    .eq("email", email)
    .maybeSingle();

  if (existingCoachError) {
    return NextResponse.json({ error: existingCoachError.message }, { status: 500 });
  }

  if (existingCoach) {
    const { data: coach, error: coachError } = await adminClient
      .from("coaches")
      .update({
        auth_user_id: existingCoach.auth_user_id ?? userResult.user.id,
        full_name: fullName,
        position_group: positionGroup,
        active: existingCoach.active
      })
      .eq("id", existingCoach.id)
      .select("*")
      .single();

    if (coachError) {
      return NextResponse.json({ error: coachError.message }, { status: 500 });
    }

    return NextResponse.json({ coach });
  }

  const { data: coach, error: coachError } = await adminClient
    .from("coaches")
    .insert({
      auth_user_id: userResult.user.id,
      email,
      full_name: fullName,
      position_group: positionGroup,
      role: "Coach",
      active: true
    })
    .select("*")
    .single();

  if (coachError) {
    return NextResponse.json({ error: coachError.message }, { status: 500 });
  }

  return NextResponse.json({ coach });
}
