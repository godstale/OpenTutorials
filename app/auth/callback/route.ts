import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const pendingCookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Collect cookies to apply to the redirect response later.
            // Cannot use cookieStore.set() here because NextResponse.redirect()
            // creates a new Response that does not carry cookies set on the
            // request context — they must be explicitly attached to the response.
            pendingCookies.push(...cookiesToSet);
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { error: upsertError } = await supabase.from("user_profiles").upsert(
          {
            id: user.id,
            email: user.email ?? "",
            nickname:
              user.user_metadata?.full_name ??
              user.user_metadata?.name ??
              user.email?.split("@")[0] ??
              "User",
            avatar_url: user.user_metadata?.avatar_url ?? null,
            points: 0,
            subscription_status: "none",
          },
          { onConflict: "id", ignoreDuplicates: true }
        );
        if (upsertError) {
          console.error("[auth/callback] user_profiles upsert error:", upsertError);
        }
      }

      // On Vercel the internal request.url host differs from the public domain.
      // x-forwarded-host carries the real hostname seen by the browser.
      const forwardedHost = request.headers.get("x-forwarded-host");
      const origin = forwardedHost ? `https://${forwardedHost}` : requestUrl.origin;

      const redirectResponse = NextResponse.redirect(new URL(next, origin));

      // Attach session cookies to the redirect response so the browser saves them.
      pendingCookies.forEach(({ name, value, options }) => {
        redirectResponse.cookies.set(name, value, options as Parameters<typeof redirectResponse.cookies.set>[2]);
      });

      return redirectResponse;
    } else {
      return NextResponse.redirect(
        new URL(`/auth/error?error=${encodeURIComponent(error.message)}`, requestUrl.origin)
      );
    }
  }

  return NextResponse.redirect(
    new URL("/auth/error?error=No code provided", requestUrl.origin)
  );
}
