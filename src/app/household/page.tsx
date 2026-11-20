import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/app/auth/SignOutButton";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteButton, OnboardingForms } from "./forms";

export default async function HouseholdPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");

  const { data: membership } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-8 p-6">
        <div>
          <h1 className="text-2xl font-semibold">Set up your flat</h1>
          <p className="text-sm text-neutral-600">Start a new flat, or join the one your roommate created.</p>
        </div>
        <OnboardingForms />
      </main>
    );
  }

  const householdId = membership.household_id as string;
  const [{ data: household }, { data: members }] = await Promise.all([
    supabase.from("households").select("name").eq("id", householdId).single(),
    supabase.from("household_members").select("user_id, display_name").eq("household_id", householdId),
  ]);

  const memberCount = members?.length ?? 0;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col gap-8 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{household?.name ?? "Your flat"}</h1>
          <ul className="pt-2 text-sm text-neutral-700">
            {(members ?? []).map((m) => (
              <li key={m.user_id}>{m.display_name}</li>
            ))}
          </ul>
        </div>
        <SignOutButton />
      </div>
      <Link href="/expenses" className="rounded-md bg-neutral-900 px-4 py-2 text-center text-white">
        Expenses
      </Link>
      {memberCount < 2 ? (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Invite your roommate</h2>
          <InviteButton householdId={householdId} />
        </section>
      ) : (
        <p className="text-sm text-neutral-600">Both roommates have joined.</p>
      )}
    </main>
  );
}
