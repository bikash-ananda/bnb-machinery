// node scripts/create-super-admin.mjs --email a@b.com [--name "Name"] (password via SUPER_ADMIN_TEMP_PASSWORD)
// node scripts/create-super-admin.mjs --list
// node scripts/create-super-admin.mjs --deactivate someone@example.com
// node scripts/create-super-admin.mjs --promote someone@example.com
// Stores only a scrypt hash. The account must change its password at first login.
import { randomBytes, scrypt } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { promisify } from "node:util";

for (const f of [".env.local", ".env", "infra/.env.production"]) {
  if (!existsSync(f)) continue;
  for (const line of readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const arg = (k) => { const i = process.argv.indexOf("--" + k); return i > -1 ? process.argv[i + 1] : undefined; };
const url = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
if (!url || !key) { console.error("Stopped: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env.local"); process.exit(1); }
const headers = { apikey: key, authorization: "Bearer " + key, "content-type": "application/json" };
const api = `${url}/rest/v1/admin_users`;

if (process.argv.includes("--list")) {
  const r = await fetch(`${api}?select=email,name,role,active,must_change_password,last_login_at&order=created_at.asc`, { headers });
  if (!r.ok) { console.error(`Failed (${r.status}). Did you run the migration?`); process.exit(1); }
  const rows = await r.json();
  console.table(rows);
  process.exit(0);
}

const off = arg("deactivate");
if (off) {
  const r = await fetch(`${api}?email=eq.${encodeURIComponent(off.trim().toLowerCase())}`, { method: "PATCH", headers: { ...headers, prefer: "return=representation" }, body: JSON.stringify({ active: false }) });
  const rows = r.ok ? await r.json() : [];
  console.log(rows.length ? `Deactivated ${off}.` : `No account found for ${off}.`);
  process.exit(0);
}

const promote = arg("promote");
if (promote) {
  const email = promote.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error("Stopped: that is not a full email address."); process.exit(1); }
  const r = await fetch(`${api}?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH", headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify({ role: "SUPER_ADMIN", active: true, updated_at: new Date().toISOString() }),
  });
  const rows = r.ok ? await r.json() : [];
  if (rows.length) {
    const audit = await fetch(`${url}/rest/v1/admin_audit_events`, {
      method: "POST", headers: { ...headers, prefer: "return=minimal" },
      body: JSON.stringify({ actor_email: "deployment-bootstrap", actor_role: "SYSTEM", action: "user.promoted", entity: "admin_user", entity_id: rows[0].id, detail: { email, role: "SUPER_ADMIN" } }),
    });
    if (!audit.ok) console.error("Warning: promotion succeeded, but its audit event could not be saved.");
  }
  console.log(rows.length ? `Promoted ${email} to Super Admin.` : `No account found for ${email} (or request failed: ${r.status}).`);
  process.exit(rows.length ? 0 : 1);
}

const email = (arg("email") || "").trim().toLowerCase();
const password = process.env.SUPER_ADMIN_TEMP_PASSWORD || arg("password") || "";
const name = arg("name") || "Super Admin";
const reset = process.argv.includes("--reset");
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { console.error("Stopped: that is not a full email address."); process.exit(1); }
if (password.length < 12) { console.error("Stopped: set SUPER_ADMIN_TEMP_PASSWORD to a temporary password of at least 12 characters."); process.exit(1); }

const N = 32768, R = 8, P = 1;
const salt = randomBytes(16);
const hash = await promisify(scrypt)(password, salt, 64, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
const password_hash = `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${hash.toString("base64")}`;

if (reset) {
  const r = await fetch(`${api}?email=eq.${encodeURIComponent(email)}`, {
    method: "PATCH", headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify({ password_hash, must_change_password: true, failed_attempts: 0, locked_until: null, active: true, updated_at: new Date().toISOString() }),
  });
  const rows = r.ok ? await r.json() : [];
  console.log(rows.length ? `Password reset for ${email}. It must be changed at next login.` : `No account found for ${email} (or request failed: ${r.status}).`);
  process.exit(rows.length ? 0 : 1);
}

const res = await fetch(api, {
  method: "POST", headers: { ...headers, prefer: "return=representation,resolution=ignore-duplicates" },
  body: JSON.stringify({ email, name, role: "SUPER_ADMIN", password_hash, must_change_password: true, created_by: "seed-script" }),
});
if (!res.ok) { console.error(`Failed (${res.status}). Did you run the migration in Supabase first?`); console.error(await res.text()); process.exit(1); }
const rows = await res.json();
console.log(rows.length
  ? `Super admin created: ${email}\nSign in at /admin/login. You will get an emailed code, then be asked to choose a new password.`
  : `An account for ${email} already exists, nothing changed. Add --reset to set a new temporary password.`);
