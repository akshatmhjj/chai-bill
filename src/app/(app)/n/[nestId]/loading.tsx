import { ChaiLoader } from "@/components/ui/ChaiLoader";

/**
 * Shown the moment a tab is tapped, while the next screen's data loads. This sits inside the nest
 * layout, so the navigation stays on screen and only the content waits.
 */
export default function NestLoading() {
  return <ChaiLoader />;
}
