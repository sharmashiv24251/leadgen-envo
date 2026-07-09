import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { supabase, getClientId } from "./supabaseClient.js";
import { downloadSkillFiles } from "./downloadSkillFiles.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKSPACE_DIR = path.join(__dirname, "..", "workspace");
const RUN_TIMEOUT_MS = 25 * 60 * 1000;

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

export async function runOnce({ count = 1 } = {}) {
  const clientSlug = process.env.CLIENT_SLUG || "workenvo";
  const clientId = await getClientId(clientSlug);

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

  await downloadSkillFiles(WORKSPACE_DIR);

  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      "claude",
      ["-p", `/start-outreach-workenvo ${count}`, "--dangerously-skip-permissions", "--verbose"],
      {
        cwd: WORKSPACE_DIR,
        env: {
          ...process.env,
          SUPABASE_FN_URL: process.env.SUPABASE_FN_URL,
          AGENT_TOKEN: process.env.AGENT_TOKEN,
          RUN_ID: runId,
          CLIENT_SLUG: clientSlug,
        },
        stdio: "inherit",
      }
    );

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
