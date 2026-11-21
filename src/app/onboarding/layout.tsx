import { Logo } from "@/components/brand/Logo";
import { signOutAction } from "@/app/auth/actions";

/** Onboarding has its own calm chrome: just the logo and a way out. */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-dvh overflow-clip">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-accent-soft/70 blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-24 size-80 rounded-full bg-positive-soft/60 blur-3xl" />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-8 pt-5">
        <header className="flex items-center justify-between">
          <Logo size={30} />
          <form action={signOutAction}>
            <button type="submit" className="rounded-lg px-2 py-1 text-sm font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink">
              Sign out
            </button>
          </form>
        </header>
        <main className="flex flex-1 flex-col pt-6">{children}</main>
      </div>
    </div>
  );
}
