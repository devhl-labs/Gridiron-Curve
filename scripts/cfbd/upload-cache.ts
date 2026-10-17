import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CFBD_CACHE_NAMESPACE, getCfbdCacheRoot } from "../../src/lib/cfbd/cache";
import {
  BLOB_API_VERSION,
  getBlobUrl,
  getContainerUrl,
  listBlobNames,
} from "./blob-container";

const CONCURRENCY = 8;

type CacheFile = {
  absolutePath: string;
  blobName: string;
};

async function collectFiles(
  directory: string,
  relativeDirectory = "",
): Promise<CacheFile[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry): Promise<CacheFile[]> => {
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectFiles(absolutePath, relativePath);
      }
      if (!entry.isFile()) return [];
      return [
        {
          absolutePath,
          blobName: path.posix.join(CFBD_CACHE_NAMESPACE, relativePath),
        },
      ];
    }),
  );
  return files.flat().sort((a, b) => a.blobName.localeCompare(b.blobName));
}

async function uploadFile(container: URL, file: CacheFile) {
  const response = await fetch(getBlobUrl(container, file.blobName), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-ms-blob-type": "BlockBlob",
      "x-ms-version": BLOB_API_VERSION,
    },
    body: await readFile(file.absolutePath),
  });
  if (!response.ok) {
    const details = (await response.text()).trim();
    throw new Error(
      `Unable to upload ${file.blobName} (${response.status} ${response.statusText})${details ? `: ${details}` : "."}`,
    );
  }
}

async function uploadFiles(container: URL, files: CacheFile[]) {
  let nextIndex = 0;
  let uploaded = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, files.length) },
    async () => {
      while (nextIndex < files.length) {
        const file = files[nextIndex];
        nextIndex += 1;
        await uploadFile(container, file);
        uploaded += 1;
        if (uploaded % 100 === 0 || uploaded === files.length) {
          console.log(`Uploaded ${uploaded}/${files.length} cache files.`);
        }
      }
    },
  );
  await Promise.all(workers);
}

async function main() {
  const container = getContainerUrl();
  const files = await collectFiles(getCfbdCacheRoot());
  if (files.length === 0) {
    throw new Error(`No files exist in the ${CFBD_CACHE_NAMESPACE} CFBD cache.`);
  }

  const remoteNames = await listBlobNames(
    container,
    `${CFBD_CACHE_NAMESPACE}/`,
  );
  const existingNames = new Set(remoteNames);
  const filesToUpload = files.filter(
    ({ blobName }) =>
      blobName.endsWith("/latest.json") || !existingNames.has(blobName),
  );
  await uploadFiles(container, filesToUpload);
  console.log(
    `Uploaded ${filesToUpload.length} new or mutable cache files; ${files.length - filesToUpload.length} immutable files were already present.`,
  );
  const verifiedRemoteNames = await listBlobNames(
    container,
    `${CFBD_CACHE_NAMESPACE}/`,
  );
  const expectedNames = new Set(files.map(({ blobName }) => blobName));
  const verifiedNames = new Set(verifiedRemoteNames);
  const missing = [...expectedNames].filter((name) => !verifiedNames.has(name));
  if (missing.length > 0) {
    throw new Error(
      `Azure Blob verification failed; ${missing.length} cache files are missing.`,
    );
  }
  console.log(
    `Verified ${files.length} local cache files in the remote ${CFBD_CACHE_NAMESPACE}/ namespace.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
