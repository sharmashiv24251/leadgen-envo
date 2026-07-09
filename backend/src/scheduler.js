import cron from "node-cron";
import { supabase, getClientId } from "./supabaseClient.js";
import { runBatch } from "./runOnce.js";

const CLIENT_SLUG = process.env.CLIENT_SLUG || "workenvo";
const TZ = process.env.TZ || "Europe/Dublin";

async function readConfig(clientId) {
  const { data, error } = await supabase.from("config").select("key, value").eq("client_id", clientId);
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

// Runs the whole day's quota as a batch queue (chunks of <= MAX_PROSPECTS_PER_RUN,
// retrying in place on blocked_claude) rather than spreading single-prospect runs
// across send_window — see runOnce.js's runBatch for the retry/backoff logic.
async function runToday() {
  const clientId = await getClientId(CLIENT_SLUG);
  const cfg = await readConfig(clientId);

  if (cfg.paused) {
    console.log("[scheduler] paused=true, skipping today");
    return;
  }

  console.log(`[scheduler] starting today's batch queue — daily_quota=${cfg.daily_quota}`);
  await runBatch(cfg.daily_quota);
  console.log("[scheduler] today's batch queue finished (or stopped early — see runBatch logs above)");
}

cron.schedule("0 7 * * *", () => {
  runToday().catch((err) => console.error("[scheduler] runToday failed:", err));
}, { timezone: TZ });

console.log(`[scheduler] started — will run the day's batch queue daily at 07:00 ${TZ}`);
