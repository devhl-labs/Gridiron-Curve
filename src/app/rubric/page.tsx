import type { Metadata } from "next";
import { Suspense } from "react";
import { RubricPageClient } from "@/components/rubric-page-client";

export const metadata: Metadata = {
  description:
    "The criteria used by each Gridiron Curve resume-ranking engine.",
};

export default function RubricPage() {
  return (
    <Suspense>
      <RubricPageClient />
    </Suspense>
  );
}
