import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

type WeekOneEvent = {
  title: string;
  description: string;
  date: string;
};

function denverTimestamp(date: string, time: string) {
  return new Date(`${date}T${time}:00-06:00`).toISOString();
}

const weekOneEvents: WeekOneEvent[] = [
  {
    title: "OL/DL Camp",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 9:30-11:00 AM\nLocation: Thunderridge\nAttendance required",
    date: denverTimestamp("2026-05-31", "09:30")
  },
  {
    title: "Summer Workout #1",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-01", "07:00")
  },
  {
    title: "Summer Workout #2",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-02", "07:00")
  },
  {
    title: "Team Pass #1",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 8:30 AM\nAttendance required",
    date: denverTimestamp("2026-06-02", "08:30")
  },
  {
    title: "Player Led Practice",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-03", "07:00")
  },
  {
    title: "Summer Workout #4",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-04", "07:00")
  },
  {
    title: "Team Pass #2",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 8:30 AM\nAttendance required",
    date: denverTimestamp("2026-06-04", "08:30")
  },
  {
    title: "Summer Workout #5",
    description: "Imported from 2026 Summer Workout Outline - Week 1.\nTime: 7:00-8:15 AM\nAttendance required",
    date: denverTimestamp("2026-06-05", "07:00")
  }
];

const weekOneAliases = new Set([
  ...weekOneEvents.map((event) => event.title.trim().toLowerCase()),
  "summer workouts #1",
  "team pass work #2",
  "summer workout #5 / competition friday"
]);

async function parseWeekOnePdf() {
  const pdfPath = path.join(process.cwd(), "public", "week-1-summer-workout-outline.pdf");
  const pdfBytes = await readFile(pdfPath);
  if (!pdfBytes.subarray(0, 4).toString("utf8").startsWith("%PDF")) {
    throw new Error("Week 1 schedule source is not a valid PDF.");
  }

  return weekOneEvents;
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
  if (userError || !userResult.user) {
    return NextResponse.json({ error: "Invalid Supabase session." }, { status: 401 });
  }

  const detectedEvents = await parseWeekOnePdf();
  const weekStart = new Date(denverTimestamp("2026-05-31", "00:00")).getTime();
  const weekEnd = new Date(denverTimestamp("2026-06-06", "23:59")).getTime();

  const { data: existingRows, error: existingError } = await adminClient
    .schema("public")
    .from("events")
    .select("id,title,description,date,created_at")
    .order("date", { ascending: true });

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  const idsToDelete = Array.from(
    new Set(
      (existingRows ?? [])
        .filter((event) => {
          const eventTime = new Date(event.date).getTime();
          const title = event.title.trim().toLowerCase();
          const description = event.description?.toLowerCase() ?? "";
          const isWeekOneDuplicate = eventTime >= weekStart && eventTime <= weekEnd && weekOneAliases.has(title);
          const isNotWeekOneEvent = !weekOneAliases.has(title);
          const isTestEvent = title.includes("test") || title.includes("demo") || description.includes("test") || description.includes("demo");
          return isWeekOneDuplicate || isNotWeekOneEvent || isTestEvent;
        })
        .map((event) => event.id)
    )
  );

  if (idsToDelete.length > 0) {
    const { error: deleteError } = await adminClient
      .schema("public")
      .from("events")
      .delete()
      .in("id", idsToDelete);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 500 });
    }
  }

  const { data: insertedRows, error: insertError } = await adminClient
    .schema("public")
    .from("events")
    .insert(detectedEvents.map(({ title, description, date }) => ({ title, description, date })))
    .select("id,title,description,date,created_at");

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  const { data: verifiedRows, error: verifyError } = await adminClient
    .schema("public")
    .from("events")
    .select("id,title,description,date,created_at")
    .in("title", detectedEvents.map((event) => event.title))
    .order("date", { ascending: true });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return NextResponse.json({
    detectedEvents,
    insertedRows: insertedRows ?? [],
    verifiedRows: verifiedRows ?? [],
    deletedRows: idsToDelete.length
  });
}
