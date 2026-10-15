try { process.loadEnvFile(".env.local"); } catch { /* production secrets are injected by Compose */ }

const endpoint = process.env.AUTOMATION_ENDPOINT || "http://127.0.0.1:3000/api/cron/automation";
const secret = process.env.AUTOMATION_CRON_SECRET?.trim();

if (!secret || secret.length < 32) {
  console.error("AUTOMATION_CRON_SECRET must contain at least 32 characters.");
  process.exit(1);
}

let running = false;

async function runCycle() {
  if (running) return;
  running = true;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { authorization: "Bearer " + secret },
      signal: AbortSignal.timeout(55_000),
    });
    const body = await response.text();
    if (!response.ok) {
      console.error("Automation cycle returned HTTP " + response.status + ": " + body.slice(0, 500));
      return;
    }
    console.log(new Date().toISOString() + " automation " + body);
  } catch (error) {
    console.error("Automation cycle request failed:", error instanceof Error ? error.message : error);
  } finally {
    running = false;
  }
}

await runCycle();
setInterval(() => void runCycle(), 60_000);
