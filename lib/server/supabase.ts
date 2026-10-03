import "server-only";

export class BackendNotConfiguredError extends Error {
  constructor() {
    super("The inventory backend is not configured.");
    this.name = "BackendNotConfiguredError";
  }
}

type SupabaseConfig = {
  url: string;
  serviceKey: string;
};

function config(): SupabaseConfig {
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceKey) {
    throw new BackendNotConfiguredError();
  }

  try {
    new URL(url);
  } catch {
    throw new BackendNotConfiguredError();
  }

  return { url, serviceKey };
}

export function hasSupabaseConfig() {
  return Boolean(
    process.env.SUPABASE_URL?.trim() &&
      process.env.SUPABASE_SERVICE_ROLE_KEY?.trim(),
  );
}

export async function dbRequest<T>(
  resource: string,
  init: RequestInit = {},
): Promise<T> {
  const { url, serviceKey } = config();
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("authorization", "Bearer " + serviceKey);

  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(url + "/rest/v1/" + resource, {
    ...init,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error("Inventory data service unavailable.");
  }

  const responseText = await response.text();
  if (!responseText) return null as T;
  return JSON.parse(responseText) as T;
}

export async function callRpc<T>(
  name: string,
  args: Record<string, unknown>,
): Promise<T> {
  return dbRequest<T>("rpc/" + encodeURIComponent(name), {
    method: "POST",
    headers: { prefer: "return=representation" },
    body: JSON.stringify(args),
  });
}

function storageUrl(path: string) {
  const { url } = config();
  const encodedPath = path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return url + "/storage/v1/object/inventory-private/" + encodedPath;
}

export async function uploadPrivateImage(
  path: string,
  bytes: Buffer,
  mimeType: string,
) {
  const { serviceKey } = config();
  const response = await fetch(storageUrl(path), {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: "Bearer " + serviceKey,
      "content-type": mimeType,
      "x-upsert": "false",
    },
    body: new Uint8Array(bytes),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error("Image storage unavailable.");
  }
}

export async function downloadPrivateImage(path: string) {
  const { serviceKey } = config();
  const response = await fetch(storageUrl(path), {
    headers: {
      apikey: serviceKey,
      authorization: "Bearer " + serviceKey,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error("Image storage unavailable.");
  }

  return {
    bytes: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
  };
}

export async function deletePrivateImages(paths: string[]) {
  if (paths.length === 0) return;
  const { url, serviceKey } = config();
  const response = await fetch(url + "/storage/v1/object/inventory-private", {
    method: "DELETE",
    headers: {
      apikey: serviceKey,
      authorization: "Bearer " + serviceKey,
      "content-type": "application/json",
    },
    body: JSON.stringify({ prefixes: paths }),
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });

  if (!response.ok) {
    throw new Error("Image cleanup failed.");
  }
}
