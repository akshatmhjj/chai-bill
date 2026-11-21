import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CODE_COOKIE, safeNextPath } from "@/lib/nests/invite";

/**
 * Exchanges the magic-link code for a session. If the person started from a join link, they go back
 * to it; otherwise to the app's front page (which routes new people on to set up their profile).
 */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const origin = request.nextUrl.origin;

  if (code) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = safeNextPath(decodeURIComponent(request.cookies.get(CODE_COOKIE)?.value ?? "")) ?? "/";
      const response = NextResponse.redirect(new URL(next, origin));
      response.cookies.set(CODE_COOKIE, "", { path: "/", maxAge: 0 });
      return response;
    }
  }
  return NextResponse.redirect(new URL("/login?error=link", origin));
}
