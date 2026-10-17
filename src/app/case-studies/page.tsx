import type { Metadata } from "next";
import { Suspense } from "react";
import { CaseStudiesPageClient } from "@/components/case-studies-page-client";

export const metadata: Metadata = {
  description:
    "See how Gridiron Curve evaluates college football's most controversial ranking decisions.",
};

export default function CaseStudiesPage() {
  return (
    <Suspense>
      <CaseStudiesPageClient />
    </Suspense>
  );
}
