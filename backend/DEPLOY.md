# GCP VM setup — outreach-leadgen

Run these in order, in the browser SSH session (Compute Engine → VM instances → SSH on `outreach-leadgen`).

Swap and sudo are already done. Start from step 1.

## 1. Install prerequisites
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl ca-certificates build-essential
```

## 2. Install Node.js 22 (current LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v
```

## 3. Install the Claude Code CLI
```bash
sudo npm install -g @anthropic-ai/claude-code
claude --version
```

## 4. Clone the repo (public, no auth needed)
```bash
git clone https://github.com/sharmashiv24251/leadgen-envo.git
cd leadgen-envo/backend
```

## 5. Create `.env`
This repo is **public** — never put real secrets in a committed file. Copy the actual values
from your local `backend/.env` (open it on your Mac) and substitute them below, then paste the
whole block as one command on the VM:
```bash
cat > .env << 'EOF'
SUPABASE_URL=<same as local backend/.env>
SUPABASE_SERVICE_KEY=<same as local backend/.env>
SUPABASE_FN_URL=<same as local backend/.env>
AGENT_TOKEN=<same as local backend/.env>
CLIENT_SLUG=workenvo
TZ=Europe/Dublin
CLAUDE_CODE_OAUTH_TOKEN=<same as local backend/.env>
EOF
chmod 600 .env
```

## 6. Install backend dependencies
```bash
npm install
```

## 7. Smoke test — Claude auth + Supabase connectivity
```bash
set -a; source .env; set +a
claude -p "say hello"
node -e "
import('./src/supabaseClient.js').then(async ({ getClientId }) => {
  console.log('client id:', await getClientId('workenvo'));
}).catch(e => { console.error('FAILED:', e.message); process.exit(1); });
"
```
Both must succeed (a greeting, then a client id) before continuing.

## 8. Set up the systemd service (auto-restart, survives reboot)
```bash
sudo tee /etc/systemd/system/workenvo-scheduler.service > /dev/null <<EOF
[Unit]
Description=Workenvo Outreach Scheduler
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$HOME/leadgen-envo/backend
ExecStart=$(which npm) start
Restart=always
RestartSec=10
EnvironmentFile=$HOME/leadgen-envo/backend/.env

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable workenvo-scheduler
sudo systemctl start workenvo-scheduler
sudo systemctl status workenvo-scheduler
```
Status should show `active (running)` in green.

## 9. Watch it live
```bash
sudo journalctl -u workenvo-scheduler -f
```
Ctrl+C to stop watching (doesn't stop the service).

## Redeploying later
```bash
cd ~/leadgen-envo/backend
git pull
npm install
sudo systemctl restart workenvo-scheduler
sudo systemctl status workenvo-scheduler
sudo journalctl -u workenvo-scheduler -f
```
