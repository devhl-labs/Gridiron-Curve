"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  DEFAULT_MODEL_VERSION,
  MODEL_VERSIONS,
  type ModelVersion,
} from "@/lib/ranking";

type ModelVersionSelectProps = {
  selectedVersion: ModelVersion;
};

export function ModelVersionSelect({
  selectedVersion,
}: ModelVersionSelectProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function selectVersion(version: ModelVersion) {
    const next = new URLSearchParams(searchParams);
    if (version === DEFAULT_MODEL_VERSION) {
      next.delete("model");
    } else {
      next.set("model", version);
    }
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <label className="history-select">
      <span>Model</span>
      <select
        value={selectedVersion}
        onChange={(event) =>
          selectVersion(event.target.value as ModelVersion)
        }
      >
        {MODEL_VERSIONS.toReversed().map((version) => (
          <option key={version} value={version}>
            {version}
          </option>
        ))}
      </select>
    </label>
  );
}
