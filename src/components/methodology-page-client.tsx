"use client";

import { useSearchParams } from "next/navigation";
import { ComputerMethodologyPage } from "@/components/computer-methodology-page";
import { parseRankingSystemId } from "@/lib/ranking";

export function MethodologyPageClient() {
  const searchParams = useSearchParams();
  const rankingSystemId = parseRankingSystemId(searchParams.get("ranking"));

  return <ComputerMethodologyPage rankingSystemId={rankingSystemId} />;
}
