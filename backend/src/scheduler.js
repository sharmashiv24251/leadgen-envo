import { supabase, getClientId } from "./supabaseClient.js";
import { runBatch } from "./runOnce.js";

const CLIENT_SLUG = process.env.CLIENT_SLUG || "workenvo";
const TZ = process.env.TZ || "Europe/Dublin";
const POLL_INTERVAL_MS = 30 * 1000;
// Workenvo's original fixed firing time, used only when config.daily_run_time is unset --
// existing behaviour is preserved with zero config changes needed on their side.
const DEFAULT_RUN_TIME = "07:00";

// The daily trigger and dashboard-button requests both just enqueue a row in run_requests;
// a single poll loop processes that queue one at a time, so the two trigger sources can never
// run concurrently — whichever enqueued first goes first.
let busy = false;

async function readConfig(clientId) {
  const { data, error } = await supabase.from("config").select("key, value").eq("client_id", clientId);
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

// Node honours process.env.TZ for every local-time Date method, so these already read
// correctly in the configured timezone -- no date library needed.
function nowLocalHHmm() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function startOfTodayLocalIso() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
}

// Deliberately checks the DB rather than an in-memory "already fired today" flag -- a process
// restart right after firing shouldn't be able to re-fire the same day, same reasoning as
// runOnce.js's anotherRunInProgress() being DB-backed rather than an in-memory lock.
async function alreadyEnqueuedToday(clientId) {
  const { data, error } = await supabase
    .from("run_requests")
    .select("id")
    .eq("client_id", clientId)
    .gte("created_at", startOfTodayLocalIso())
    .limit(1);
  if (error) throw error;
  return !!data?.length;
}

// Both the trigger time (config.daily_run_time, e.g. "20:00") and the quota (config.daily_quota)
// are read fresh from Supabase on every poll tick -- changing either is a single UPDATE, no .env
// edit, no redeploy, ever. runBatch() already chunks whatever quota comes back into groups of
// MAX_PROSPECTS_PER_RUN (3): 10 -> 3+3+3+1, 20 -> 3+3+3+3+3+3+2, etc.
async function maybeEnqueueDailyRun(clientId, cfg) {
  const runTime = cfg.daily_run_time || DEFAULT_RUN_TIME;
  if (nowLocalHHmm() < runTime) return; // not time yet today

  if (await alreadyEnqueuedToday(clientId)) return; // already fired today -- don't refire every poll tick

  const { error } = await supabase
    .from("run_requests")
    .insert({ client_id: clientId, requested_count: cfg.daily_quota });
  if (error) throw error;
  console.log(`[scheduler] enqueued today's run: ${cfg.daily_quota} prospect(s) (run_time=${runTime})`);
}

async function processQueue() {
  if (busy) return;

  const clientId = await getClientId(CLIENT_SLUG);
  const cfg = await readConfig(clientId);
  if (cfg.paused) return;

  await maybeEnqueueDailyRun(clientId, cfg);

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

setInterval(() => {
  processQueue().catch((err) => console.error("[scheduler] processQueue failed:", err));
}, POLL_INTERVAL_MS);

console.log(`[scheduler] started — daily run time is config-driven (config.daily_run_time, defaults to ${DEFAULT_RUN_TIME} ${TZ}), polling run_requests every ${POLL_INTERVAL_MS / 1000}s`);
