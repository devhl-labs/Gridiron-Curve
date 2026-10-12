export const BLOB_API_VERSION = "2023-11-03";

export function getContainerUrl() {
  const rawUrl = process.env.CFBD_CONTAINER_SAS_URL;
  const rawToken = process.env.CFBD_CONTAINER_SAS_TOKEN;
  if (!rawUrl) {
    throw new Error("CFBD_CONTAINER_SAS_URL is required.");
  }

  const url = new URL(rawUrl);
  const token = rawToken?.replace(/^\?/, "");
  if (token) {
    for (const [key, value] of new URLSearchParams(token)) {
      if (!url.searchParams.has(key)) url.searchParams.set(key, value);
    }
  }
  if (!url.searchParams.has("sig")) {
    throw new Error("The configured CFBD container credentials lack a SAS signature.");
  }
  return url;
}

export function getBlobUrl(container: URL, blobName: string) {
  const url = new URL(container);
  const basePath = url.pathname.replace(/\/+$/, "");
  const encodedName = blobName
    .split("/")
    .map(encodeURIComponent)
    .join("/");
  url.pathname = `${basePath}/${encodedName}`;
  return url;
}

function decodeXml(value: string) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export async function listBlobNames(container: URL, prefix: string) {
  const names: string[] = [];
  let marker = "";
  do {
    const url = new URL(container);
    url.searchParams.set("restype", "container");
    url.searchParams.set("comp", "list");
    url.searchParams.set("prefix", prefix);
    if (marker) url.searchParams.set("marker", marker);
    const response = await fetch(url, {
      headers: { "x-ms-version": BLOB_API_VERSION },
    });
    if (!response.ok) {
      const details = (await response.text()).trim();
      throw new Error(
        `Unable to list CFBD cache blobs (${response.status} ${response.statusText})${details ? `: ${details}` : "."}`,
      );
    }
    const xml = await response.text();
    names.push(
      ...Array.from(xml.matchAll(/<Name>([\s\S]*?)<\/Name>/g), ([, name]) =>
        decodeXml(name),
      ),
    );
    marker = decodeXml(
      xml.match(/<NextMarker>([\s\S]*?)<\/NextMarker>/)?.[1] ?? "",
    );
  } while (marker);
  return names;
}
