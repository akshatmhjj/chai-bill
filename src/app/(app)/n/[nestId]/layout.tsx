import { BottomNav } from "@/components/nav/BottomNav";
import { MobileBack } from "@/components/nav/MobileBack";
import { SideNav } from "@/components/nav/SideNav";
import { LiveProvider } from "@/components/live/LiveProvider";
import { NestIdProvider } from "@/components/nest/NestContext";
import { personalStyle } from "@/lib/avatars";
import { countUnread, requireNest } from "@/lib/data/context";

/**
 * The shell for one nest: navigation, the live connection and the person's own accent colour.
 * requireNest() returns 404 for anyone who is not a member, so no nest's data is ever reachable by URL alone.
 */
export default async function NestLayout({ children, params }: { children: React.ReactNode; params: Promise<{ nestId: string }> }) {
  const { nestId } = await params;
  const ctx = await requireNest(nestId);
  const unread = await countUnread(ctx);

  return (
    <div className="personal min-h-dvh" style={personalStyle(ctx.me.avatar)}>
      <NestIdProvider nestId={ctx.household.id}>
        <LiveProvider
          householdId={ctx.household.id}
          userId={ctx.userId}
          people={ctx.members.map((m) => ({ userId: m.userId, name: m.name, avatar: m.avatar }))}
        >
          <SideNav
            nestId={ctx.household.id}
            me={{ userId: ctx.userId, name: ctx.me.name, avatar: ctx.me.avatar }}
            others={ctx.others.map((m) => ({ userId: m.userId, name: m.name, avatar: m.avatar }))}
            householdName={ctx.household.name}
            unread={unread}
          />
          <div className="lg:pl-64">
            <main className="mx-auto w-full max-w-3xl px-4 pb-[calc(env(safe-area-inset-bottom)+7rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:max-w-6xl lg:px-10 lg:pb-16 lg:pt-10">
              <MobileBack nestId={ctx.household.id} />
              {children}
            </main>
          </div>
          <BottomNav nestId={ctx.household.id} unread={unread} />
        </LiveProvider>
      </NestIdProvider>
    </div>
  );
}
