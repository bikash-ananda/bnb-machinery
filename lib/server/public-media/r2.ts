import "server-only";
import { createHash, createHmac, randomUUID } from "node:crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const MAX_BYTES = 25 * 1024 * 1024;
function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error("Missing server configuration: " + name);
  return value;
}
function sha256(value: string | Buffer) { return createHash("sha256").update(value).digest("hex"); }
function hmac(key: Buffer | string, value: string) { return createHmac("sha256", key).update(value).digest(); }
function extensionFor(mime: string) {
  return mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "pdf";
}
function validSignature(bytes: Buffer, mime: string) {
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mime === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (mime === "image/webp") return bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (mime === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}
function signingKey(secret: string, date: string) {
  const dateKey = hmac("AWS4" + secret, date);
  return hmac(hmac(hmac(dateKey, "auto"), "s3"), "aws4_request");
}
function encodeKey(key: string) { return key.split("/").map(encodeURIComponent).join("/"); }

/** Upload only after the caller has verified explicit public approval. */
export async function uploadApprovedPublicMedia(input: { bytes: Buffer; mimeType: string; approvedForPublic: boolean }) {
  if (input.approvedForPublic !== true) throw new Error("Explicit public approval is required.");
  if (!ALLOWED_TYPES.has(input.mimeType) || input.bytes.length === 0 || input.bytes.length > MAX_BYTES) throw new Error("Unsupported public media type or size.");
  if (!validSignature(input.bytes, input.mimeType)) throw new Error("File signature does not match its MIME type.");

  const account = required("R2_ACCOUNT_ID");
  const accessKey = required("R2_ACCESS_KEY_ID");
  const secret = required("R2_SECRET_ACCESS_KEY");
  const bucket = required("R2_BUCKET_PUBLIC");
  const baseUrl = required("R2_PUBLIC_BASE_URL").replace(/\/$/, "");
  const key = "published/" + new Date().toISOString().slice(0, 10) + "/" + randomUUID() + "." + extensionFor(input.mimeType);
  const host = account + ".r2.cloudflarestorage.com";
  const canonicalUri = "/" + encodeURIComponent(bucket) + "/" + encodeKey(key);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const date = amzDate.slice(0, 8);
  const payloadHash = sha256(input.bytes);
  const canonicalHeaders = "content-type:" + input.mimeType + "\nhost:" + host + "\nx-amz-content-sha256:" + payloadHash + "\nx-amz-date:" + amzDate + "\n";
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
  const scope = date + "/auto/s3/aws4_request";
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(secret, date)).update(stringToSign).digest("hex");
  const authorization = "AWS4-HMAC-SHA256 Credential=" + accessKey + "/" + scope + ", SignedHeaders=" + signedHeaders + ", Signature=" + signature;

  const response = await fetch("https://" + host + canonicalUri, {
    method: "PUT",
    headers: { authorization, "content-type": input.mimeType, "x-amz-content-sha256": payloadHash, "x-amz-date": amzDate },
    body: new Uint8Array(input.bytes),
    cache: "no-store",
  });
  if (!response.ok) throw new Error("R2 upload failed with status " + response.status + ".");
  return { key, url: baseUrl + "/" + encodeKey(key), sha256: payloadHash, size: input.bytes.length, mimeType: input.mimeType };
}
