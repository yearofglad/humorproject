import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeAuthDestination } from "@/lib/auth-destination";
import { createAuthClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  let destination = "/login?error=signin";
  if (code && !request.nextUrl.searchParams.has("error")) {
    const supabase = await createAuthClient();
    // The verifier stored at sign-in binds this one-use code to this browser.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const raw=(await cookies()).get("humor-auth-next")?.value;
      try { destination=safeAuthDestination(raw?decodeURIComponent(raw):"/"); } catch { destination="/"; }
    }
  }
  (await cookies()).delete("humor-auth-next");
  // Only allowlisted local destinations may be used after sign-in.
  return new NextResponse(null, {
    status: 303,
    headers: { Location: destination, "Cache-Control": "private, no-store" },
  });
}
