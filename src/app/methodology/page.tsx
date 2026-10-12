import type { Metadata } from "next";
import { Suspense } from "react";
import { MethodologyPageClient } from "@/components/methodology-page-client";

export const metadata: Metadata = {
  title: "Methodology | Gridiron Curve",
};

export default function MethodologyPage() {
  return (
    <Suspense>
      <MethodologyPageClient />
    </Suspense>
  );
}
