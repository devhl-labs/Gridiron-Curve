import { Suspense } from "react";
import { TeamPageClient } from "@/components/team-page-client";

export default function TeamPage() {
  return (
    <Suspense>
      <TeamPageClient />
    </Suspense>
  );
}
