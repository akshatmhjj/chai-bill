import type { Metadata } from "next";
import { requireProfile } from "@/lib/data/context";
import { NewNestForm } from "./NewNestForm";

export const metadata: Metadata = { title: "Make a nest" };

export default async function NewNestPage() {
  await requireProfile();
  return <NewNestForm />;
}
