import { BottomNav } from "@/components/nav/BottomNav";
import { SideNav } from "@/components/nav/SideNav";
import { LiveProvider } from "@/components/live/LiveProvider";
import { personalStyle } from "@/lib/avatars";
import { countUnread, requireOnboarded } from "@/lib/data/context";

/**
 * The signed-in shell: navigation, the live connection, and the person's own accent colour.
 * Everything inside it can assume a profile and a flat exist (requireOnboarded redirects otherwise).
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireOnboarded();
  const unread = await countUnread(ctx);

  return (
    <div className="personal min-h-dvh" style={personalStyle(ctx.me.avatar)}>
      <LiveProvider
        householdId={ctx.household.id}
        userId={ctx.userId}
        people={ctx.members.map((m) => ({ userId: m.userId, name: m.name, avatar: m.avatar }))}
      >
        <SideNav
          me={{ name: ctx.me.name, avatar: ctx.me.avatar }}
          roommate={ctx.roommate ? { name: ctx.roommate.name, avatar: ctx.roommate.avatar } : null}
          householdName={ctx.household.name}
          unread={unread}
        />
        <div className="lg:pl-64">
          <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-10">
            {children}
          </main>
        </div>
        <BottomNav unread={unread} />
      </LiveProvider>
    </div>
  );
}
