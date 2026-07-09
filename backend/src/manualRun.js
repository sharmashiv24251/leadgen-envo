import { runBatch } from "./runOnce.js";

const count = Number(process.argv[2] || 1);

runBatch(count).catch((err) => {
  console.error("[manualRun] failed:", err);
  process.exit(1);
});
