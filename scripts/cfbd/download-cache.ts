import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { CFBD_CACHE_NAMESPACE, getCfbdCacheRoot } from "../../src/lib/cfbd/cache";
import {
  BLOB_API_VERSION,
  getBlobUrl,
  getContainerUrl,
  listBlobNames,
} from "./blob-container";

const CONCURRENCY = 8;
const CACHE_PREFIX = `${CFBD_CACHE_NAMESPACE}/`;

function localPath(blobName: string) {
  if (!blobName.startsWith(CACHE_PREFIX)) {
    throw new Error(`Unexpected CFBD cache blob name: ${blobName}`);
  }
  const relativeName = blobName.slice(CACHE_PREFIX.length);
  const segments = relativeName.split("/");
  if (
    !relativeName ||
    segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new Error(`Unsafe CFBD cache blob name: ${blobName}`);
  }
  return path.join(getCfbdCacheRoot(), ...segments);
}

async function downloadBlob(container: URL, blobName: string) {
  const response = await fetch(getBlobUrl(container, blobName), {
    headers: { "x-ms-version": BLOB_API_VERSION },
  });
  if (!response.ok) {
    const details = (await response.text()).trim();
    throw new Error(
      `Unable to download ${blobName} (${response.status} ${response.statusText})${details ? `: ${details}` : "."}`,
    );
  }

  const outputPath = localPath(blobName);
  const temporaryPath = `${outputPath}.${process.pid}.tmp`;
  await mkdir(path.dirname(outputPath), { recursive: true });
  try {
    await writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()));
    await rename(temporaryPath, outputPath);
  } catch (error) {
    const { rm } = await import("node:fs/promises");
    await rm(temporaryPath, { force: true });
    throw error;
  }
}

async function main() {
  const container = getContainerUrl();
  const blobNames = await listBlobNames(container, CACHE_PREFIX);
  if (blobNames.length === 0) {
    throw new Error(`No blobs exist in the remote ${CACHE_PREFIX} namespace.`);
  }

  let nextIndex = 0;
  let downloaded = 0;
  await Promise.all(
    Array.from(
      { length: Math.min(CONCURRENCY, blobNames.length) },
      async () => {
        while (nextIndex < blobNames.length) {
          const blobName = blobNames[nextIndex];
          nextIndex += 1;
          await downloadBlob(container, blobName);
          downloaded += 1;
          if (downloaded % 100 === 0 || downloaded === blobNames.length) {
            console.log(
              `Downloaded ${downloaded}/${blobNames.length} cache files.`,
            );
          }
        }
      },
    ),
  );

  const downloadedNames = new Set(
    blobNames.map((blobName) => path.resolve(localPath(blobName))),
  );
  if (downloadedNames.size !== blobNames.length) {
    throw new Error("CFBD cache download produced duplicate local paths.");
  }
  console.log(
    `Restored ${blobNames.length} cache files from the remote ${CACHE_PREFIX} namespace.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
