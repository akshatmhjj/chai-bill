import type { Metadata, Viewport } from "next";
import { Figtree, Fraunces } from "next/font/google";
import { Providers } from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/ThemeProvider";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
  display: "swap",
});

// A soft, warm serif for headings and big numbers: it gives the app its personality.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Chai Bill", template: "%s · Chai Bill" },
  description: "Shared expenses, settling up and a shopping list for the people you share a home with.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { color: "#fbf7f0" },
    { media: "(prefers-color-scheme: dark)", color: "#17110d" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the init script sets data-theme before React hydrates.
    <html lang="en" className={`${figtree.variable} ${fraunces.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
