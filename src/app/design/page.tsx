import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DesignGallery } from "./DesignGallery";

export const metadata: Metadata = { title: "Design system", robots: { index: false, follow: false } };

/** A live reference of every token and primitive. Development only: anywhere else it does not exist. */
export default function DesignPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <DesignGallery />;
}
