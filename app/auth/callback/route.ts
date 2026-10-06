import { NextRequest, NextResponse } from "next/server";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let destination = "/login?error=signin";
  if (code && !request.nextUrl.searchParams.has("error")) {
    const supabase = await createAuthClient();
    // The verifier stored at sign-in binds this one-use code to this browser.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) destination = "/members";
  }
  // Fixed local destinations: never redirect to a user-supplied next URL.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "private, no-store" },
  });
}
