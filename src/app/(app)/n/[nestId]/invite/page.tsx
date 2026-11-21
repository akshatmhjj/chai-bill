import type { Metadata } from "next";
import { Avatar } from "@/components/avatar/Avatar";
import { PageHeader } from "@/components/nav/PageHeader";
import { requireNest } from "@/lib/data/context";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InviteShare } from "./InviteShare";

export const metadata: Metadata = { title: "Invite" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ nestId: string }>; searchParams: Promise<{ new?: string }> }) {
  const [{ nestId }, { new: justMade }] = await Promise.all([params, searchParams]);
  const ctx = await requireNest(nestId);

  // The newest code that still works. If there is none yet, make one (this only happens once per nest).
  const supabase = await createSupabaseServerClient();
  const { data: active } = await supabase
    .from("household_invites")
    .select("code")
    .eq("household_id", nestId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let code = (active?.code as string | undefined) ?? null;
  if (!code) {
    const { data } = await supabase.rpc("create_household_invite", { p_household: nestId });
    code = typeof data === "string" ? data : null;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Invite people" subtitle={`Bring people into ${ctx.household.name}`} me={ctx.me} />
      <div className="flex flex-col gap-6">
        {justMade === "1" && (
          <p className="rounded-2xl bg-positive-soft px-4 py-3 text-sm font-semibold text-positive">
            {ctx.household.name} is ready. Share the code or QR, then open the nest.
          </p>
        )}
        <InviteShare nestId={nestId} nestName={ctx.household.name} initialCode={code} />
        <section className="rounded-card border border-line bg-surface p-4 shadow-soft">
          <h2 className="font-display text-xl font-semibold">In this nest · {ctx.members.length} of 15</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {ctx.members.map((m) => (
              <li key={m.userId} className="flex items-center gap-3">
                <Avatar avatar={m.avatar} size={36} />
                <span className="font-semibold">{m.userId === ctx.userId ? "You" : m.name}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
