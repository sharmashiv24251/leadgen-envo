import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { supabase, getClientId } from "./supabaseClient.js";
import { downloadSkillFiles } from "./downloadSkillFiles.js";
import { attachLiveLogger } from "./streamLogger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.join(__dirname, "..", "workspace");
const RUN_TIMEOUT_MS = 25 * 60 * 1000;
export const MAX_PROSPECTS_PER_RUN = 3;

async function apolloBlocked(clientId) {
  const { data } = await supabase
    .from("notifications")
    .select("id")
    .eq("client_id", clientId)
    .eq("source", "apollo")
    .eq("level", "error")
    .eq("dismissed", false)
    .limit(1);
  return !!data?.length;
}

async function writeNotification(clientId, notification) {
  await supabase.from("notifications").insert({ client_id: clientId, ...notification });
}

// Tracks the in-flight run so a SIGINT/SIGTERM can kill the child and record
// the interruption instead of leaving the `runs` row stuck at status='running'.
let activeRun = null;
let shuttingDown = false;

function handleShutdownSignal(signal) {
  if (shuttingDown) {
    // A repeat signal (e.g. a second Ctrl+C) — ignore it and let the first
    // invocation's in-flight DB write finish instead of racing it to exit.
    console.error(`[runOnce] ${signal} received again — already shutting down, waiting for the DB write to finish...`);
    return;
  }
  shuttingDown = true;
  console.error(`\n[runOnce] ${signal} received — stopping current run; any queued batches will not continue.`);

  // Hard fallback: don't hang forever if the DB write itself stalls (network issue etc).
  const forceExitTimer = setTimeout(() => process.exit(130), 5000);

  (async () => {
    if (activeRun && !activeRun.settled) {
      activeRun.settled = true;
      activeRun.child?.kill("SIGKILL");
      try {
        await supabase
          .from("runs")
          .update({ status: "failed", error: `interrupted by user (${signal})`, finished_at: new Date().toISOString() })
          .eq("id", activeRun.runId);
        await writeNotification(activeRun.clientId, {
          level: "warning",
          source: "run",
          title: "Run interrupted",
          detail: `Run ${activeRun.runId} was stopped by ${signal} before it finished.`,
        });
        console.error(`[runOnce] run ${activeRun.runId} marked failed (interrupted)`);
      } catch (err) {
        console.error("[runOnce] failed to record interruption:", err);
      }
    }
    clearTimeout(forceExitTimer);
    process.exit(130);
  })();
}

process.on("SIGINT", () => handleShutdownSignal("SIGINT"));
process.on("SIGTERM", () => handleShutdownSignal("SIGTERM"));
process.on("SIGHUP", () => handleShutdownSignal("SIGHUP"));

export async function runOnce({ count = 1 } = {}) {
  const clientSlug = process.env.CLIENT_SLUG || "workenvo";
  const clientId = await getClientId(clientSlug);

  const safeCount = Math.min(count, MAX_PROSPECTS_PER_RUN);
  if (safeCount < count) {
    console.warn(`[runOnce] requested count ${count} exceeds per-run cap ${MAX_PROSPECTS_PER_RUN}, clamping to ${safeCount}`);
  }

  if (await apolloBlocked(clientId)) {
    console.log("[runOnce] skipped — apollo blocked");
    await writeNotification(clientId, {
      level: "warning",
      source: "apollo",
      title: "Run skipped — Apollo blocked",
      detail: "An undismissed Apollo error notification exists.",
      action_hint: "Top up Apollo or rotate the key, then dismiss the notification to resume runs.",
    });
    return;
  }

  const { data: run, error: runErr } = await supabase
    .from("runs")
    .insert({ client_id: clientId, status: "running" })
    .select("id")
    .single();
  if (runErr) throw runErr;
  const runId = run.id;
  console.log(`[runOnce] run ${runId} started`);
  activeRun = { runId, clientId, child: null, settled: false };

  await downloadSkillFiles(WORKSPACE_DIR);

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      [
        "-p", `/start-outreach-workenvo ${safeCount}`,
        "--dangerously-skip-permissions",
        "--verbose",
        "--output-format", "stream-json",
      ],
      {
        cwd: WORKSPACE_DIR,
        env: {
          ...process.env,
          SUPABASE_FN_URL: process.env.SUPABASE_FN_URL,
          AGENT_TOKEN: process.env.AGENT_TOKEN,
          RUN_ID: runId,
          CLIENT_SLUG: clientSlug,
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );

    activeRun.child = child;
    attachLiveLogger(child, { label: `run:${runId.slice(0, 8)}` });

    const timeout = setTimeout(() => {
      console.error(`[runOnce] run ${runId} exceeded ${RUN_TIMEOUT_MS / 60000}m timeout, killing`);
      child.kill("SIGKILL");
    }, RUN_TIMEOUT_MS);

    child.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
    child.on("exit", (code) => {
      clearTimeout(timeout);
      resolve(code);
    });
  });

  if (activeRun?.settled) {
    // SIGINT/SIGTERM handler already recorded this run's outcome.
    activeRun = null;
    return;
  }
  activeRun = null;

  const { data: after } = await supabase.from("runs").select("status").eq("id", runId).single();
  if (after?.status === "running") {
    const failStatus = exitCode === 0 ? "failed" : "blocked_claude";
    await supabase
      .from("runs")
      .update({ status: failStatus, error: `exit code ${exitCode}`, finished_at: new Date().toISOString() })
      .eq("id", runId);
    await writeNotification(clientId, {
      level: "error",
      source: "claude",
      title: "Run didn't complete",
      detail: `claude -p exited with code ${exitCode} (or timed out) and never reported completion via wk-notify.`,
      action_hint: "Check Claude Code auth/rate limits, then retry.",
    });
    console.error(`[runOnce] run ${runId} marked ${failStatus}`);
  } else {
    console.log(`[runOnce] run ${runId} finished with status ${after?.status}`);
  }
}

// Splits a large request into sequential runs of at most MAX_PROSPECTS_PER_RUN each,
// so no single agent invocation researches more than that many prospects at once.
export async function runBatch(totalCount) {
  let remaining = totalCount;
  let batchNum = 1;
  while (remaining > 0) {
    const chunk = Math.min(remaining, MAX_PROSPECTS_PER_RUN);
    console.log(`[runBatch] batch ${batchNum}: requesting ${chunk} (${remaining} remaining before this batch)`);
    await runOnce({ count: chunk });
    remaining -= chunk;
    batchNum += 1;
  }
}
