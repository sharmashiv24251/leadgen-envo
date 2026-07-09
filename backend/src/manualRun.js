import { runOnce } from "./runOnce.js";

const count = Number(process.argv[2] || 1);

runOnce({ count }).catch((err) => {
  console.error("[manualRun] failed:", err);
  process.exit(1);
});
