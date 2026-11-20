import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth/SignOutButton";
import { RealtimeRefresh } from "@/app/RealtimeRefresh";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { describeActivity, type ActivityRow } from "@/lib/activity/describe";

const whenFormatter = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function ActivityPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const me = userData.user.id;

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", me)
    .maybeSingle();
  const householdId = (membership?.household_id as string | undefined) ?? null;

  if (!householdId) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col gap-4 p-6">
        <h1 className="text-2xl font-semibold">Activity</h1>
        <p className="text-sm text-neutral-600">Join a flat first to see what is happening.</p>
        <Link href="/household" className="underline">Go to household</Link>
      </main>
    );
  }

  const { data: events } = await supabase
    .from("activity_events")
    .select("kind, actor_id, payload, created_at")
    .eq("household_id", householdId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(100);

  const { data: members } = await supabase
    .from("household_members")
    .select("user_id, display_name")
    .eq("household_id", householdId);
  const names = new Map((members ?? []).map((m) => [m.user_id as string, m.display_name as string]));
  const nameOf = (id: string) => names.get(id) ?? "Someone";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col gap-6 p-6">
      <RealtimeRefresh householdId={householdId} userId={me} />
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Activity</h1>
          <nav className="flex gap-3 text-sm text-neutral-600">
            <Link href="/expenses" className="underline">Expenses</Link>
            <Link href="/balances" className="underline">Balances</Link>
          </nav>
        </div>
        <SignOutButton />
      </header>

      {(events ?? []).length === 0 && <p className="text-sm text-neutral-600">Nothing yet.</p>}

      <ul className="flex flex-col divide-y divide-neutral-200">
        {((events ?? []) as ActivityRow[]).map((e, i) => (
          <li key={i} className="flex flex-col gap-1 py-3 text-sm">
            <span>{describeActivity(e, nameOf, me)}</span>
            <span className="text-xs text-neutral-500">{whenFormatter.format(new Date(e.created_at))}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
