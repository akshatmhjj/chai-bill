import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { THEME_INIT_SCRIPT } from "@/components/theme/ThemeProvider";
import "./globals.css";

// Body text: a plain, highly legible sans for lists, forms and numbers.
const body = Instrument_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
});

// Headings and big numbers: a characterful grotesque with a little warmth, so the app does not look like a default template.
const display = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
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
    <html lang="en" className={`${body.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
