import { Suspense } from "react";
import { RankingsPageClient } from "@/components/rankings-page-client";

export default function Home() {
  return (
    <Suspense>
      <RankingsPageClient />
    </Suspense>
  );
}
