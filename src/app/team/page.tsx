import type { Metadata } from "next";
import { Suspense } from "react";
import { TeamPageClient } from "@/components/team-page-client";

export const metadata: Metadata = {
  title: "Team | Gridiron Curve",
};

export default function TeamPage() {
  return (
    <Suspense>
      <TeamPageClient />
    </Suspense>
  );
}
