import readline from "node:readline";

function truncate(value, max = 200) {
  const s = (typeof value === "string" ? value : JSON.stringify(value)).replace(/\s+/g, " ").trim();
  return s.length > max ? s.slice(0, max) + "…" : s;
}

function summarizeInput(name, input = {}) {
  switch (name) {
    case "Bash": return input.description || input.command;
    case "WebSearch": return input.query;
    case "WebFetch": return input.url;
    case "Read": return input.file_path;
    case "Write":
    case "Edit": return input.file_path;
    case "Task": return `${input.subagent_type || "agent"}: ${input.description || ""}`;
    default: return truncate(input, 150);
  }
}

function summarizeResult(content) {
  if (Array.isArray(content)) return truncate(content.map((c) => c.text ?? "").join(" "));
  return truncate(content);
}

// Parses claude -p --output-format stream-json NDJSON lines into readable log lines.
// onRateLimit(info), if given, fires for every rate_limit_event seen (these are routine
// per-request telemetry, not necessarily an actual block — callers decide what to do with it).
export function attachLiveLogger(child, { label = "agent", onRateLimit } = {}) {
  const toolNames = new Map();
  const rl = readline.createInterface({ input: child.stdout });

  rl.on("line", (line) => {
    if (!line.trim()) return;
    let evt;
    try {
      evt = JSON.parse(line);
    } catch {
      console.log(`[${label}]`, line);
      return;
    }

    if (evt.type === "rate_limit_event") {
      const info = evt.rate_limit_info;
      console.log(`[${label}] rate limit: ${info?.rateLimitType} at ${Math.round((info?.utilization ?? 0) * 100)}% (status=${info?.status})`);
      onRateLimit?.(info);
    } else if (evt.type === "system" && evt.subtype === "init") {
      console.log(`[${label}] session started (model=${evt.model})`);
    } else if (evt.type === "assistant") {
      for (const block of evt.message?.content ?? []) {
        if (block.type === "tool_use") {
          toolNames.set(block.id, block.name);
          console.log(`[${label}] -> ${block.name}: ${summarizeInput(block.name, block.input)}`);
        } else if (block.type === "text" && block.text?.trim()) {
          console.log(`[${label}] says: ${truncate(block.text, 300)}`);
        }
      }
    } else if (evt.type === "user") {
      for (const block of evt.message?.content ?? []) {
        if (block.type === "tool_result") {
          const name = toolNames.get(block.tool_use_id) || "tool";
          console.log(`[${label}] <- ${name}: ${summarizeResult(block.content)}`);
        }
      }
    } else if (evt.type === "result") {
      const cost = evt.total_cost_usd != null ? `$${evt.total_cost_usd.toFixed(4)}` : "n/a";
      console.log(`[${label}] finished: ${evt.subtype}, ${evt.num_turns} turns, ${(evt.duration_ms / 1000).toFixed(1)}s, cost ${cost}`);
    }
  });

  child.stderr.on("data", (chunk) => {
    process.stderr.write(`[${label}:stderr] ${chunk}`);
  });

  return rl;
}
