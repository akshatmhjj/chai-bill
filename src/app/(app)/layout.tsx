/** Shell for every signed-in screen: a centred column with room for the phone bar. Nests add their own nav. */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh">{children}</div>;
}
