import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  if (supabase) {
    await supabase.auth.signOut();
  }

  // Redirect to home or return JSON response
  const accept = request.headers.get("accept") || "";
  if (accept.includes("application/json")) {
    return NextResponse.json({ success: true });
  }

  const { origin } = request.nextUrl;
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
