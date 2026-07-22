import fs from "node:fs/promises";
import path from "node:path";
import { supabase } from "./supabaseClient.js";

// Per-client bucket + file layout. workenvo's agent is Claude Code, where SKILL.md is a
// project slash command (frontmatter: name, description) and must live under
// .claude/commands/ to be invocable as /start-outreach-workenvo. thehrcompany's agent is
// Antigravity (agy), which has no slash-command convention — its skill files are just
// plain files in the run's cwd that the literal prompt tells it to read directly.
const CLIENT_SKILL_CONFIG = {
  workenvo: {
    bucket: "workenvo-skill",
    placement: {
      "SKILL.md": ".claude/commands/start-outreach-workenvo.md",
      "icp.md": "icp.md",
      "voice.md": "voice.md",
      "product.md": "product.md",
    },
  },
  thehrcompany: {
    bucket: "thehrcompany-skill",
    placement: {
      "SKILL.md": "SKILL.md",
      "icp.md": "icp.md",
      "voice.md": "voice.md",
      "product.md": "product.md",
    },
  },
};

export async function downloadSkillFiles(workspaceDir, clientSlug = "workenvo") {
  const config = CLIENT_SKILL_CONFIG[clientSlug];
  if (!config) throw new Error(`downloadSkillFiles: unrecognized client_slug "${clientSlug}"`);

  for (const [remoteName, relTarget] of Object.entries(config.placement)) {
    const { data, error } = await supabase.storage.from(config.bucket).download(remoteName);
    if (error) throw new Error(`failed to download ${remoteName}: ${error.message}`);

    const targetPath = path.join(workspaceDir, relTarget);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, Buffer.from(await data.arrayBuffer()));
  }
}
