import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { supabase, getClientId } from "./supabaseClient.js";
import { downloadSkillFiles } from "./downloadSkillFiles.js";
import { attachLiveLogger, attachPlainLogger } from "./streamLogger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_ROOT = path.join(__dirname, "..", "workspace");
const RUN_TIMEOUT_MS = 25 * 60 * 1000;
export const MAX_PROSPECTS_PER_RUN = 3;

// Each client gets its own workspace subdirectory. Workenvo and The HR Company run as
// separate systemd services on the same VM and can legitimately overlap in time (the
// mutual-exclusion check below is scoped per client_id) — sharing one workspace dir would
// mean two concurrently-running agents clobbering each other's skill files/cwd mid-run.
function workspaceDirFor(clientSlug) {
  return path.join(WORKSPACE_ROOT, clientSlug);
}

// Builds the child-process spawn args for this client's agent runtime. Claude Code
// (workenvo) is invoked via its project slash command with structured stream-json output;
// Antigravity (thehrcompany) has no slash-command convention or structured output mode, so
// it gets a literal instruction prompt telling it which file to read first.
function buildAgentSpawn(clientSlug, safeCount) {
  if (clientSlug === "thehrcompany") {
    const prompt =
      `Read the file SKILL.md in your current working directory in full — it contains your ` +
      `complete instructions, including which other files (product.md, icp.md, voice.md) to ` +
      `read and in what order. Follow it exactly and produce ${safeCount} complete email draft(s) ` +
      `this run (count=${safeCount}).`;
    return {
      command: "agy",
      args: ["-p", prompt, "--dangerously-skip-permissions"],
      attachLogger: (child, opts) => attachPlainLogger(child, opts),
    };
  }

  return {
    command: "claude",
    args: [
      "-p", `/start-outreach-workenvo ${safeCount}`,
      "--model", "sonnet",
      "--dangerously-skip-permissions",
      "--verbose",
      "--output-format", "stream-json",
    ],
    attachLogger: (child, opts) => attachLiveLogger(child, opts),
  };
}

// Retry tuning for runBatch() when a chunk comes back blocked_claude.
const DEFAULT_RETRY_DELAY_MS = 5 * 60 * 1000; // used when we never saw a rate_limit_event to time off
const RETRY_BUFFER_MS = 2 * 60 * 1000; // pad past resetsAt since limits can be approximate
const MAX_RETRIES_PER_BATCH = 6; // safety cap so a non-rate-limit bug can't loop forever

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

// DB-level mutual exclusion: manual-run (SSH) and the scheduler's queue processor are
// separate Node processes, so an in-memory flag alone can't stop them colliding. Any
// existing 'running' row means another process is already mid-run.
async function anotherRunInProgress(clientId) {
  const { data } = await supabase
    .from("runs")
    .select("id")
    .eq("client_id", clientId)
    .eq("status", "running")
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
    return { status: "skipped_apollo_blocked", resetsAt: null };
  }

  if (await anotherRunInProgress(clientId)) {
    console.log("[runOnce] skipped — another run is already in progress");
    return { status: "skipped_busy", resetsAt: null };
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

  const workspaceDir = workspaceDirFor(clientSlug);
  await downloadSkillFiles(workspaceDir, clientSlug);

  // Rate-limit telemetry fires on every request regardless of whether it actually
  // blocked anything — we just track the furthest-out resetsAt seen as our best guess
  // for when to retry if this run does end up blocked_claude. Only Claude Code emits this;
  // agy runs simply never populate it.
  let lastRateLimitResetsAtMs = null;

  const { command, args, attachLogger } = buildAgentSpawn(clientSlug, safeCount);

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      command,
      args,
      {
        cwd: workspaceDir,
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
    attachLogger(child, {
      label: `run:${runId.slice(0, 8)}`,
      onRateLimit: (info) => {
        if (!info?.resetsAt) return;
        const ms = info.resetsAt * 1000;
        if (!lastRateLimitResetsAtMs || ms > lastRateLimitResetsAtMs) lastRateLimitResetsAtMs = ms;
      },
    });

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
    return { status: "failed", resetsAt: null };
  }
  activeRun = null;

  const { data: after } = await supabase.from("runs").select("status").eq("id", runId).single();
  let finalStatus = after?.status;
  if (finalStatus === "running") {
    // "blocked_claude" is the original, specific status Workenvo's dashboard/runBatch retry
    // logic already keys on; agy failures get their own "blocked_agent" status instead of
    // reusing a Claude-specific name that would be misleading in the runs table.
    const failStatus = exitCode === 0 ? "failed" : (command === "claude" ? "blocked_claude" : "blocked_agent");
    await supabase
      .from("runs")
      .update({ status: failStatus, error: `exit code ${exitCode}`, finished_at: new Date().toISOString() })
      .eq("id", runId);
    await writeNotification(clientId, {
      level: "error",
      source: command,
      title: "Run didn't complete",
      detail: `${command} -p exited with code ${exitCode} (or timed out) and never reported completion via wk-notify.`,
      action_hint: `Check ${command} auth/rate limits, then retry.`,
    });
    console.error(`[runOnce] run ${runId} marked ${failStatus}`);
    finalStatus = failStatus;
  } else {
    console.log(`[runOnce] run ${runId} finished with status ${finalStatus}`);
  }

  return { status: finalStatus, resetsAt: lastRateLimitResetsAtMs };
}

// Splits a large request into sequential runs of at most MAX_PROSPECTS_PER_RUN each,
// so no single agent invocation researches more than that many prospects at once.
// If a chunk comes back blocked_claude (rate limit / auth / crash), it's retried in
// place — not skipped — waiting until the observed rate-limit reset time if we saw
// one, else a fixed default, up to MAX_RETRIES_PER_BATCH before giving up entirely.
export async function runBatch(totalCount) {
  let remaining = totalCount;
  let batchNum = 1;
  let retries = 0;

  while (remaining > 0) {
    const chunk = Math.min(remaining, MAX_PROSPECTS_PER_RUN);
    console.log(`[runBatch] batch ${batchNum}: requesting ${chunk} (${remaining} remaining before this batch)`);
    const result = await runOnce({ count: chunk });

    if (result?.status === "skipped_apollo_blocked") {
      console.log(`[runBatch] stopping — Apollo is blocked; ${remaining} prospect(s) left undone for today`);
      return { status: "stopped_apollo_blocked", remaining };
    }

    if (result?.status === "skipped_busy") {
      console.log(`[runBatch] stopping — another run is already in progress; ${remaining} prospect(s) left undone this round`);
      return { status: "stopped_busy", remaining };
    }

    if (result?.status === "blocked_claude" || result?.status === "blocked_agent") {
      retries += 1;
      if (retries > MAX_RETRIES_PER_BATCH) {
        console.error(`[runBatch] giving up after ${MAX_RETRIES_PER_BATCH} retries — ${remaining} prospect(s) left undone for today`);
        return { status: "gave_up", remaining };
      }
      const waitMs = result.resetsAt
        ? Math.max(result.resetsAt - Date.now() + RETRY_BUFFER_MS, 30_000)
        : DEFAULT_RETRY_DELAY_MS;
      console.log(`[runBatch] Claude blocked (attempt ${retries}/${MAX_RETRIES_PER_BATCH}) — waiting ${Math.round(waitMs / 60000)}m before retrying this batch of ${chunk}`);
      await sleep(waitMs);
      continue; // retry the same chunk — don't decrement remaining
    }

    remaining -= chunk;
    batchNum += 1;
    retries = 0; // reset after a batch that actually completed
  }

  return { status: "done", remaining: 0 };
}
