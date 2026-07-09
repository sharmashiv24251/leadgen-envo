import cron from "node-cron";
import { supabase, getClientId } from "./supabaseClient.js";
import { runOnce } from "./runOnce.js";

const CLIENT_SLUG = process.env.CLIENT_SLUG || "workenvo";
const TZ = process.env.TZ || "Europe/Dublin";

async function readConfig(clientId) {
  const { data, error } = await supabase.from("config").select("key, value").eq("client_id", clientId);
  if (error) throw error;
  return Object.fromEntries(data.map((row) => [row.key, row.value]));
}

function hhmmToMinutes(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function msUntilMinuteOfDay(minuteOfDay) {
  const now = new Date();
  const target = new Date(now);
  target.setHours(Math.floor(minuteOfDay / 60), minuteOfDay % 60, 0, 0);
  let diff = target.getTime() - now.getTime();
  if (diff < 0) diff += 24 * 60 * 60 * 1000;
  return diff;
}

// Spreads `quota` runs evenly across the send window, each with 0-25min jitter.
function planTimes(quota, sendWindow) {
  const start = hhmmToMinutes(sendWindow.start);
  const end = hhmmToMinutes(sendWindow.end);
  const span = end - start;
  const times = [];
  for (let i = 0; i < quota; i++) {
    const slot = start + Math.floor((span * (i + 0.5)) / quota);
    const jitter = Math.floor(Math.random() * 25);
    times.push(slot + jitter);
  }
  return times;
}

async function planToday() {
  const clientId = await getClientId(CLIENT_SLUG);
  const cfg = await readConfig(clientId);

  if (cfg.paused) {
    console.log("[scheduler] paused=true, skipping today");
    return;
  }

  const times = planTimes(cfg.daily_quota, cfg.send_window);
  console.log(`[scheduler] planning ${times.length} run(s) today within ${cfg.send_window.start}-${cfg.send_window.end} ${TZ}`);

  for (const minuteOfDay of times) {
    const delay = msUntilMinuteOfDay(minuteOfDay);
    setTimeout(() => {
      runOnce().catch((err) => console.error("[scheduler] runOnce failed:", err));
    }, delay);
  }
}

cron.schedule("0 7 * * *", () => {
  planToday().catch((err) => console.error("[scheduler] planToday failed:", err));
}, { timezone: TZ });

console.log(`[scheduler] started — will plan runs daily at 07:00 ${TZ}`);
