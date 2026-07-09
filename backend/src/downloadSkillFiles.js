import fs from "node:fs/promises";
import path from "node:path";
import { supabase } from "./supabaseClient.js";

const BUCKET = "workenvo-skill";

// SKILL.md is a Claude Code project slash command (frontmatter: name, description),
// so it must live under .claude/commands/ to be invocable as /start-outreach-workenvo.
// The other three are plain content files the command reads relative to the run's cwd.
const PLACEMENT = {
  "SKILL.md": ".claude/commands/start-outreach-workenvo.md",
  "icp.md": "icp.md",
  "voice.md": "voice.md",
  "product.md": "product.md",
};

export async function downloadSkillFiles(workspaceDir) {
  for (const [remoteName, relTarget] of Object.entries(PLACEMENT)) {
    const { data, error } = await supabase.storage.from(BUCKET).download(remoteName);
    if (error) throw new Error(`failed to download ${remoteName}: ${error.message}`);

    const targetPath = path.join(workspaceDir, relTarget);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(await data.arrayBuffer()));
  }
}
