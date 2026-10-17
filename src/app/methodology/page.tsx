import { Suspense } from "react";
import { MethodologyPageClient } from "@/components/methodology-page-client";

export default function MethodologyPage() {
  return (
    <Suspense>
      <MethodologyPageClient />
    </Suspense>
  );
}
