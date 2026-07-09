import cron from "node-cron";
import { supabase, getClientId } from "./supabaseClient.js";
import { runBatch } from "./runOnce.js";

const CLIENT_SLUG = process.env.CLIENT_SLUG || "workenvo";
const TZ = process.env.TZ || "Europe/Dublin";
const POLL_INTERVAL_MS = 30 * 1000;

// The daily cron trigger and dashboard-button requests both just enqueue a row in
// run_requests; a single poll loop processes that queue one at a time, so the two
// trigger sources can never run concurrently — whichever enqueued first goes first.
let busy = false;

async function readConfig(clientId) {
  const { data, error } = await supabase.from("config").select("key, value").eq("client_id", clientId);
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

async function enqueueDailyQuota() {
  const clientId = await getClientId(CLIENT_SLUG);
  const cfg = await readConfig(clientId);

  if (cfg.paused) {
    console.log("[scheduler] paused=true, skipping today's daily quota");
    return;
  }

  const { error } = await supabase
    .from("run_requests")
    .insert({ client_id: clientId, requested_count: cfg.daily_quota });
  if (error) throw error;
  console.log(`[scheduler] enqueued today's daily quota: ${cfg.daily_quota}`);
}

async function processQueue() {
  if (busy) return;

  const clientId = await getClientId(CLIENT_SLUG);
  const cfg = await readConfig(clientId);
  if (cfg.paused) return;

  const { data: next, error } = await supabase
    .from("run_requests")
    .select("id, requested_count")
    .eq("client_id", clientId)
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!next) return;

  busy = true;
  console.log(`[scheduler] picking up queued request ${next.id} (${next.requested_count} prospect(s))`);
  await supabase
    .from("run_requests")
    .update({ status: "running", started_at: new Date().toISOString() })
    .eq("id", next.id);

  try {
    const result = await runBatch(next.requested_count);
    if (result?.status === "done") {
      await supabase
        .from("run_requests")
        .update({ status: "done", finished_at: new Date().toISOString() })
        .eq("id", next.id);
      console.log(`[scheduler] request ${next.id} done`);
    } else {
      // stopped_busy / stopped_apollo_blocked / gave_up: leave a clear record but
      // don't silently lose the remainder — mark failed with what's left explained.
      await supabase
        .from("run_requests")
        .update({
          status: "failed",
          error: `stopped early (${result?.status}), ${result?.remaining ?? "?"} left undone`,
          finished_at: new Date().toISOString(),
        })
        .eq("id", next.id);
      console.error(`[scheduler] request ${next.id} stopped early: ${result?.status}`);
    }
  } catch (err) {
    await supabase
      .from("run_requests")
      .update({ status: "failed", error: String(err?.message ?? err), finished_at: new Date().toISOString() })
      .eq("id", next.id);
    console.error(`[scheduler] request ${next.id} failed:`, err);
  } finally {
    busy = false;
  }
}

cron.schedule("0 7 * * *", () => {
  enqueueDailyQuota().catch((err) => console.error("[scheduler] enqueueDailyQuota failed:", err));
}, { timezone: TZ });

setInterval(() => {
  processQueue().catch((err) => console.error("[scheduler] processQueue failed:", err));
}, POLL_INTERVAL_MS);

console.log(`[scheduler] started — daily quota enqueues at 07:00 ${TZ}, polling run_requests every ${POLL_INTERVAL_MS / 1000}s`);
