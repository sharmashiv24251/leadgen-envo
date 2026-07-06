import { prospects, type ProspectStatus } from "@/lib/data";

const COMMAND_STATUS: Record<string, ProspectStatus> = {
  "/generate-leads": "DRAFTED",
  "/responded": "RESPONDED",
  "/bounced": "BOUNCED",
};

const HELP_TEXT = `Available commands:
/generate-leads — prospects with drafted emails
/responded — prospects who replied
/bounced — prospects whose emails bounced`;

function dashboardUrl(status: ProspectStatus): string {
  const base = process.env.APP_URL ?? "";
  return `${base}/emails?status=${status.toLowerCase()}`;
}

function formatStatusReply(status: ProspectStatus): string {
  const matches = prospects.filter((p) => p.status === status);
  const link = dashboardUrl(status);

  if (matches.length === 0) {
    return `No prospects with status ${status}.\n\n${link}`;
  }

  const lines = matches.map((p) => `${p.name} — ${p.company}`).join("\n");
  return `${lines}\n\n${link}`;
}

async function sendMessage(chatId: number, text: string): Promise<void> {
  const token = process.env.TG_BOT_TOKEN;
  if (!token) {
    console.error("TG_BOT_TOKEN is not set");
    return;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
    });
    if (!res.ok) {
      console.error("Telegram sendMessage failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("Telegram sendMessage error", err);
  }
}

export async function POST(request: Request) {
  try {
    const update = await request.json();
    const message = update?.message;
    const text: string | undefined = message?.text;
    const chatId: number | undefined = message?.chat?.id;

    if (chatId && text) {
      const command = text.trim().split(/\s+/)[0].split("@")[0];

      let reply: string;
      if (command === "/help") {
        reply = HELP_TEXT;
      } else if (command in COMMAND_STATUS) {
        reply = formatStatusReply(COMMAND_STATUS[command]);
      } else {
        reply = "Unknown command. Send /help to see available commands.";
      }

      await sendMessage(chatId, reply);
    }
  } catch (err) {
    console.error("Telegram webhook error", err);
  }

  return Response.json({ ok: true });
}
