import { signOutAction } from "./actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm text-neutral-600 underline">
        Sign out
      </button>
    </form>
  );
}
