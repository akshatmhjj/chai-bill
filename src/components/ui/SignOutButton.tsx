import { signOutAction } from "@/app/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="rounded-lg px-2 py-1 text-sm font-medium text-ink-3 transition-colors hover:bg-sunken hover:text-ink">
        Sign out
      </button>
    </form>
  );
}
