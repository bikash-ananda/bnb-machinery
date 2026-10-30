import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import pg from "pg";

const { Pool } = pg;
const scrypt = promisify(scryptCallback);
const arg = (name) => { const i = process.argv.indexOf("--" + name); return i >= 0 ? process.argv[i + 1] : undefined; };
const email = (arg("email") || arg("promote") || "").trim().toLowerCase();
const name = (arg("name") || "Super Admin").trim();
const reset = process.argv.includes("--reset");
const promote = Boolean(arg("promote"));
const password = process.env.SUPER_ADMIN_TEMP_PASSWORD || arg("password") || "";
if (!process.env.DATABASE_URL) { console.error("Stopped: DATABASE_URL is required."); process.exit(1); }
if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email)) { console.error("Stopped: provide --email or --promote with a full email address."); process.exit(1); }
if (!promote && (password.length < 12 || !name || name.length < 2)) { console.error("Stopped: set SUPER_ADMIN_TEMP_PASSWORD (at least 12 characters) and a valid name."); process.exit(1); }

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1, connectionTimeoutMillis: 10000 });
const client = await pool.connect();
try {
  await client.query("BEGIN");
  const found = await client.query("SELECT id, email, role FROM local_admin_users WHERE email = $1 FOR UPDATE", [email]);
  if (promote) {
    if (!found.rowCount) throw new Error("No existing admin account found; nothing was changed.");
    const user = found.rows[0];
    await client.query("UPDATE local_admin_users SET role = 'SUPER_ADMIN', active = true, updated_at = now() WHERE id = $1", [user.id]);
    await client.query("INSERT INTO local_admin_audit_events (actor_email, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)", ["deployment-bootstrap", "user.promoted", "admin_user", user.id, JSON.stringify({ email, from: user.role, to: "SUPER_ADMIN" })]);
    console.log("Existing account promoted to Super Admin. Its password and existing session records were preserved.");
  } else {
    const salt = randomBytes(16), N = 32768, R = 8, P = 1;
    const derived = await scrypt(password, salt, 64, { N, r: R, p: P, maxmem: 128 * N * R * 2 });
    const passwordHash = `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${derived.toString("base64")}`;
    if (found.rowCount && !reset) {
      console.log("An account with this email already exists. Nothing was changed. Use --reset only if you intend to replace its password.");
    } else if (found.rowCount) {
      const user = found.rows[0];
      await client.query("UPDATE local_admin_users SET password_hash=$1, must_change_password=true, failed_attempts=0, locked_until=NULL, active=true, updated_at=now() WHERE id=$2", [passwordHash, user.id]);
      await client.query("UPDATE local_admin_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL", [user.id]);
      await client.query("INSERT INTO local_admin_audit_events (actor_email, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)", ["deployment-bootstrap", "user.password_reset", "admin_user", user.id, JSON.stringify({ email })]);
      console.log("Admin password reset. The account must choose a new password after sign-in.");
    } else {
      const inserted = await client.query("INSERT INTO local_admin_users (email,name,role,password_hash,must_change_password,created_by) VALUES ($1,$2,'SUPER_ADMIN',$3,true,'bootstrap') RETURNING id", [email, name, passwordHash]);
      await client.query("INSERT INTO local_admin_audit_events (actor_email, action, target_type, target_id, details) VALUES ($1,$2,$3,$4,$5::jsonb)", ["deployment-bootstrap", "user.created", "admin_user", inserted.rows[0].id, JSON.stringify({ email, role: "SUPER_ADMIN" })]);
      console.log("Super Admin created. Sign in at /admin/login and change the temporary password.");
    }
  }
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  console.error("Bootstrap failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
