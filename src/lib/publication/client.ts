import {
  PUBLICATION_BASE_PATH,
  type PublicationManifest,
  type PublishedSeason,
  type RankingView,
} from "./types";

export async function fetchPublishedJson<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(path, { signal });
  if (!response.ok) {
    throw new Error(`Published data request failed (${response.status}): ${path}`);
  }
  return (await response.json()) as T;
}

export function fetchPublicationManifest(signal?: AbortSignal) {
  return fetchPublishedJson<PublicationManifest>(
    `${PUBLICATION_BASE_PATH}/manifest.json`,
    signal,
  );
}

export type { PublicationManifest, PublishedSeason, RankingView };
